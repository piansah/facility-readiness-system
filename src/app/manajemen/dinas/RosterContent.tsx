"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  parseISO, addMonths, subMonths, isToday, isWeekend
} from "date-fns";
import { id } from "date-fns/locale";
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  Save, Loader2, Settings2, Printer, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateRoster, updateShiftConfigs } from "@/app/manajemen/dinas/actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

type Personnel = {
  id: string;
  full_name: string;
  role: string;
};

type Shift = {
  id?: string;
  code: string;
  name: string | null;
  color_code: string | null;
  start_time?: string | null;
  end_time?: string | null;
  unit_id?: string;
};

type RosterEntry = {
  user_id: string;
  duty_date: string;
  shift_code: string;
};

type Props = {
  personnel: Personnel[];
  shifts: Shift[];
  rosters: RosterEntry[];
  selectedMonth: Date;
  unitId: string | null;
  unitName?: string;
  adminName?: string;
  isAdmin: boolean;
  currentUserId?: string;
};

export default function RosterContent({ personnel, shifts, rosters, selectedMonth, unitId, unitName, adminName, isAdmin, currentUserId }: Props) {
  const [localRosters, setLocalRosters] = useState<RosterEntry[]>(rosters);
  const [localShifts, setLocalShifts] = useState<Shift[]>(shifts);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [tempShifts, setTempShifts] = useState<any[]>(shifts);
  const [hasMounted, setHasMounted] = useState(false);

  // Selection State
  const [dragStart, setDragStart] = useState<{ userId: string; dateIdx: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ userId: string; dateIdx: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Menu States
  const [selectedRange, setSelectedRange] = useState<{ userIds: string[]; dates: string[] } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<{ userId: string; dateStr: string; anchorRect: DOMRect } | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth)
    });
  }, [selectedMonth]);

  // UI Color Helper (Never use black for standard codes in UI)
  const getSafeColor = (code: string, dbColor: string | null) => {
    // Force specific colors for standard codes if DB color is black or missing
    if (!dbColor || dbColor === '#000000') {
      if (code === 'APBA') return '#3b82f6'; // Blue
      if (code === 'APBB') return '#10b981'; // Emerald/Green
      if (code === 'FREE') return '#ef4444'; // Red
      if (code === 'AH') return '#f59e0b';   // Amber/Orange
      if (code === 'APN7' || code === 'APN8' || code === 'APNZ') return '#94a3b8'; // Slate
      return '#3b82f6';
    }
    return dbColor;
  };

  const getAvailableShifts = (userId: string) => {
    const person = personnel.find(p => p.id === userId);
    const isTargetAdmin = person?.role === 'admin';
    let available = [...shifts];
    if (isTargetAdmin) {
      if (!available.some(s => s.code === 'APN7')) available.push({ code: 'APN7', name: 'Admin Jam 7', color_code: '#94a3b8' });
      if (!available.some(s => s.code === 'APN8')) available.push({ code: 'APN8', name: 'Admin Jam 8', color_code: '#94a3b8' });
    }
    return available.filter(s => {
      if (['APN7', 'APN8'].includes(s.code)) return isTargetAdmin;
      return true;
    });
  };

  const handleBulkAssign = async (shiftCode: string | null, targetRange?: { userIds: string[]; dates: string[] }) => {
    const range = targetRange || selectedRange;
    if (!range) return;

    const { userIds, dates } = range;
    setSelectedRange(null);
    setOpenDropdown(null);

    let updatedRosters = [...localRosters];
    userIds.forEach(uId => {
      dates.forEach(dStr => {
        updatedRosters = updatedRosters.filter(r => !(r.user_id === uId && r.duty_date === dStr));
        if (shiftCode) {
          updatedRosters.push({ user_id: uId, duty_date: dStr, shift_code: shiftCode });
        }
      });
    });

    setLocalRosters(updatedRosters);
    setIsSaving(true);
    try {
      await updateRoster(updatedRosters, unitId);
    } catch (e) {
      toast.error("Gagal menyimpan jadwal");
    } finally {
      setIsSaving(false);
    }
  };

  const onMouseDown = (userId: string, dateIdx: number) => {
    if (!isAdmin) return;
    setIsDragging(true);
    setDragStart({ userId, dateIdx });
    setDragEnd({ userId, dateIdx });
  };

  const onMouseEnter = (userId: string, dateIdx: number) => {
    if (isDragging) {
      setDragEnd({ userId, dateIdx });
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (isDragging && dragStart && dragEnd) {
      const userIdx1 = personnel.findIndex(p => p.id === dragStart.userId);
      const userIdx2 = personnel.findIndex(p => p.id === dragEnd.userId);
      const startU = Math.min(userIdx1, userIdx2);
      const endU = Math.max(userIdx1, userIdx2);
      const startD = Math.min(dragStart.dateIdx, dragEnd.dateIdx);
      const endD = Math.max(dragStart.dateIdx, dragEnd.dateIdx);
      const targetUserIds = personnel.slice(startU, endU + 1).map(p => p.id);
      const targetDates = daysInMonth.slice(startD, endD + 1).map(d => format(d, "yyyy-MM-dd"));
      if (targetUserIds.length === 1 && targetDates.length === 1) {
        // Get the cell element that was clicked for positioning
        const cell = (e.target as HTMLElement).closest('td');
        const rect = cell?.getBoundingClientRect() || new DOMRect(e.clientX, e.clientY, 0, 0);
        setOpenDropdown({
          userId: targetUserIds[0],
          dateStr: targetDates[0],
          anchorRect: rect,
        });
      } else {
        setSelectedRange({ userIds: targetUserIds, dates: targetDates });
      }
    }
    setIsDragging(false); setDragStart(null); setDragEnd(null);
  };

  const isInRange = (userId: string, dateIdx: number) => {
    if (!dragStart || !dragEnd) return false;
    const userIdx1 = personnel.findIndex(p => p.id === dragStart.userId); const userIdx2 = personnel.findIndex(p => p.id === dragEnd.userId); const currentU = personnel.findIndex(p => p.id === userId);
    const startU = Math.min(userIdx1, userIdx2); const endU = Math.max(userIdx1, userIdx2); const startD = Math.min(dragStart.dateIdx, dragEnd.dateIdx); const endD = Math.max(dragStart.dateIdx, dragEnd.dateIdx);
    return currentU >= startU && currentU <= endU && dateIdx >= startD && dateIdx <= endD;
  };

  const handleSaveShifts = async () => {
    setIsSaving(true);
    try {
      await updateShiftConfigs(tempShifts, unitId); setLocalShifts(tempShifts); setIsSettingOpen(false);
    } catch (e) { toast.error("Gagal menyimpan pengaturan shift."); } finally { setIsSaving(false); }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const monthYear = format(selectedMonth, "MMMM yyyy", { locale: id });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`JADWAL DINAS ${unitName?.toUpperCase() || "PERSONIL"}`, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(11); doc.text(`BANDARA INTERNASIONAL JAWA BARAT`, pageWidth / 2, 21, { align: 'center' });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text(`Periode: ${monthYear}`, pageWidth / 2, 27, { align: 'center' });

    // Main Roster Table
    const head = [
      [
        { content: 'NO', rowSpan: 2, styles: { valign: 'middle' as const, fillColor: [146, 208, 80] as [number, number, number] } }, 
        { content: 'NAMA', rowSpan: 2, styles: { valign: 'middle' as const, fillColor: [146, 208, 80] as [number, number, number] } }, 
        ...daysInMonth.map(d => ({ 
          content: ['MG', 'SN', 'SL', 'RB', 'KM', 'JM', 'SB'][d.getDay()], 
          styles: { fillColor: (d.getDay() === 0 || d.getDay() === 6 ? [255, 204, 0] : [146, 208, 80]) as [number, number, number] } 
        }))
      ],
      [...daysInMonth.map(d => ({ 
        content: format(d, "dd"), 
        styles: { fillColor: (d.getDay() === 0 || d.getDay() === 6 ? [255, 204, 0] : [146, 208, 80]) as [number, number, number] } 
      }))]
    ];

    const body: any[] = personnel.map((p, i) => [
      (i + 1).toString(), 
      p.full_name, 
      ...daysInMonth.map(d => { 
        const entry = localRosters.find(r => r.user_id === p.id && r.duty_date === format(d, "yyyy-MM-dd")); 
        return entry ? entry.shift_code : ""; 
      })
    ]);

    autoTable(doc, {
      head, body, 
      startY: 30, 
      theme: 'grid', 
      margin: { left: 5, right: 5 }, 
      styles: { fontSize: 5.5, cellPadding: 0.5, halign: 'center', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, fontStyle: 'bold', overflow: 'hidden' }, 
      headStyles: { textColor: [0, 0, 0], fontStyle: 'bold' }, 
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 45 } }, 
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 1 && data.row.index < personnel.length) {
          const code = data.cell.text[0]; 
          if (code) { 
            const shift = localShifts.find(s => s.code === code); 
            if (shift && shift.color_code) { 
              const hex = shift.color_code.replace('#', ''); 
              data.cell.styles.textColor = [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)]; 
            } 
          }
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;

    // Legend Table (3 Columns)
    const legendBody: any[] = [];
    
    // Group APNZ
    const apnzShift = localShifts.find(s => s.code === 'APNZ') || { code: 'APNZ', name: 'Admin General', start_time: '07:30:00', end_time: '16:30:00' };
    legendBody.push([
      'APNZ', 
      'Admin General', 
      `${apnzShift.start_time?.substring(0, 5) || '07:30'} - ${apnzShift.end_time?.substring(0, 5) || '16:30'}`
    ]);

    localShifts.filter(s => !['APN7', 'APN8', 'APNZ', 'FREE'].includes(s.code)).forEach(s => {
      legendBody.push([s.code, s.name || '', `${s.start_time?.substring(0, 5) || '--'} - ${s.end_time?.substring(0, 5) || '--'}`]);
    });
    
    legendBody.push(['FREE', 'Libur', '-']);

    autoTable(doc, {
      body: legendBody,
      startY: currentY,
      theme: 'plain',
      margin: { left: 5 },
      tableWidth: 100,
      styles: { fontSize: 7, cellPadding: 1, textColor: [0, 0, 0] },
      columnStyles: { 
        0: { cellWidth: 15, fontStyle: 'bold' }, 
        1: { cellWidth: 40 },
        2: { cellWidth: 40 }
      }
    });

    // Signature
    const sigY = (doc as any).lastAutoTable.finalY + 15;
    const rightAlignX = pageWidth - 60;
    doc.setFontSize(9);
    doc.text(`Majalengka, ${format(new Date(), "dd MMMM yyyy", { locale: id })}`, rightAlignX, sigY);
    doc.text(`Admin ${unitName || ''}`, rightAlignX, sigY + 5);
    doc.setFont("helvetica", "bold");
    doc.text(`( ${adminName || '..........................'} )`, rightAlignX, sigY + 25);

    doc.save(`Jadwal_Dinas_${format(selectedMonth, "MMMM_yyyy")}.pdf`);
  };

  return (
    <div className="space-y-6" onMouseUp={onMouseUp}>
      {isAdmin && (
        <Dialog open={isSettingOpen} onOpenChange={setIsSettingOpen}>
          <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 shadow-2xl sm:rounded-2xl z-[9999] p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50">
              <DialogHeader><DialogTitle><div className="text-xl font-bold text-slate-100 flex items-center gap-2"><div className="p-2 rounded-lg bg-blue-500/10"><Settings2 className="h-5 w-5 text-blue-500" /></div>Konfigurasi Shift & Jam Kerja</div></DialogTitle></DialogHeader>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide bg-slate-950">
              {tempShifts.map((s, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 grid grid-cols-12 gap-6 items-center transition-all hover:bg-slate-900/40 relative group">
                  <div className="col-span-2"><Label className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold">Kode</Label><Input value={s.code} onChange={(e) => { const n = [...tempShifts]; n[idx].code = e.target.value.toUpperCase(); setTempShifts(n); }} className="h-11 font-bold bg-slate-950 border-slate-800 text-center uppercase" /></div>
                  <div className="col-span-5"><Label className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold">Nama Shift</Label><Input value={s.name || ''} onChange={(e) => { const n = [...tempShifts]; n[idx].name = e.target.value; setTempShifts(n); }} className="h-11 bg-slate-950 border-slate-800" /></div>
                  <div className="col-span-4 grid grid-cols-2 gap-4">
                    <div><Label className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold">Mulai</Label><Input type="time" value={s.start_time ? s.start_time.substring(0, 5) : ''} onChange={(e) => { const n = [...tempShifts]; n[idx].start_time = e.target.value ? e.target.value + ":00" : null; setTempShifts(n); }} className="h-11 bg-slate-950 border-slate-800" /></div>
                    <div><Label className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold">Selesai</Label><Input type="time" value={s.end_time ? s.end_time.substring(0, 5) : ''} onChange={(e) => { const n = [...tempShifts]; n[idx].end_time = e.target.value ? e.target.value + ":00" : null; setTempShifts(n); }} className="h-11 bg-slate-950 border-slate-800" /></div>
                  </div>
                  <div className="col-span-1 flex justify-end pt-6">
                    <Button variant="ghost" size="sm" onClick={() => setTempShifts(tempShifts.filter((_, i) => i !== idx))} className="h-11 w-11 p-0 text-red-500 hover:bg-red-500/10"><X className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="outline" 
                onClick={() => setTempShifts([...tempShifts, { code: '', name: '', start_time: '08:00:00', end_time: '17:00:00', color_code: '#94a3b8' }])}
                className="w-full h-12 border-dashed border-slate-800 bg-slate-900/10 text-slate-500 hover:text-slate-300 hover:bg-slate-900/30"
              >
                + Tambah Shift Baru
              </Button>
            </div>
            <div className="p-6 flex justify-end gap-3 border-t border-slate-800 bg-slate-900/50">
              <Button variant="ghost" onClick={() => setIsSettingOpen(false)} className="text-slate-400">Batal</Button>
              <Button onClick={handleSaveShifts} disabled={isSaving} className="bg-blue-600 px-10 h-11 shadow-lg font-bold">Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 px-4 py-3 sm:py-4">
          <div className="flex items-center gap-4"><Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 sm:inline-flex"><Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link></Button><div><h1 className="text-lg font-bold text-slate-100 tracking-tight">Jadwal Dinas Personil</h1><p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mt-0.5">Shift Roster Matrix</p></div></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={handleExportPDF} className="h-10 bg-slate-900 border border-slate-800 text-slate-300 font-bold px-4 no-print flex items-center gap-2"><Printer className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span></Button>{isAdmin && <Button variant="outline" size="sm" className="h-10 border-slate-800 text-blue-400 font-bold px-4 no-print flex items-center gap-2" onClick={() => { setTempShifts([...localShifts]); setIsSettingOpen(true); }}><Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">Settings</span></Button>}</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4"><h2 className="text-xl font-bold text-slate-100 capitalize" suppressHydrationWarning>{hasMounted ? format(selectedMonth, "MMMM yyyy", { locale: id }) : ""}</h2><div className="flex gap-1 print:hidden"><Button asChild variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-800"><Link href={`/manajemen/dinas?month=${format(subMonths(selectedMonth, 1), "yyyy-MM")}`}><ChevronLeft className="h-4 w-4" /></Link></Button><Button asChild variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-800"><Link href={`/manajemen/dinas?month=${format(addMonths(selectedMonth, 1), "yyyy-MM")}`}><ChevronRight className="h-4 w-4" /></Link></Button></div></div>
          {isAdmin && <div className="text-[10px] font-bold text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">💡 Tip: Klik dan tarik kursor untuk memblok banyak kolom sekaligus</div>}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-x-auto shadow-2xl mb-8 select-none">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="sticky left-0 z-20 bg-slate-950 p-3 text-left text-[10px] font-bold uppercase text-slate-500 border-r border-slate-800 min-w-[150px]">Personil</th>
                {daysInMonth.map((d, idx) => (
                  <th key={d.toString()} className={`p-2 text-center text-[10px] font-bold border-r border-slate-800 min-w-[35px] ${isWeekend(d) ? "bg-red-500/5 text-red-400" : "text-slate-500"}`}>
                    <div>{format(d, "EE", { locale: id })}</div><div className="text-xs text-slate-300">{format(d, "dd")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personnel.map((p) => {
                const isMe = p.id === currentUserId;
                return (
                  <tr key={p.id} className={`border-b border-slate-800 transition-colors ${isMe ? "bg-amber-500/5" : "hover:bg-slate-900/30"}`}>
                    <td className={`sticky left-0 z-10 p-3 border-r border-slate-800 ${isMe ? "bg-slate-900/90" : "bg-slate-950"}`}><p className={`text-xs font-bold truncate ${isMe ? "text-amber-400" : "text-slate-200"}`}>{p.full_name}</p></td>
                    {daysInMonth.map((d, dIdx) => {
                      const dateStr = format(d, "yyyy-MM-dd");
                      const entry = localRosters.find(r => r.user_id === p.id && r.duty_date === dateStr);
                      const shift = entry ? [...localShifts, { code: 'APN7', name: 'Admin Jam 7', color_code: '#94a3b8' }, { code: 'APN8', name: 'Admin Jam 8', color_code: '#94a3b8' }].find(s => s.code === entry.shift_code) : null;
                      const active = isInRange(p.id, dIdx);
                      const displayColor = getSafeColor(entry?.shift_code || '', shift?.color_code || null);

                      return (
                        <td key={dateStr} className={`p-1 text-center border-r border-slate-800 transition-all ${isAdmin ? "cursor-crosshair" : ""} ${active ? "bg-blue-500/20 z-10 relative" : ""}`} onMouseDown={() => onMouseDown(p.id, dIdx)} onMouseEnter={() => onMouseEnter(p.id, dIdx)}>
                          {entry ? (
                            <div className="h-7 w-full flex items-center justify-center rounded text-[9px] font-bold" style={{ backgroundColor: `${displayColor}20`, color: displayColor, border: `1px solid ${displayColor}40` }}>{entry.shift_code}</div>
                          ) : <div className="h-7 w-full" />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Portal Dropdown for single cell */}
        {isAdmin && openDropdown && hasMounted && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpenDropdown(null)} />
            <DropdownPortalContent
              openDropdown={openDropdown}
              getAvailableShifts={getAvailableShifts}
              getSafeColor={getSafeColor}
              handleBulkAssign={handleBulkAssign}
            />
          </>,
          document.body
        )}

        {/* Modal Pilih Shift Masal */}
        <Dialog open={!!selectedRange} onOpenChange={(open) => !open && setSelectedRange(null)}>
          <DialogContent className="max-w-xs bg-slate-950 border-slate-800 p-0 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-blue-500/10"><h3 className="text-sm font-bold text-blue-400">Pilih Shift Masal</h3><p className="text-[10px] text-slate-400 mt-1 uppercase font-black">{selectedRange?.userIds.length} Personil × {selectedRange?.dates.length} Hari</p></div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {selectedRange && getAvailableShifts(selectedRange.userIds[0]).map(s => {
                const clr = getSafeColor(s.code, s.color_code);
                return (
                  <button key={s.code} onClick={() => handleBulkAssign(s.code)} className="flex flex-col items-center justify-center h-14 rounded-xl transition-all hover:scale-105 border" style={{ backgroundColor: `${clr}10`, color: clr, borderColor: `${clr}30` }}><span className="text-xs font-black">{s.code}</span><span className="text-[8px] opacity-60 font-bold">{s.name}</span></button>
                );
              })}
              <button onClick={() => handleBulkAssign(null)} className="col-span-2 h-10 rounded-xl text-xs font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center gap-2 border border-slate-800"><X className="w-4 h-4" /> Hapus Jadwal</button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Legend */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(() => {
            const displayedCodes = new Set();
            const legendItems = [];

            // Group APN codes into one APNZ item
            const apnShifts = localShifts.filter(s => s.code === 'APN7' || s.code === 'APN8' || s.code === 'APNZ');
            if (apnShifts.length > 0) {
              const apnzFromDb = apnShifts.find(s => s.code === 'APNZ');
              legendItems.push(
                <div key="APNZ-GROUP" className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center gap-3">
                  <div className="h-10 w-1 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-100 uppercase">APNZ</p>
                    <p className="text-[10px] text-slate-400 font-medium">Admin General</p>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                      {apnzFromDb?.start_time?.substring(0, 5) || '07:30'} - {apnzFromDb?.end_time?.substring(0, 5) || '16:30'}
                    </p>
                  </div>
                </div>
              );
              displayedCodes.add('APN7');
              displayedCodes.add('APN8');
              displayedCodes.add('APNZ');
            }

            // Map the rest
            localShifts.forEach((s) => {
              if (displayedCodes.has(s.code)) return;
              displayedCodes.add(s.code);
              
              const clr = getSafeColor(s.code, s.color_code);
              legendItems.push(
                <div key={s.code} className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-3">
                  <div className="h-10 w-1 rounded-full" style={{ backgroundColor: clr }} />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-100 uppercase">{s.code}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{s.name}</p>
                    {s.start_time && s.end_time && (
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                      </p>
                    )}
                  </div>
                </div>
              );
            });

            return legendItems;
          })()}
        </div>
      </main>
    </div>
  );
}

// Portal-based dropdown that renders at document.body level
function DropdownPortalContent({
  openDropdown,
  getAvailableShifts,
  getSafeColor,
  handleBulkAssign
}: {
  openDropdown: { userId: string; dateStr: string; anchorRect: DOMRect };
  getAvailableShifts: (userId: string) => { code: string; name: string | null; color_code: string | null }[];
  getSafeColor: (code: string, dbColor: string | null) => string;
  handleBulkAssign: (shiftCode: string | null, targetRange?: { userIds: string[]; dates: string[] }) => void;
}) {
  const { userId, dateStr, anchorRect } = openDropdown;

  // Hitung posisi secara sinkron agar tidak ada flash/flying effect
  const pos = useMemo(() => {
    const dropdownH = 280;
    const dropdownW = 144;
    const viewH = window.innerHeight;
    const viewW = window.innerWidth;

    const spaceBelow = viewH - anchorRect.bottom;
    const openUp = spaceBelow < dropdownH && anchorRect.top > dropdownH;

    const top = openUp ? anchorRect.top - 4 : anchorRect.bottom + 4;

    let left = anchorRect.left + anchorRect.width / 2 - dropdownW / 2;
    left = Math.max(8, Math.min(left, viewW - dropdownW - 8));

    return { top, left, openUp };
  }, [anchorRect]);

  const shifts = getAvailableShifts(userId);

  return (
    <div
      className="fixed z-[9999] w-36 rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-md shadow-2xl p-2 space-y-1"
      style={{
        left: pos.left,
        top: pos.top,
        ...(pos.openUp ? { transform: 'translateY(-100%)' } : {}),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {shifts.map(s => {
        const clr = getSafeColor(s.code, s.color_code);
        return (
          <button
            key={s.code}
            onClick={() => handleBulkAssign(s.code, { userIds: [userId], dates: [dateStr] })}
            className="w-full flex items-center justify-center h-8 rounded-lg text-[10px] font-black transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: `${clr}15`, color: clr, border: `1px solid ${clr}30` }}
          >
            {s.code}
          </button>
        );
      })}
      <div className="border-t border-slate-800 pt-1" />
      <button
        onClick={() => handleBulkAssign(null, { userIds: [userId], dates: [dateStr] })}
        className="w-full h-8 rounded-lg text-[10px] font-black text-slate-500 bg-slate-800/50 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center gap-1 border border-transparent hover:border-red-500/30"
      >
        <X className="w-3 h-3" /> Kosong
      </button>
    </div>
  );
}
