"use client";

import React, { useState, useEffect, useMemo } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay } from "date-fns";
import { id } from "date-fns/locale";
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  Save, Loader2, Settings2, Printer, X, Calendar, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@/lib/supabase/client";

interface ShiftConfig {
  id?: string;
  unit_id?: string;
  code: string;
  name: string | null;
  start_time: string | null;
  end_time: string | null;
  color_code: string | null;
}

interface RosterEntry {
  id?: string;
  user_id: string;
  duty_date: string;
  shift_code: string;
}

interface Personnel {
  id: string;
  full_name: string;
  unit_id: string;
  role: string;
}

export default function RosterContent({ 
  unitId, unitName, currentUserId, isAdmin, adminName,
  personnel: initialPersonnel, shifts: initialShifts, rosters: initialRosters, selectedMonth: initialMonth 
}: { 
  unitId: string; 
  unitName: string | null; 
  currentUserId: string; 
  isAdmin: boolean; 
  adminName?: string;
  personnel: Personnel[];
  shifts: ShiftConfig[];
  rosters: RosterEntry[];
  selectedMonth: Date;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [personnel, setPersonnel] = useState<Personnel[]>(initialPersonnel);
  const [localShifts, setLocalShifts] = useState<ShiftConfig[]>(initialShifts);
  const [localRosters, setLocalRosters] = useState<RosterEntry[]>(initialRosters);
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [tempShifts, setTempShifts] = useState<ShiftConfig[]>(initialShifts);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync state with props when month or data changes
  useEffect(() => {
    setPersonnel(initialPersonnel);
    setLocalShifts(initialShifts);
    setLocalRosters(initialRosters);
    setSelectedMonth(initialMonth);
    setTempShifts(initialShifts);
  }, [initialPersonnel, initialShifts, initialRosters, initialMonth]);

  // Drag selection state
  const [dragStart, setDragStart] = useState<{ userId: string; dayIdx: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ userId: string; dayIdx: number } | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ userIds: string[]; dates: string[] } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<{ userId: string; dateStr: string; anchorRect: DOMRect } | null>(null);

  useEffect(() => { 
    setHasMounted(true); 
  }, []);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(selectedMonth), end: endOfMonth(selectedMonth) });
  }, [selectedMonth]);

  const getSafeColor = (code: string, dbColor: string | null) => {
    // Paksa Biru untuk APNZ dan APBA di Web agar tidak hitam blok
    if (code === 'APNZ' || code === 'APN7' || code === 'APN8' || code === 'APBA') return "#3b82f6";
    
    if (dbColor) return dbColor;
    if (code === 'APBB') return "#10b981";
    if (code === 'FREE') return "#ef4444";
    if (code === 'AH') return "#f59e0b";
    return "#94a3b8";
  };

  const onMouseDown = (userId: string, dayIdx: number) => {
    if (!isAdmin) return;
    setOpenDropdown(null);
    setDragStart({ userId, dayIdx });
    setDragEnd({ userId, dayIdx });
  };

  const onMouseEnter = (userId: string, dayIdx: number) => {
    if (dragStart) setDragEnd({ userId, dayIdx });
  };

  useEffect(() => {
    const handleMouseUp = () => {
      if (dragStart && dragEnd) {
        const userIdx1 = personnel.findIndex(p => p.id === dragStart.userId);
        const userIdx2 = personnel.findIndex(p => p.id === dragEnd.userId);
        const startU = Math.min(userIdx1, userIdx2);
        const endU = Math.max(userIdx1, userIdx2);
        const startD = Math.min(dragStart.dayIdx, dragEnd.dayIdx);
        const endD = Math.max(dragStart.dayIdx, dragEnd.dayIdx);

        const selectedUserIds = personnel.slice(startU, endU + 1).map(p => p.id);
        const selectedDates = daysInMonth.slice(startD, endD + 1).map(d => format(d, "yyyy-MM-dd"));

        if (selectedUserIds.length === 1 && selectedDates.length === 1) {
          const element = document.querySelector(`td[data-date="${selectedDates[0]}"][data-user="${selectedUserIds[0]}"]`);
          if (element) {
            setOpenDropdown({ userId: selectedUserIds[0], dateStr: selectedDates[0], anchorRect: element.getBoundingClientRect() });
          }
          setSelectedRange(null);
        } else {
          setSelectedRange({ userIds: selectedUserIds, dates: selectedDates });
        }
      }
      setDragStart(null);
      setDragEnd(null);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [dragStart, dragEnd, personnel, daysInMonth]);

  const isInRange = (userId: string, dayIdx: number) => {
    if (!dragStart || !dragEnd) return false;
    const userIdx1 = personnel.findIndex(p => p.id === dragStart.userId);
    const userIdx2 = personnel.findIndex(p => p.id === dragEnd.userId);
    const currUserIdx = personnel.findIndex(p => p.id === userId);
    const startU = Math.min(userIdx1, userIdx2);
    const endU = Math.max(userIdx1, userIdx2);
    const startD = Math.min(dragStart.dayIdx, dragEnd.dayIdx);
    const endD = Math.max(dragStart.dayIdx, dragEnd.dayIdx);
    return currUserIdx >= startU && currUserIdx <= endU && dayIdx >= startD && dayIdx <= endD;
  };

  const getAvailableShifts = (userId: string) => {
    const targetUser = personnel.find(p => p.id === userId);
    const isAdminUser = targetUser?.role === 'admin' || targetUser?.role === 'superadmin';

    // Hapus APNZ dari pilihan manapun (karena hanya untuk laporan/PDF)
    const available = [...localShifts].filter(s => s.code !== 'APNZ');
    
    // Tambahkan shift default APN untuk Admin jika belum dikonfigurasi di DB
    if (isAdminUser) {
      if (!available.some(s => s.code === 'APN7')) available.push({ code: 'APN7', name: 'Admin Jam 7', color_code: '#94a3b8', start_time: null, end_time: null });
      if (!available.some(s => s.code === 'APN8')) available.push({ code: 'APN8', name: 'Admin Jam 8', color_code: '#94a3b8', start_time: null, end_time: null });
    }

    // Tambahkan shift default FREE jika belum dikonfigurasi di DB
    if (!available.some(s => s.code === 'FREE')) {
      available.push({ code: 'FREE', name: 'Libur', color_code: '#ef4444', start_time: null, end_time: null });
    }

    return available;
  };

  const handleBulkAssign = async (shiftCode: string | null, targetRange?: { userIds: string[]; dates: string[] }) => {
    const range = targetRange || selectedRange;
    if (!range) return;
    const { userIds, dates } = range;

    // OPTIMISTIC UPDATE: Langsung update UI agar terasa instan
    let updatedRosters = localRosters.filter(r => {
      // Jika mode hapus, hilangkan roster yang ada dalam range (blok) yang dipilih
      if (!shiftCode && userIds.includes(r.user_id) && dates.includes(r.duty_date)) return false;
      return true;
    });

    if (shiftCode) {
      userIds.forEach(uid => {
        dates.forEach(date => {
          const idx = updatedRosters.findIndex(r => r.user_id === uid && r.duty_date === date);
          if (idx >= 0) updatedRosters[idx] = { ...updatedRosters[idx], shift_code: shiftCode };
          else updatedRosters.push({ user_id: uid, duty_date: date, shift_code: shiftCode });
        });
      });
    }

    setLocalRosters(updatedRosters);
    setSelectedRange(null);
    setOpenDropdown(null);

    try {
      if (shiftCode) {
        const updates = userIds.flatMap(uid => dates.map(date => ({ user_id: uid, duty_date: date, shift_code: shiftCode })));
        for (const up of updates) {
          const { error } = await supabase.from("duty_rosters").upsert(up, { onConflict: "user_id, duty_date" });
          if (error) throw error;
        }
      } else {
        // Eksekusi delete langsung ke database sesuai baris yang diblok
        const { error } = await supabase.from("duty_rosters")
          .delete()
          .in("user_id", userIds)
          .in("duty_date", dates);
        if (error) throw error;
      }
      
      toast.success("Jadwal diperbarui");
    } catch (e) { 
      toast.error("Gagal memperbarui jadwal"); 
      console.error(e);
      setLocalRosters(initialRosters);
    }
  };

  const handleSaveShifts = async () => {
    setIsSaving(true);
    try {
      for (const s of tempShifts) {
        const { error } = await supabase.from("shift_configs").upsert({ ...s, unit_id: unitId }, { onConflict: "unit_id, code" });
        if (error) throw error;
      }
      setIsSettingOpen(false);
      toast.success("Pengaturan shift disimpan");
      router.refresh();
    } catch (e) { toast.error("Gagal menyimpan pengaturan shift."); } finally { setIsSaving(false); }
  };

  const handleExportPDF = (mode: 'full' | 'report') => {
    setIsExportModalOpen(false);
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let daysToExport: Date[];
    let periodLabel: string;

    if (mode === 'full') {
      daysToExport = daysInMonth;
      periodLabel = format(selectedMonth, "MMMM yyyy", { locale: id });
    } else {
      const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 21);
      const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 20);
      daysToExport = eachDayOfInterval({ start, end });
      periodLabel = `${format(start, "dd MMM yyyy", { locale: id })} - ${format(end, "dd MMM yyyy", { locale: id })}`;
    }

    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text(`JADWAL DINAS ${unitName?.toUpperCase() || "PERSONIL"}`, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(11); doc.text(`BANDARA INTERNASIONAL JAWA BARAT`, pageWidth / 2, 21, { align: 'center' });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.text(`Periode: ${periodLabel}`, pageWidth / 2, 27, { align: 'center' });

    const head = [
      [{ content: 'NO', rowSpan: 2, styles: { valign: 'middle' as const, fillColor: [146, 208, 80] as [number, number, number] } }, { content: 'NAMA', rowSpan: 2, styles: { valign: 'middle' as const, fillColor: [146, 208, 80] as [number, number, number] } }, ...daysToExport.map(d => ({ content: ['MG', 'SN', 'SL', 'RB', 'KM', 'JM', 'SB'][d.getDay()], styles: { fillColor: (d.getDay() === 0 || d.getDay() === 6 ? [255, 204, 0] : [146, 208, 80]) as [number, number, number] } }))],
      [...daysToExport.map(d => ({ content: format(d, "dd"), styles: { fillColor: (d.getDay() === 0 || d.getDay() === 6 ? [255, 204, 0] : [146, 208, 80]) as [number, number, number] } }))]
    ];

    const body: any[] = personnel.map((p, i) => [(i + 1).toString(), p.full_name, ...daysToExport.map(d => { const entry = localRosters.find(r => r.user_id === p.id && r.duty_date === format(d, "yyyy-MM-dd")); return entry ? entry.shift_code : ""; })]);
    body.push([{ content: '', colSpan: daysToExport.length + 2, styles: { fillColor: [255, 255, 255], minCellHeight: 2, lineWidth: 0 } }]);

    if (mode === 'full') {
      const targets = [{ code: 'APBA', label: 'PAGI (APBA)' }, { code: 'APBB', label: 'MALAM (APBB)' }, { code: 'FREE', label: 'LIBUR (FREE)' }];
      targets.forEach(t => {
        body.push(['', { content: t.label, styles: { halign: 'left' as const, fontStyle: 'bold' as const } }, ...daysToExport.map(d => { const count = localRosters.filter(r => r.duty_date === format(d, "yyyy-MM-dd") && r.shift_code === t.code).length; return { content: count > 0 ? count.toString() : "0", styles: { halign: 'center' as const } }; })]);
      });
    }

    autoTable(doc, {
      head, body, startY: 30, theme: 'grid', margin: { left: 5, right: 5 },
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

    let currentY = (doc as any).lastAutoTable.finalY + 7;
    const legendBody: any[] = [];
    const findS = (c: string) => localShifts.find(s => s.code === c);
    const ahS = findS('AH'); if (ahS) legendBody.push(['AH', ahS.name, `${ahS.start_time?.substring(0, 5)} - ${ahS.end_time?.substring(0, 5)}`]);
    const apnzS = findS('APNZ') || { code: 'APNZ', name: 'Admin General', start_time: '07:30:00', end_time: '16:30:00', color_code: '#000000' };
    legendBody.push(['APNZ', 'Admin General', `${apnzS.start_time?.substring(0, 5)} - ${apnzS.end_time?.substring(0, 5)}`]);
    const apbaS = findS('APBA'); if (apbaS) legendBody.push(['APBA', apbaS.name, `${apbaS.start_time?.substring(0, 5)} - ${apbaS.end_time?.substring(0, 5)}`]);
    const apbbS = findS('APBB'); if (apbbS) legendBody.push(['APBB', apbbS.name, `${apbbS.start_time?.substring(0, 5)} - ${apbbS.end_time?.substring(0, 5)}`]);
    legendBody.push(['FREE', 'Libur', '-']);

    autoTable(doc, {
      body: legendBody, startY: currentY, theme: 'grid', margin: { left: 5 }, tableWidth: 100,
      styles: { fontSize: 5.5, cellPadding: 1, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
      columnStyles: { 0: { cellWidth: 15, fontStyle: 'bold', halign: 'center' }, 1: { cellWidth: 42.5, halign: 'center' }, 2: { cellWidth: 42.5, halign: 'center' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const code = data.cell.text[0];
          // Force APNZ & APBA to Black in PDF, others follow DB or defaults
          let color = '#000000';
          if (code !== 'APNZ' && code !== 'APBA') {
            const shift = findS(code);
            if (shift && shift.color_code) color = shift.color_code;
            else if (code === 'APBB') color = '#10b981';
            else if (code === 'FREE') color = '#ef4444';
            else if (code === 'AH') color = '#f59e0b';
          }
          const hex = color.replace('#', '');
          data.cell.styles.textColor = [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
        }
      }
    });

    const sigY = (doc as any).lastAutoTable.finalY + 15;
    const rightX = pageWidth - 60;
    doc.setFontSize(9);
    doc.text(`Majalengka, ${format(new Date(), "dd MMMM yyyy", { locale: id })}`, rightX, sigY);
    doc.text(`Admin ${unitName || ''}`, rightX, sigY + 5);
    doc.setFont("helvetica", "bold");
    doc.text(`( ${adminName || '..........................'} )`, rightX, sigY + 25);
    doc.save(`Jadwal_Dinas_${mode === 'full' ? 'Bulanan' : 'Laporan'}_${format(selectedMonth, "MMMM_yyyy")}.pdf`);
  };

  return (
    <div className="min-h-dvh bg-slate-950">
      {isSettingOpen && (
        <Dialog open={isSettingOpen} onOpenChange={setIsSettingOpen}>
          <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 p-0 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <div><DialogTitle className="text-xl font-bold text-slate-100">Pengaturan Shift</DialogTitle><p className="text-xs text-slate-400 mt-1">Konfigurasi kode dan jam kerja unit {unitName}</p></div>
              <Button variant="ghost" size="icon" onClick={() => setIsSettingOpen(false)} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></Button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {tempShifts.map((shift, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/30">
                  <div className="col-span-2 space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Kode</Label><Input value={shift.code} onChange={(e) => { const newShifts = [...tempShifts]; newShifts[index].code = e.target.value.toUpperCase(); setTempShifts(newShifts); }} className="h-10 bg-slate-950 border-slate-800 font-bold text-blue-400" /></div>
                  <div className="col-span-4 space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Nama Shift</Label><Input value={shift.name || ''} onChange={(e) => { const newShifts = [...tempShifts]; newShifts[index].name = e.target.value; setTempShifts(newShifts); }} className="h-10 bg-slate-950 border-slate-800" /></div>
                  <div className="col-span-2 space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Mulai</Label><Input type="time" value={shift.start_time || ''} onChange={(e) => { const newShifts = [...tempShifts]; newShifts[index].start_time = e.target.value + ":00"; setTempShifts(newShifts); }} className="h-10 bg-slate-950 border-slate-800 text-xs" /></div>
                  <div className="col-span-2 space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Selesai</Label><Input type="time" value={shift.end_time || ''} onChange={(e) => { const newShifts = [...tempShifts]; newShifts[index].end_time = e.target.value + ":00"; setTempShifts(newShifts); }} className="h-10 bg-slate-950 border-slate-800 text-xs" /></div>
                  <div className="col-span-1 space-y-1.5"><Label className="text-[10px] uppercase font-bold text-slate-500">Warna</Label><input type="color" value={shift.color_code || '#94a3b8'} onChange={(e) => { const newShifts = [...tempShifts]; newShifts[index].color_code = e.target.value; setTempShifts(newShifts); }} className="h-10 w-full bg-slate-950 border border-slate-800 rounded p-1 cursor-pointer" /></div>
                  <div className="col-span-1 flex items-end"><Button variant="ghost" size="icon" onClick={() => setTempShifts(tempShifts.filter((_, i) => i !== index))} className="h-10 w-10 text-red-500/50 hover:text-red-500 hover:bg-red-500/10"><X className="w-4 h-4" /></Button></div>
                </div>
              ))}
              <Button variant="outline" onClick={() => setTempShifts([...tempShifts, { code: '', name: '', start_time: '08:00:00', end_time: '17:00:00', color_code: '#94a3b8' }])} className="w-full h-12 border-dashed border-slate-800 bg-slate-900/10 text-slate-500 hover:text-slate-300 hover:bg-slate-900/30">+ Tambah Shift Baru</Button>
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
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 sm:inline-flex">
              <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">Jadwal Dinas Personil</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mt-0.5">Shift Roster Matrix</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(true)} className="h-10 bg-slate-900 border border-slate-800 text-slate-300 font-bold px-4 no-print flex items-center gap-2">
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">PDF</span>
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" className="h-10 border-slate-800 text-blue-400 font-bold px-4 no-print flex items-center gap-2" onClick={() => { setTempShifts([...localShifts]); setIsSettingOpen(true); }}>
                <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">Settings</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-100 capitalize" suppressHydrationWarning>{hasMounted ? format(selectedMonth, "MMMM yyyy", { locale: id }) : ""}</h2>
            <div className="flex gap-1 print:hidden">
              <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-800"><Link href={`/manajemen/dinas?month=${format(subMonths(selectedMonth, 1), "yyyy-MM")}`}><ChevronLeft className="h-4 w-4" /></Link></Button>
              <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-800"><Link href={`/manajemen/dinas?month=${format(addMonths(selectedMonth, 1), "yyyy-MM")}`}><ChevronRight className="h-4 w-4" /></Link></Button>
            </div>
          </div>
          {isAdmin && <div className="text-[10px] font-bold text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">💡 Tip: Klik dan tarik kursor untuk memblok banyak kolom sekaligus</div>}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-x-auto shadow-2xl mb-8 select-none">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="sticky left-0 z-20 bg-slate-950 p-3 text-left text-[10px] font-bold uppercase text-slate-500 border-r border-slate-800 min-w-[150px]">Personil</th>
                {daysInMonth.map((d) => (
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
                        <td key={dateStr} data-date={dateStr} data-user={p.id} className={`p-1 text-center border-r border-slate-800 transition-all ${isAdmin ? "cursor-crosshair" : ""} ${active ? "bg-blue-500/20 z-10 relative" : ""}`} onMouseDown={() => onMouseDown(p.id, dIdx)} onMouseEnter={() => onMouseEnter(p.id, dIdx)}>
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

        {isAdmin && openDropdown && hasMounted && createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setOpenDropdown(null)} />
            <DropdownPortalContent openDropdown={openDropdown} getAvailableShifts={getAvailableShifts} getSafeColor={getSafeColor} handleBulkAssign={handleBulkAssign} />
          </>,
          document.body
        )}

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

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(() => {
            const displayedCodes = new Set();
            const legendItems = [];
            const apnShifts = localShifts.filter(s => s.code === 'APN7' || s.code === 'APN8' || s.code === 'APNZ');
            if (apnShifts.length > 0) {
              const apnzFromDb = apnShifts.find(s => s.code === 'APNZ');
              legendItems.push(
                <div key="APNZ-GROUP" className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center gap-3">
                  <div className="h-10 w-1 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-100 uppercase">APNZ</p>
                    <p className="text-[10px] text-slate-400 font-medium">Admin General</p>
                    <p className="text-[10px] text-slate-400 font-medium">{apnzFromDb?.start_time?.substring(0, 5) || '07:30'} - {apnzFromDb?.end_time?.substring(0, 5) || '16:30'}</p>
                  </div>
                </div>
              );
              displayedCodes.add('APN7'); displayedCodes.add('APN8'); displayedCodes.add('APNZ');
            }
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
                    {s.start_time && s.end_time && <p className="text-[10px] text-slate-400 font-medium">{s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}</p>}
                  </div>
                </div>
              );
            });
            return legendItems;
          })()}
        </div>

        <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
          <DialogContent className="max-w-[400px] bg-slate-900/95 border-slate-800 p-0 overflow-hidden shadow-2xl z-[9999]">
            <div className="p-6 text-center border-b border-slate-800/50 bg-slate-900/50"><DialogTitle className="text-base font-bold text-slate-100">Pilih Mode Export</DialogTitle></div>
            <div className="p-8 grid grid-cols-2 gap-4">
              <button onClick={() => handleExportPDF('full')} className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"><Calendar className="w-7 h-7 text-blue-500" /></div>
                <span className="text-xs font-bold text-slate-300">Jadwal Bulanan</span>
              </button>
              <button onClick={() => handleExportPDF('report')} className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner"><FileText className="w-7 h-7 text-emerald-500" /></div>
                <span className="text-xs font-bold text-slate-300">Laporan (21-20)</span>
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

function DropdownPortalContent({ openDropdown, getAvailableShifts, getSafeColor, handleBulkAssign }: { openDropdown: { userId: string; dateStr: string; anchorRect: DOMRect }; getAvailableShifts: (userId: string) => { code: string; name: string | null; color_code: string | null }[]; getSafeColor: (code: string, dbColor: string | null) => string; handleBulkAssign: (shiftCode: string | null, targetRange?: { userIds: string[]; dates: string[] }) => void; }) {
  const { userId, dateStr, anchorRect } = openDropdown;
  const pos = useMemo(() => {
    const dropdownH = 280; const dropdownW = 144; const viewH = window.innerHeight; const viewW = window.innerWidth;
    const spaceBelow = viewH - anchorRect.bottom;
    const openUp = spaceBelow < dropdownH && anchorRect.top > dropdownH;
    const top = openUp ? anchorRect.top - 4 : anchorRect.bottom + 4;
    let left = anchorRect.left + anchorRect.width / 2 - dropdownW / 2;
    left = Math.max(8, Math.min(left, viewW - dropdownW - 8));
    return { top, left, openUp };
  }, [anchorRect]);
  const shifts = getAvailableShifts(userId);
  return (
    <div className="fixed z-[9999] w-36 rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-md shadow-2xl p-2 space-y-1" style={{ left: pos.left, top: pos.top, ...(pos.openUp ? { transform: 'translateY(-100%)' } : {}) }} onClick={(e) => e.stopPropagation()}>
      {shifts.map(s => {
        const clr = getSafeColor(s.code, s.color_code);
        return (
          <button key={s.code} onClick={() => handleBulkAssign(s.code, { userIds: [userId], dates: [dateStr] })} className="w-full flex items-center justify-center h-8 rounded-lg text-[10px] font-black transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: `${clr}15`, color: clr, border: `1px solid ${clr}30` }}>{s.code}</button>
        );
      })}
      <div className="border-t border-slate-800 pt-1" />
      <button onClick={() => handleBulkAssign(null, { userIds: [userId], dates: [dateStr] })} className="w-full h-8 rounded-lg text-[10px] font-black text-slate-500 bg-slate-800/50 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center gap-1 border border-transparent hover:border-red-500/30"><X className="w-3 h-3" /> Kosong</button>
    </div>
  );
}
