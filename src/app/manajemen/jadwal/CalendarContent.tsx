"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  parseISO, isToday
} from "date-fns";
import { id } from "date-fns/locale";
import { 
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, 
  ArrowLeft, Clock, CheckCircle2, AlertCircle, Wrench, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/text-area";
import { createSchedule, updateScheduleStatus, deleteSchedule } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { Trash2, Printer } from "lucide-react";
import { toast } from "sonner";

type Schedule = {
  id: string;
  title: string;
  description: string | null;
  planned_date: string;
  status: 'planned' | 'ongoing' | 'completed' | 'missed';
  unit_id: string;
  facility_id: string | null;
  facilities?: { name: string; location_detail: string | null } | null;
};

type Facility = {
  id: string;
  name: string;
  location_detail: string | null;
};

type Props = {
  initialSchedules: Schedule[];
  facilities: Facility[];
  userUnitId: string | null;
  isAdmin: boolean;
};

export default function CalendarContent({ initialSchedules, facilities, userUnitId, isAdmin }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Render Header
  const renderHeader = () => (
    <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 hover:bg-slate-800">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-tight">Jadwal Preventive</h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mt-0.5">Planning & Maintenance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           {isAdmin && (
             <Button 
               size="sm" 
               onClick={() => setIsAddOpen(true)}
               className="h-9 bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-900/20 transition-all active:scale-95"
             >
               <Plus className="h-4 w-4 mr-2" /> <span className="hidden xs:inline">Jadwal Baru</span>
             </Button>
           )}
        </div>
      </div>
    </header>
  );

  // Render Calendar Navigation
  const renderNav = () => (
    <div className="flex items-center justify-between px-4 mb-6">
      <h2 className="text-xl font-bold text-slate-100 capitalize">
        {format(currentMonth, "MMMM yyyy", { locale: id })}
      </h2>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="border-slate-800 bg-slate-900 w-9 h-9 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="border-slate-800 bg-slate-900">
          Hari Ini
        </Button>
        <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="border-slate-800 bg-slate-900 w-9 h-9 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Render Days of Week
  const renderDays = () => {
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    return (
      <div className="grid grid-cols-7 mb-2 border-b border-slate-800 pb-2">
        {days.map((day, i) => (
          <div key={i} className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">
            {day}
          </div>
        ))}
      </div>
    );
  };

  // Render Calendar Cells
  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const daySchedules = initialSchedules.filter(s => isSameDay(parseISO(s.planned_date), cloneDay));
        
        days.push(
          <div
            key={day.toString()}
            className={`min-h-[100px] border border-slate-800/50 p-1 transition-colors hover:bg-slate-900/50 cursor-pointer ${
              !isSameMonth(day, monthStart) ? "bg-slate-950/30 text-slate-700" : "text-slate-200"
            } ${isToday(day) ? "bg-emerald-500/5" : ""}`}
            onClick={() => {
               setSelectedDate(cloneDay);
               if(isAdmin) setIsAddOpen(true);
            }}
          >
            <div className="flex justify-between items-start mb-1">
               <span className={`text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full ${
                 isToday(day) ? "bg-emerald-500 text-slate-950 font-bold" : ""
               }`}>
                 {formattedDate}
               </span>
            </div>
            <div className="flex flex-col gap-1 overflow-hidden">
               {daySchedules.map(s => (
                 <div 
                   key={s.id} 
                   onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSchedule(s);
                      setIsDetailOpen(true);
                   }}
                   className={`text-[9px] px-1.5 py-0.5 rounded border truncate cursor-pointer transition-all hover:brightness-125 hover:scale-[1.02] active:scale-95 ${
                     s.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                     s.status === 'missed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                     s.status === 'ongoing' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                     'bg-amber-500/10 border-amber-500/20 text-amber-400'
                   }`}
                   title={s.title}
                 >
                   {s.title}
                 </div>
               ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">{rows}</div>;
  };

  return (
    <>
      {isAdmin && (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="!max-w-[600px] bg-slate-950 border-slate-800 text-slate-100 shadow-2xl sm:rounded-2xl overflow-hidden p-0 z-[9999]">
            <div className="p-6 border-b border-slate-800 bg-slate-900/30">
              <DialogHeader>
                <DialogTitle>
                   <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <CalendarIcon className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-xl font-bold text-slate-100 tracking-tight">Buat Jadwal Maintenance</h2>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Preventive Task Planning</p>
                      </div>
                   </div>
                </DialogTitle>
              </DialogHeader>
            </div>
            <form 
              key={selectedDate.toISOString()}
              action={async (fd) => {
                 await createSchedule(fd);
                 setIsAddOpen(false);
              }} 
              className="p-6 grid gap-6"
            >
              <input type="hidden" name="unit_id" value={userUnitId || ""} />
              
              <div className="grid gap-2">
                <Label htmlFor="title" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Kegiatan / Task Utama</Label>
                <Input id="title" name="title" placeholder="Misal: Service AC Berkala atau Pengecekan Panel" className="h-11 bg-slate-900/50 border-slate-800 focus:border-amber-500/50 focus:ring-amber-500/10 transition-all" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2">
                   <Label htmlFor="facility_id" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Fasilitas Unit</Label>
                   <select name="facility_id" className="h-11 rounded-md border border-slate-800 bg-slate-900/50 px-3 text-sm outline-none focus:border-amber-500/50 focus:ring-amber-500/10 transition-all text-slate-300">
                     <option value="">Semua Fasilitas / Umum</option>
                     {facilities.map(f => (
                       <option key={f.id} value={f.id}>{f.name}</option>
                     ))}
                   </select>
                 </div>
                 <div className="grid gap-2">
                   <Label htmlFor="planned_date" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Tanggal Eksekusi</Label>
                   <Input id="planned_date" name="planned_date" type="date" defaultValue={format(selectedDate, 'yyyy-MM-dd')} className="h-11 bg-slate-900/50 border-slate-800 focus:border-amber-500/50 focus:ring-amber-500/10 transition-all" required />
                 </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description" className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Detail Pekerjaan (Scope of Work)</Label>
                <Textarea id="description" name="description" placeholder="Jelaskan detail yang perlu diperhatikan..." className="bg-slate-900/50 border-slate-800 focus:border-amber-500/50 focus:ring-amber-500/10 transition-all min-h-[100px]" />
              </div>

              <div className="pt-2">
                 <SubmitButton pendingText="Menyimpan..." className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all">
                   Simpan Jadwal Maintenance
                 </SubmitButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 px-4 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 hover:bg-slate-800">
              <Link href="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-tight">Jadwal Preventive</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mt-0.5">Planning & Maintenance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => window.print()}
               className="h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold px-4 shadow-lg transition-all active:scale-95 flex items-center gap-2 no-print"
             >
               <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Export PDF</span>
             </Button>
             {isAdmin && (
               <Button 
                 size="sm" 
                 onClick={() => setIsAddOpen(true)}
                 className="h-10 bg-slate-900 hover:bg-slate-800 border border-amber-500/20 text-amber-500 hover:text-amber-400 font-bold px-4 shadow-lg transition-all active:scale-95 flex items-center gap-2 no-print"
               >
                 <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Tambah Jadwal</span>
               </Button>
             )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Print Only Header */}
        <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
           <h1 className="text-2xl font-black uppercase">Laporan Jadwal Maintenance Preventive</h1>
           <p className="text-sm font-bold text-slate-600">Periode: {format(currentMonth, "MMMM yyyy", { locale: id })}</p>
           <p className="text-[10px] text-slate-400 mt-1">Dicetak pada: {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
        </div>

        {/* Modal Detail & Update Status */}
      {selectedSchedule && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="!max-w-[500px] bg-slate-950 border-slate-800 text-slate-100 shadow-2xl sm:rounded-2xl overflow-hidden p-0 z-[9999]">
             <div className="p-6 border-b border-slate-800 bg-slate-900/30">
                <div className="flex items-center gap-3">
                   <div className={`h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800`}>
                     <Wrench className="h-5 w-5 text-amber-500" />
                   </div>
                   <div>
                      <h2 className="text-lg font-bold text-slate-100 tracking-tight">{selectedSchedule.title}</h2>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Jadwal Maintenance</p>
                   </div>
                </div>
             </div>
             
             <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tanggal</p>
                      <p className="text-sm text-slate-200 flex items-center gap-2">
                         <CalendarIcon className="h-4 w-4 text-slate-400" />
                         {format(parseISO(selectedSchedule.planned_date), "dd MMMM yyyy", { locale: id })}
                      </p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fasilitas</p>
                      <p className="text-sm text-slate-200 flex items-center gap-2">
                         <Info className="h-4 w-4 text-slate-400" />
                         {selectedSchedule.facilities?.name || "Umum"}
                      </p>
                   </div>
                </div>

                <div className="space-y-1">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Catatan Pekerjaan</p>
                   <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800 italic">
                      {selectedSchedule.description || "Tidak ada catatan detail."}
                   </p>
                </div>

                {isAdmin && (
                  <div className="space-y-4 pt-2 border-t border-slate-800/50">
                     <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pilih Status Baru</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={async () => {
                            if (confirm("Hapus jadwal ini?")) {
                              await deleteSchedule(selectedSchedule.id);
                              setIsDetailOpen(false);
                            }
                          }}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-7 px-2 text-[10px] font-bold uppercase tracking-tight gap-1"
                        >
                           <Trash2 className="h-3 w-3" /> Hapus Jadwal
                        </Button>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        {[
                          { val: 'planned', label: 'Direncanakan', color: 'amber' },
                          { val: 'ongoing', label: 'Sedang Jalan', color: 'blue' },
                          { val: 'completed', label: 'Selesai', color: 'emerald' },
                          { val: 'missed', label: 'Terlewat', color: 'red' }
                        ].map((s) => (
                          <Button
                            key={s.val}
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await updateScheduleStatus(selectedSchedule.id, s.val);
                              setIsDetailOpen(false);
                            }}
                            className={`border-slate-800 transition-all ${
                              selectedSchedule.status === s.val 
                              ? `bg-${s.color}-500/10 border-${s.color}-500/40 text-${s.color}-400` 
                              : `hover:bg-slate-900`
                            }`}
                          >
                            <div className={`h-2 w-2 rounded-full mr-2 bg-${s.color}-500`} />
                            {s.label}
                          </Button>
                        ))}
                     </div>
                  </div>
                )}
             </div>
          </DialogContent>
        </Dialog>
      )}

        {renderNav()}
        <div className="grid gap-6 lg:grid-cols-12">
           <div className="lg:col-span-8">
              {renderDays()}
              {renderCells()}
           </div>

           {/* Side Info / Legend */}
           <div className="lg:col-span-4 space-y-6">
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-400" /> Keterangan Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                   <div className="flex items-center gap-3 text-xs text-slate-400">
                      <div className="h-3 w-3 rounded bg-amber-500" />
                      <span>Planned (Direncanakan)</span>
                   </div>
                   <div className="flex items-center gap-3 text-xs text-slate-400">
                      <div className="h-3 w-3 rounded bg-blue-500" />
                      <span>Ongoing (Sedang Jalan)</span>
                   </div>
                   <div className="flex items-center gap-3 text-xs text-slate-400">
                      <div className="h-3 w-3 rounded bg-emerald-500" />
                      <span>Completed (Selesai)</span>
                   </div>
                   <div className="flex items-center gap-3 text-xs text-slate-400">
                      <div className="h-3 w-3 rounded bg-red-500" />
                      <span>Missed (Terlewat)</span>
                   </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-400" /> Kegiatan Terdekat
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="divide-y divide-slate-800">
                      {initialSchedules
                        .filter(s => parseISO(s.planned_date) >= new Date())
                        .slice(0, 5)
                        .map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => {
                             setSelectedSchedule(s);
                             setIsDetailOpen(true);
                          }}
                          className="p-4 hover:bg-slate-800/20 transition-colors cursor-pointer group"
                        >
                           <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors">{s.title}</p>
                              <Badge variant="outline" className={`text-[9px] uppercase border-slate-700 ${
                                s.status === 'completed' ? 'text-emerald-400 border-emerald-500/20' :
                                s.status === 'ongoing' ? 'text-blue-400 border-blue-500/20' :
                                s.status === 'missed' ? 'text-red-400 border-red-500/20' :
                                'text-amber-400 border-amber-500/20'
                              }`}>{s.status}</Badge>
                           </div>
                           <p className="text-[10px] text-slate-500 flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" /> {format(parseISO(s.planned_date), "dd MMM yyyy", { locale: id })}
                           </p>
                           {s.facilities && (
                             <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
                               <Info className="h-3 w-3" /> {s.facilities.name}
                             </p>
                           )}
                        </div>
                      ))}
                      {initialSchedules.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">
                           Tidak ada jadwal mendatang.
                        </div>
                      )}
                   </div>
                </CardContent>
              </Card>
           </div>
        </div>
      </main>
    </>
  );
}

// Global Print Styles
const printStyles = `
  @media print {
    @page { size: landscape; margin: 10mm; }
    
    /* Hide Everything except the main content */
    header, .no-print, button, .lg\\:col-span-4, .sm\\:inline, .lucide {
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

    /* Expand Calendar to Full Width */
    .lg\\:col-span-8 {
      grid-column: span 12 / span 12 !important;
      width: 100% !important;
    }

    /* Force White backgrounds on containers */
    .bg-slate-950, .bg-slate-900, .bg-slate-900\\/40, .bg-slate-950\\/50 {
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

    /* Schedule Items in Print */
    .bg-emerald-500\\/10, .bg-red-500\\/10, .bg-blue-500\\/10, .bg-amber-500\\/10 {
       background: #f8fafc !important;
       border: 1px solid #94a3b8 !important;
       color: black !important;
       font-weight: bold !important;
       opacity: 1 !important;
    }

    /* Today highlight in print */
    .bg-emerald-500\\/5 {
       background: #f1f5f9 !important;
    }

    .shadow-2xl, .shadow-lg {
      shadow: none !important;
    }
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.appendChild(document.createTextNode(printStyles));
  document.head.appendChild(style);
}
