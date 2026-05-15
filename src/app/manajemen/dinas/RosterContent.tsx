"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, parseISO, addMonths, subMonths, isToday, isWeekend
} from "date-fns";
import { id } from "date-fns/locale";
import {
  ArrowLeft, Download, ChevronLeft, ChevronRight,
  Users, Save, Loader2, Info, Settings2, Clock, Pencil, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth)
    });
  }, [selectedMonth]);

  // Auto-save logic
  const handleCellClick = async (userId: string, date: Date) => {
    if (!isAdmin) return;

    const dateStr = format(date, "yyyy-MM-dd");
    const currentEntry = localRosters.find(r => r.user_id === userId && r.duty_date === dateStr);

    const person = personnel.find(p => p.id === userId);
    const isTargetAdmin = person?.role === 'admin';

    // Ambil list shift dari database
    let availableShifts = [...shifts];

    // Jika target adalah admin, pastikan APN7 dan APN8 ada di daftar pilihan klik
    if (isTargetAdmin) {
      if (!availableShifts.some(s => s.code === 'APN7')) {
        availableShifts.push({ code: 'APN7', name: 'Admin Masuk Jam 7', color_code: '#10b981' });
      }
      if (!availableShifts.some(s => s.code === 'APN8')) {
        availableShifts.push({ code: 'APN8', name: 'Admin Masuk Jam 8', color_code: '#3b82f6' });
      }
    }

    // Filter ulang berdasarkan role (safety check)
    availableShifts = availableShifts.filter(s => {
      if (['APN7', 'APN8'].includes(s.code)) {
        return isTargetAdmin;
      }
      return true;
    });

    let nextCode = "";
    if (!currentEntry) {
      nextCode = availableShifts[0]?.code || "APBA";
    } else {
      const currentIndex = availableShifts.findIndex(s => s.code === currentEntry.shift_code);
      if (currentIndex === -1 || currentIndex === availableShifts.length - 1) {
        nextCode = "";
      } else {
        nextCode = availableShifts[currentIndex + 1].code;
      }
    }

    let updatedRosters: RosterEntry[];
    if (nextCode === "") {
      updatedRosters = localRosters.filter(r => !(r.user_id === userId && r.duty_date === dateStr));
    } else {
      const otherEntries = localRosters.filter(r => !(r.user_id === userId && r.duty_date === dateStr));
      updatedRosters = [...otherEntries, { user_id: userId, duty_date: dateStr, shift_code: nextCode }];
    }

    setLocalRosters(updatedRosters);

    // Auto save to database
    setIsSaving(true);
    try {
      await updateRoster(updatedRosters, unitId);
    } catch (e) {
      console.error("Auto-save failed:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShifts = async () => {
    setIsSaving(true);
    try {
      await updateShiftConfigs(tempShifts, unitId);
      setLocalShifts(tempShifts);
      setIsSettingOpen(false);
    } catch (e) {
      toast.error("Gagal menyimpan pengaturan shift.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const monthYear = format(selectedMonth, "MMMM yyyy", { locale: id });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`JADWAL DINAS ${unitName?.toUpperCase() || "PERSONIL"}`, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`BANDARA INTERNASIONAL JAWA BARAT`, pageWidth / 2, 21, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${monthYear}`, pageWidth / 2, 27, { align: 'center' });

    const dayNames = ['MG', 'SN', 'SL', 'RB', 'KM', 'JM', 'SB'];

    const head = [
      [
        { content: 'NO', rowSpan: 2, styles: { valign: 'middle' as const, fillColor: [146, 208, 80] as [number, number, number] } },
        { content: 'NAMA', rowSpan: 2, styles: { valign: 'middle' as const, fillColor: [146, 208, 80] as [number, number, number] } },
        ...daysInMonth.map(d => {
          const dayName = dayNames[d.getDay()];
          const isWeekendDay = d.getDay() === 0 || d.getDay() === 6;
          return { 
            content: dayName, 
            styles: { fillColor: (isWeekendDay ? [255, 204, 0] : [146, 208, 80]) as [number, number, number] } 
          };
        })
      ],
      [
        ...daysInMonth.map(d => {
          const isWeekendDay = d.getDay() === 0 || d.getDay() === 6;
          return { 
            content: format(d, "dd"), 
            styles: { fillColor: (isWeekendDay ? [255, 204, 0] : [146, 208, 80]) as [number, number, number] } 
          };
        })
      ]
    ];

    const body: any[] = personnel.map((p, i) => {
      const row = [
        (i + 1).toString(),
        p.full_name,
        ...daysInMonth.map(d => {
          const entry = localRosters.find(r => r.user_id === p.id && r.duty_date === format(d, "yyyy-MM-dd"));
          return entry ? entry.shift_code : "";
        })
      ];
      return row;
    });

    // Tambahkan baris kosong pemisah
    body.push([{ content: '', colSpan: daysInMonth.length + 2, styles: { fillColor: [255, 255, 255], minCellHeight: 2, lineWidth: 0 } }]);

    // Tambahkan Perhitungan Shift per Hari (Summary)
    // Gunakan list shift yang sudah digabung dengan APN7/APN8 untuk PDF
    const allShiftsForPDF = [...shifts];
    if (!allShiftsForPDF.some(s => s.code === 'APN7')) allShiftsForPDF.push({ code: 'APN7', name: 'Admin Jam 7', color_code: '#10b981' });
    if (!allShiftsForPDF.some(s => s.code === 'APN8')) allShiftsForPDF.push({ code: 'APN8', name: 'Admin Jam 8', color_code: '#3b82f6' });

    allShiftsForPDF.filter(s => ['APBA', 'APBB', 'APN7', 'APN8', 'FREE'].includes(s.code)).forEach(s => {
      // Tentukan label (PAGI, MALAM, LIBUR, dll)
      let label = s.code;
      if (s.code === 'APBA') label = 'PAGI';
      else if (s.code === 'APBB') label = 'MALAM';
      else if (s.code === 'FREE') label = 'LIBUR';

      const countRow = [
        { content: s.code, styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
        { content: `: ${label}`, styles: { fontStyle: 'bold' as const, halign: 'left' as const } },
        ...daysInMonth.map(d => {
          const dateStr = format(d, "yyyy-MM-dd");
          const count = localRosters.filter(r => r.duty_date === dateStr && r.shift_code === s.code).length;
          return { content: count > 0 ? count.toString() : "0", styles: { halign: 'center' as const } };
        })
      ];
      body.push(countRow);
    });



    const colStyles: any = {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 45 }
    };
    daysInMonth.forEach((_, idx) => {
      colStyles[idx + 2] = { halign: 'center', cellWidth: 7.5 }; 
    });

    autoTable(doc, {
      head,
      body,
      startY: 30,
      theme: 'grid',
      margin: { left: 5, right: 5 },
      styles: { fontSize: 5.5, cellPadding: 0.5, halign: 'center', textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, fontStyle: 'bold', overflow: 'hidden' },
      headStyles: { textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: colStyles,
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 1 && data.row.index < personnel.length) {
          const code = data.cell.text[0];
          if (code) {
            const shift = localShifts.find(s => s.code === code);
            if (shift && shift.color_code) {
              const hex = shift.color_code.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              data.cell.styles.textColor = [r, g, b];
            }
          }
        }
      }
    });

    // Add Legend as a separate small table below
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("KETERANGAN SHIFT:", 5, finalY + 8);

    const legendBody = [
      [{ content: 'APNZ', styles: { fontStyle: 'bold' as const, textColor: [0, 0, 0] as [number, number, number], halign: 'center' as const } }, { content: 'Admin 07.30 - 16.30', styles: { halign: 'left' as const } }],
      ...allShiftsForPDF.map(s => {
        const timeStr = s.start_time ? `${s.start_time.substring(0, 5)} - ${s.end_time?.substring(0, 5) || ''}` : (s.code === 'APN7' ? '07:00 - 16:00' : s.code === 'APN8' ? '08:00 - 17:00' : "LIBUR");
        const hex = (s.color_code || '#000000').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return [
          { content: s.code, styles: { fontStyle: 'bold' as const, textColor: [r, g, b] as [number, number, number], halign: 'center' as const } },
          { content: `${s.name || ""} ${timeStr}`, styles: { halign: 'left' as const } }
        ];
      })
    ];

    autoTable(doc, {
      body: legendBody,
      startY: finalY + 10,
      theme: 'grid',
      margin: { left: 5 },
      styles: { fontSize: 6, cellPadding: 0.8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold' as const },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 60 }
      }
    });

    // Add Signature at bottom right
    const finalLegendY = (doc as any).lastAutoTable.finalY || finalY + 20;
    const rightMargin = pageWidth - 60;
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Ditetapkan di: Majalengka", rightMargin, finalLegendY + 15);
    doc.text(`Tanggal: ${format(new Date(), "dd MMMM yyyy", { locale: id })}`, rightMargin, finalLegendY + 19);
    
    doc.setFont("helvetica", "bold");
    doc.text(`${unitName || "Unit"}`, rightMargin, finalLegendY + 27);
    
    // Space for actual signature
    doc.text(`${adminName || "Administrator"}`, rightMargin, finalLegendY + 45);
    doc.setLineWidth(0.3);
    doc.line(rightMargin, finalLegendY + 46, rightMargin + 40, finalLegendY + 46);

    doc.save(`Jadwal_Dinas_${monthYear.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Modal Pengaturan (Ditaruh paling atas biar prioritas utama) */}
      {isAdmin && (
        <Dialog open={isSettingOpen} onOpenChange={setIsSettingOpen}>
          <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 shadow-2xl sm:rounded-2xl z-[9999] p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50">
              <DialogHeader>
                <DialogTitle>
                  <div className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Settings2 className="h-5 w-5 text-blue-500" />
                    </div>
                    Konfigurasi Shift & Jam Kerja
                  </div>
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide bg-slate-950">
              {tempShifts.map((s, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 grid grid-cols-12 gap-6 items-center transition-all hover:bg-slate-900/40">
                  <div className="col-span-2">
                    <Label className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold">Kode</Label>
                    <Input
                      value={s.code}
                      onChange={(e) => {
                        const newShifts = [...tempShifts];
                        newShifts[idx].code = e.target.value.toUpperCase();
                        setTempShifts(newShifts);
                      }}
                      className="h-11 font-bold bg-slate-950 border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center"
                    />
                  </div>
                  <div className="col-span-5">
                    <Label className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold">Nama Shift</Label>
                    <Input
                      value={s.name || ''}
                      onChange={(e) => {
                        const newShifts = [...tempShifts];
                        newShifts[idx].name = e.target.value;
                        setTempShifts(newShifts);
                      }}
                      placeholder="Nama shift..."
                      className="h-11 bg-slate-950 border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="col-span-5 grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold">Jam Mulai</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type="time"
                          value={s.start_time ? s.start_time.substring(0, 5) : ''}
                          onChange={(e) => {
                            const newShifts = [...tempShifts];
                            newShifts[idx].start_time = e.target.value ? e.target.value + ":00" : null;
                            setTempShifts(newShifts);
                          }}
                          className="h-11 pl-10 bg-slate-950 border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold">Jam Selesai</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type="time"
                          value={s.end_time ? s.end_time.substring(0, 5) : ''}
                          onChange={(e) => {
                            const newShifts = [...tempShifts];
                            newShifts[idx].end_time = e.target.value ? e.target.value + ":00" : null;
                            setTempShifts(newShifts);
                          }}
                          className="h-11 pl-10 bg-slate-950 border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 flex justify-end gap-3 border-t border-slate-800 bg-slate-900/50">
              <Button variant="ghost" onClick={() => setIsSettingOpen(false)} className="text-slate-400 hover:text-slate-100 hover:bg-slate-800">
                Batal
              </Button>
              <Button onClick={handleSaveShifts} disabled={isSaving} className="bg-blue-600 hover:bg-blue-500 text-white px-10 h-11 shadow-lg shadow-blue-900/20 font-bold">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                Simpan Perubahan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 px-4 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 hover:bg-slate-800 hidden sm:inline-flex">
              <Link href="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-tight">Jadwal Dinas Personil</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mt-0.5">Shift Roster Matrix</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold px-4 shadow-lg transition-all active:scale-95 flex items-center gap-2 no-print"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download PDF</span>
            </Button>

            {isAdmin && (
              <Button variant="outline" size="sm" className="h-10 border-slate-800 hover:bg-slate-900 text-blue-400 font-bold px-4 shadow-lg transition-all active:scale-95 flex items-center gap-2 no-print" onClick={() => {
                setTempShifts([...localShifts]);
                setIsSettingOpen(true);
              }}>
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Pengaturan Shift</span>
              </Button>
            )}

            {isAdmin && isSaving && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider animate-pulse shadow-lg shadow-emerald-900/10 no-print">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Auto-Saving...
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Print Only Header */}
        <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
          <h1 className="text-2xl font-black uppercase">Laporan Jadwal Dinas Personil</h1>
          <p className="text-sm font-bold text-slate-600">Periode: {format(selectedMonth, "MMMM yyyy", { locale: id })}</p>
          <p className="text-[10px] text-slate-400 mt-1">Dicetak pada: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-100 capitalize">
              {format(selectedMonth, "MMMM yyyy", { locale: id })}
            </h2>
            <div className="flex gap-1 print:hidden">
              <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-800">
                <Link href={`/manajemen/dinas?month=${format(subMonths(selectedMonth, 1), "yyyy-MM")}`}>
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-800">
                <Link href={`/manajemen/dinas?month=${format(addMonths(selectedMonth, 1), "yyyy-MM")}`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-x-auto shadow-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="sticky left-0 z-20 bg-slate-950 p-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 border-r border-slate-800 min-w-[150px]">
                  Personil
                </th>
                {daysInMonth.map(d => {
                  const dateStr = format(d, "yyyy-MM-dd");
                  return (
                    <th
                      key={d.toString()}
                      className={`p-2 text-center text-[10px] font-bold border-r border-slate-800 min-w-[35px] transition-colors ${isWeekend(d) ? "bg-red-500/5 text-red-400" : "text-slate-500"
                        } ${hoveredCol === dateStr ? "bg-blue-500/10 text-blue-400" : ""}`}
                    >
                      <div>{format(d, "EE", { locale: id })}</div>
                      <div className={`text-xs ${hoveredCol === dateStr ? "text-blue-300" : "text-slate-300"}`}>{format(d, "dd")}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {personnel.map(p => {
                const isMe = p.id === currentUserId;
                return (
                  <tr
                    key={p.id}
                    onMouseEnter={() => setHoveredRow(p.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`border-b border-slate-800 transition-colors ${hoveredRow === p.id ? "bg-blue-500/10" : isMe ? "bg-amber-500/5" : "hover:bg-slate-900/30"
                      }`}
                  >
                    <td className={`sticky left-0 z-10 p-3 border-r border-slate-800 transition-colors ${hoveredRow === p.id ? "bg-slate-900" : isMe ? "bg-slate-900/90" : "bg-slate-950"
                      }`}>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold truncate ${hoveredRow === p.id ? "text-blue-400" : isMe ? "text-amber-400" : "text-slate-200"
                          }`}>{p.full_name}</p>
                        {isMe && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-black border border-amber-500/30 print:hidden">SAYA</span>
                        )}
                      </div>
                    </td>
                    {daysInMonth.map(d => {
                      const dateStr = format(d, "yyyy-MM-dd");
                      const entry = localRosters.find(r => r.user_id === p.id && r.duty_date === dateStr);
                      const shift = localShifts.find(s => s.code === entry?.shift_code);

                      return (
                        <td
                          key={dateStr}
                          onMouseEnter={() => setHoveredCol(dateStr)}
                          onMouseLeave={() => setHoveredCol(null)}
                          onClick={() => handleCellClick(p.id, d)}
                          className={`p-1 text-center border-r border-slate-800 transition-all ${isAdmin ? "cursor-pointer" : ""
                            } ${isToday(d) ? "bg-emerald-500/5" : ""} ${isWeekend(d) ? "bg-red-500/5" : ""
                            } ${hoveredCol === dateStr ? "bg-blue-500/10" : ""
                            } ${hoveredRow === p.id && hoveredCol === dateStr ? "ring-1 ring-inset ring-blue-500/50 bg-blue-500/10" : ""} ${isMe && !hoveredCol && !hoveredRow ? "bg-amber-500/[0.02]" : ""}`}
                        >
                          {entry ? (() => {
                            const isBlack = shift?.color_code === '#000000';
                            const displayColor = isBlack ? '#3b82f6' : (shift?.color_code || '#94a3b8');
                            return (
                              <div
                                className="h-7 w-full flex items-center justify-center rounded text-[9px] font-bold shadow-sm print:!bg-transparent print:!border-transparent print:!shadow-none"
                                style={{
                                  backgroundColor: `${displayColor}20`,
                                  color: displayColor,
                                  border: `1px solid ${displayColor}40`
                                }}
                              >
                                {entry.shift_code}
                              </div>
                            );
                          })() : (
                            <div className="h-7 w-full" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Row Summary Counts (Web UI) */}
              <tr className="border-b border-slate-800 bg-slate-900/20 print:hidden">
                <td className="sticky left-0 z-10 p-3 border-r border-slate-800 bg-slate-900/40">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Daily Summary</p>
                </td>
                {daysInMonth.map(d => <td key={d.toString()} className="border-r border-slate-800" />)}
              </tr>
              {(() => {
                const allShiftsForSummary = [...localShifts];
                if (!allShiftsForSummary.some(s => s.code === 'APN7')) allShiftsForSummary.push({ code: 'APN7', name: 'Admin Jam 7', color_code: '#10b981' });
                if (!allShiftsForSummary.some(s => s.code === 'APN8')) allShiftsForSummary.push({ code: 'APN8', name: 'Admin Jam 8', color_code: '#3b82f6' });
                
                return allShiftsForSummary.filter(s => ['APBA', 'APBB', 'APN7', 'APN8', 'FREE'].includes(s.code)).map(s => {
                  let label = s.code;
                  if (s.code === 'APBA') label = 'PAGI';
                  else if (s.code === 'APBB') label = 'MALAM';
                  else if (s.code === 'FREE') label = 'LIBUR';
                  else if (s.code === 'APN7') label = 'ADM-7';
                  else if (s.code === 'APN8') label = 'ADM-8';

                  return (
                    <tr key={s.code} className="border-b border-slate-800 bg-slate-900/10 hover:bg-slate-900/20 transition-colors print:hidden">
                      <td className="sticky left-0 z-10 p-3 border-r border-slate-800 bg-slate-900/60">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400">{s.code}</span>
                          <span className="text-[9px] font-bold text-slate-500">: {label}</span>
                        </div>
                      </td>
                      {daysInMonth.map(d => {
                        const dateStr = format(d, "yyyy-MM-dd");
                        const count = localRosters.filter(r => r.duty_date === dateStr && r.shift_code === s.code).length;
                        return (
                          <td key={dateStr} className="p-1 text-center border-r border-slate-800 text-[10px] font-bold text-slate-300">
                            {count > 0 ? count : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  )
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Shift Legend / Info */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Legend APNZ khusus Admin */}
          <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center gap-3 transition-all hover:border-blue-500/50">
            <div className="h-10 w-1 rounded-full bg-blue-500" />
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-100 uppercase">APNZ</p>
              <p className="text-[10px] text-slate-400 font-medium">Admin General</p>
              <p className="text-[10px] text-emerald-500 font-bold mt-0.5">07.30 - 16.30</p>
            </div>
          </div>
          
          {localShifts.map((s, idx) => {
            const isBlack = s.color_code === '#000000';
            const displayColor = isBlack ? '#3b82f6' : (s.color_code || '#64748b');
            return (
            <div key={s.code} className="group relative p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center gap-3 transition-all hover:border-slate-700">
              <div className="h-10 w-1 rounded-full" style={{ backgroundColor: displayColor }} />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-100 uppercase">{s.code}</p>
                <p className="text-[10px] text-slate-400 font-medium">{s.name || 'Shift'}</p>
                <p className="text-[10px] text-emerald-500 font-bold mt-0.5">
                  {s.start_time ? `${s.start_time.substring(0, 5)} - ${s.end_time?.substring(0, 5) || ''}` : '--:--'}
                </p>
              </div>
            </div>
          )})}
        </div>

        {isAdmin && (
          <div className="mt-6 flex items-center gap-4 text-xs text-emerald-500/70">
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              <span>Mode Admin: Klik pada kotak tanggal untuk mengganti shift, Auto save</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Global Print Styles for Roster
const printStyles = `
  @media print {
    @page { size: landscape; margin: 10mm; }
    
    header, .no-print, button, .lucide, .month-nav {
      display: none !important;
    }

    body {
      background: white !important;
      color: black !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    main {
      max-width: 100% !important;
      width: 100% !important;
      padding: 0 !important;
    }

    /* Roster Table Specifics */
    .bg-slate-950, .bg-slate-900, .bg-slate-900\\/90, .bg-slate-950\\/50 {
      background: white !important;
      border-color: #334155 !important;
      color: black !important;
    }

    .border-slate-800, .border-slate-800\\/50 {
      border-color: #cbd5e1 !important;
    }

    .text-slate-100, .text-slate-200, .text-slate-400, .text-slate-500 {
      color: black !important;
    }

    .sticky {
      position: static !important;
    }

    /* Keep Shift Colors but in simplified form */
    div[style*="background-color"] {
       background-color: transparent !important;
       border: 1px solid #94a3b8 !important;
       color: black !important;
       font-weight: bold !important;
       print-color-adjust: exact;
    }

    /* Weekend highlight in print */
    .bg-red-500\\/5 {
       background: #fef2f2 !important;
    }
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(printStyles));
  document.head.appendChild(style);
}
