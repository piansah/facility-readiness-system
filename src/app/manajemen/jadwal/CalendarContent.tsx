"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Layers3, Plus, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/text-area";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createPoint, createPmSchedule, createSection, deletePmSchedule, updatePmScheduleStatus } from "./actions";
import { toast } from "sonner";

type Section = {
  id: string;
  unit_id: string;
  name: string;
  color: string;
  sort_order: number;
};

type Point = {
  id: string;
  unit_id: string;
  section_id: string;
  code: string;
  name: string;
  location_detail: string | null;
  frequency: string;
  facility_id: string | null;
  sort_order: number;
};

type Schedule = {
  id: string;
  unit_id: string;
  section_id: string;
  point_id: string;
  assigned_user_id: string | null;
  scheduled_date: string;
  shift: string | null;
  status: "planned" | "ongoing" | "completed" | "missed";
  notes: string | null;
  pm_sections: { name: string; color: string } | null;
  pm_points: { code: string; name: string; location_detail: string | null } | null;
  users: { full_name: string } | null;
};

type Staff = {
  id: string;
  full_name: string;
  role: string;
};

type UnitOption = {
  id: string;
  code: string;
  name: string;
};

type Facility = {
  id: string;
  name: string;
  location_detail: string | null;
};

type Props = {
  initialSchedules: Schedule[];
  sections: Section[];
  points: Point[];
  staff: Staff[];
  facilities: Facility[];
  units: UnitOption[];
  defaultUnitId: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

type Tab = "calendar" | "matrix" | "master";

export default function CalendarContent({
  initialSchedules,
  sections,
  points,
  staff,
  facilities,
  units,
  defaultUnitId,
  isAdmin,
  isSuperAdmin,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUnitId, setSelectedUnitId] = useState(defaultUnitId);
  const [selectedPointId, setSelectedPointId] = useState(points.find((point) => point.unit_id === defaultUnitId)?.id ?? "");
  const [activeTab, setActiveTab] = useState<Tab>("matrix");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isSectionOpen, setIsSectionOpen] = useState(false);
  const [isPointOpen, setIsPointOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const unit = units.find((item) => item.id === selectedUnitId) ?? units[0];
  const unitSections = sections.filter((section) => section.unit_id === selectedUnitId);
  const unitPoints = points.filter((point) => point.unit_id === selectedUnitId);
  const unitSchedules = initialSchedules.filter((schedule) => schedule.unit_id === selectedUnitId);
  const unitStaff = staff;
  const selectedPoint = unitPoints.find((point) => point.id === selectedPointId);
  const daysInMonth = getDaysInMonth(currentMonth);
  const monthKey = format(currentMonth, "yyyy-MM");

  const monthSchedules = useMemo(
    () => unitSchedules.filter((schedule) => schedule.scheduled_date.startsWith(monthKey)),
    [monthKey, unitSchedules],
  );

  function openAddSchedule(date: Date) {
    setSelectedDate(date);
    setSelectedPointId(unitPoints[0]?.id ?? "");
    if (isAdmin) setIsScheduleOpen(true);
  }

  function changeUnit(unitId: string) {
    setSelectedUnitId(unitId);
    setSelectedPointId(points.find((point) => point.unit_id === unitId)?.id ?? "");
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden h-9 w-9 p-0 text-slate-400 sm:inline-flex">
              <Link href="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Jadwal Preventive Maintenance</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                {unit?.code ?? "-"} - {format(currentMonth, "MMMM yyyy", { locale: id })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="border-slate-800 bg-slate-900">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Cetak PDF</span>
            </Button>
            {isAdmin ? (
              <Button size="sm" onClick={() => openAddSchedule(selectedDate)} className="bg-amber-600 hover:bg-amber-500">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Jadwal</span>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5">
        <section className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3 no-print">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {(["matrix", "calendar", "master"] as Tab[]).map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  variant={activeTab === tab ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className={activeTab === tab ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-800 bg-slate-950"}
                >
                  {tab === "matrix" ? "Tabel Bulanan" : tab === "calendar" ? "Kalender" : "Master PM"}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isSuperAdmin ? (
                <select
                  value={selectedUnitId}
                  onChange={(event) => changeUnit(event.target.value)}
                  className="h-9 rounded-md border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100"
                >
                  {units.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="border-slate-800 bg-slate-950">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="border-slate-800 bg-slate-950">
                Bulan Ini
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="border-slate-800 bg-slate-950">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <PrintHeader unit={unit} currentMonth={currentMonth} />

        {activeTab === "matrix" ? (
          <MonthlyMatrix
            daysInMonth={daysInMonth}
            monthKey={monthKey}
            schedules={monthSchedules}
            staff={unitStaff}
            onSelect={setSelectedSchedule}
          />
        ) : null}

        {activeTab === "calendar" ? (
          <CalendarGrid
            currentMonth={currentMonth}
            schedules={unitSchedules}
            onDayClick={openAddSchedule}
            onSelectSchedule={setSelectedSchedule}
          />
        ) : null}

        {activeTab === "master" ? (
          <MasterPanel
            unitId={selectedUnitId}
            sections={unitSections}
            points={unitPoints}
            facilities={facilities}
            isAdmin={isAdmin}
            onAddSection={() => setIsSectionOpen(true)}
            onAddPoint={() => setIsPointOpen(true)}
          />
        ) : null}

        <Legend sections={unitSections} points={unitPoints} />
      </main>

      <ScheduleDialog
        open={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
        unitId={selectedUnitId}
        selectedDate={selectedDate}
        sections={unitSections}
        points={unitPoints}
        staff={unitStaff}
        selectedPointId={selectedPointId}
        selectedSectionId={selectedPoint?.section_id ?? ""}
        setSelectedPointId={setSelectedPointId}
      />

      <SectionDialog open={isSectionOpen} onOpenChange={setIsSectionOpen} unitId={selectedUnitId} />
      <PointDialog
        open={isPointOpen}
        onOpenChange={setIsPointOpen}
        unitId={selectedUnitId}
        sections={unitSections}
        facilities={facilities}
      />

      {selectedSchedule ? (
        <Dialog open={Boolean(selectedSchedule)} onOpenChange={(open) => !open && setSelectedSchedule(null)}>
          <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>{selectedSchedule.pm_points?.code} - {selectedSchedule.pm_points?.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 text-sm text-slate-300">
              <p>Tanggal: {format(parseISO(selectedSchedule.scheduled_date), "dd MMMM yyyy", { locale: id })}</p>
              <p>Bagian: {selectedSchedule.pm_sections?.name ?? "-"}</p>
              <p>Petugas: {selectedSchedule.users?.full_name ?? "Belum ditentukan"}</p>
              <p>Shift: {selectedSchedule.shift ?? "-"}</p>
              {selectedSchedule.notes ? <p>Catatan: {selectedSchedule.notes}</p> : null}
              {isAdmin ? (
                <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
                  {["planned", "ongoing", "completed", "missed"].map((status) => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      className="border-slate-800 bg-slate-900"
                      onClick={async () => {
                        await updatePmScheduleStatus(selectedSchedule.id, status);
                        setSelectedSchedule(null);
                      }}
                    >
                      {statusLabel(status)}
                    </Button>
                  ))}
                  <Button variant="destructive" size="sm" className="col-span-2" onClick={() => setIsDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4" />
                    Hapus Jadwal
                  </Button>
                </div>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedSchedule ? (
        <ConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={async () => {
            setIsDeletePending(true);
            try {
              await deletePmSchedule(selectedSchedule.id);
              setIsDeleteOpen(false);
              setSelectedSchedule(null);
              toast.success("Jadwal berhasil dihapus");
            } catch {
              toast.error("Gagal menghapus jadwal");
            } finally {
              setIsDeletePending(false);
            }
          }}
          title="Hapus Jadwal PM"
          description={`Hapus jadwal ${selectedSchedule.pm_points?.code ?? ""} pada ${selectedSchedule.scheduled_date}?`}
          confirmText="Hapus"
          variant="destructive"
          isPending={isDeletePending}
        />
      ) : null}
    </>
  );
}

function PrintHeader({ unit, currentMonth }: { unit?: UnitOption; currentMonth: Date }) {
  return (
    <div className="hidden print:block text-center">
      <h1 className="text-sm font-black uppercase">Jadwal Preventive Maintenance Unit {unit?.name ?? "-"}</h1>
      <p className="text-xs font-bold uppercase">Bandara Internasional Jawa Barat</p>
      <p className="text-xs font-bold uppercase">{format(currentMonth, "MMMM yyyy", { locale: id })}</p>
    </div>
  );
}

function MonthlyMatrix({
  daysInMonth,
  monthKey,
  schedules,
  staff,
  onSelect,
}: {
  daysInMonth: number;
  monthKey: string;
  schedules: Schedule[];
  staff: Staff[];
  onSelect: (schedule: Schedule) => void;
}) {
  const rows = staff.length ? staff : [{ id: "__empty__", full_name: "Belum ada petugas", role: "" }];

  return (
    <Card className="overflow-hidden border-slate-800 bg-slate-900/40 print:border-black print:bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-xs print:text-[8px]">
          <thead>
            <tr className="bg-emerald-900/40 print:bg-lime-200">
              <th className="w-12 border border-slate-800 px-2 py-2 print:border-black">No</th>
              <th className="w-52 border border-slate-800 px-2 py-2 text-left print:border-black">Nama</th>
              {Array.from({ length: daysInMonth }, (_, index) => {
                const date = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
                return (
                  <th key={date} className="w-9 border border-slate-800 px-1 py-2 text-center print:border-black">
                    <span className="block">{format(parseISO(date), "EEE", { locale: id }).slice(0, 2).toUpperCase()}</span>
                    <span className="block">{index + 1}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((person, index) => (
              <tr key={person.id} className="odd:bg-slate-950/30 print:bg-white">
                <td className="border border-slate-800 px-2 py-2 text-center print:border-black">{index + 1}</td>
                <td className="border border-slate-800 px-2 py-2 font-semibold text-slate-100 print:border-black print:text-black">
                  {person.full_name}
                </td>
                {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                  const date = `${monthKey}-${String(dayIndex + 1).padStart(2, "0")}`;
                  const cellSchedules = schedules.filter(
                    (schedule) => schedule.scheduled_date === date && schedule.assigned_user_id === person.id,
                  );
                  return (
                    <td key={date} className="border border-slate-800 p-1 align-top print:border-black">
                      <div className="grid gap-1">
                        {cellSchedules.map((schedule) => (
                          <button
                            key={schedule.id}
                            type="button"
                            onClick={() => onSelect(schedule)}
                            className={`${sectionTone(schedule.pm_sections?.color)} rounded px-1 py-0.5 text-center text-[10px] font-black print:border print:border-black print:bg-white print:text-black`}
                            title={schedule.pm_points?.name ?? ""}
                          >
                            {schedule.pm_points?.code ?? "-"}
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CalendarGrid({
  currentMonth,
  schedules,
  onDayClick,
  onSelectSchedule,
}: {
  currentMonth: Date;
  schedules: Schedule[];
  onDayClick: (date: Date) => void;
  onSelectSchedule: (schedule: Schedule) => void;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let index = 0; index < 7; index += 1) {
      const cloneDay = day;
      const daySchedules = schedules.filter((schedule) => isSameDay(parseISO(schedule.scheduled_date), cloneDay));
      days.push(
        <button
          key={day.toString()}
          type="button"
          onClick={() => onDayClick(cloneDay)}
          className={`min-h-28 border border-slate-800/70 p-2 text-left transition hover:bg-slate-900 ${
            !isSameMonth(day, monthStart) ? "bg-slate-950/30 text-slate-700" : "text-slate-200"
          } ${isToday(day) ? "bg-emerald-500/5" : ""}`}
        >
          <span className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday(day) ? "bg-emerald-500 font-bold text-slate-950" : ""}`}>
            {format(day, "d")}
          </span>
          <span className="grid gap-1">
            {daySchedules.map((schedule) => (
              <span
                key={schedule.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectSchedule(schedule);
                }}
                className={`${sectionTone(schedule.pm_sections?.color)} truncate rounded px-1.5 py-0.5 text-[10px] font-semibold`}
              >
                {schedule.pm_points?.code} {schedule.users?.full_name ?? ""}
              </span>
            ))}
          </span>
        </button>,
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>,
    );
    days = [];
  }

  return (
    <Card className="overflow-hidden border-slate-800 bg-slate-950">
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900 text-center text-xs font-bold uppercase text-slate-500">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((dayName) => (
          <div key={dayName} className="p-2">{dayName}</div>
        ))}
      </div>
      {rows}
    </Card>
  );
}

function MasterPanel({
  unitId,
  sections,
  points,
  facilities,
  isAdmin,
  onAddSection,
  onAddPoint,
}: {
  unitId: string;
  sections: Section[];
  points: Point[];
  facilities: Facility[];
  isAdmin: boolean;
  onAddSection: () => void;
  onAddPoint: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 no-print">
      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Bagian PM</CardTitle>
            <CardDescription>Section dinamis per unit.</CardDescription>
          </div>
          {isAdmin ? <Button size="sm" onClick={onAddSection}><Plus className="h-4 w-4" /> Bagian</Button> : null}
        </CardHeader>
        <CardContent className="grid gap-2">
          {sections.map((section) => (
            <div key={section.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950 p-3">
              <span className="font-semibold text-slate-100">{section.name}</span>
              <span className={`${sectionTone(section.color)} rounded px-2 py-1 text-xs font-bold`}>{section.color}</span>
            </div>
          ))}
          {!sections.length ? <p className="text-sm text-slate-500">Belum ada bagian PM untuk unit ini.</p> : null}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Kode / Titik PM</CardTitle>
            <CardDescription>{points.length} titik terdaftar.</CardDescription>
          </div>
          {isAdmin ? <Button size="sm" onClick={onAddPoint} disabled={!sections.length}><Plus className="h-4 w-4" /> Titik</Button> : null}
        </CardHeader>
        <CardContent className="max-h-[460px] overflow-auto">
          <div className="grid gap-2">
            {points.map((point) => {
              const section = sections.find((item) => item.id === point.section_id);
              const facility = facilities.find((item) => item.id === point.facility_id);
              return (
                <div key={point.id} className="rounded-md border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-100">{point.code} - {point.name}</p>
                    <span className={`${sectionTone(section?.color)} rounded px-2 py-1 text-[10px] font-bold`}>{section?.name ?? "-"}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{point.location_detail || facility?.location_detail || "Tanpa lokasi detail"}</p>
                </div>
              );
            })}
            {!points.length ? <p className="text-sm text-slate-500">Belum ada kode/titik PM.</p> : null}
          </div>
          <input type="hidden" value={unitId} readOnly />
        </CardContent>
      </Card>
    </div>
  );
}

function Legend({ sections, points }: { sections: Section[]; points: Point[] }) {
  return (
    <section className="grid gap-3 print:grid-cols-3">
      {sections.map((section) => {
        const sectionPoints = points.filter((point) => point.section_id === section.id);
        return (
          <Card key={section.id} className="border-slate-800 bg-slate-900/40 print:border-black print:bg-white">
            <CardHeader className="py-3">
              <CardTitle className="flex items-center gap-2 text-sm print:text-black">
                <Layers3 className="h-4 w-4 no-print" />
                {section.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1 text-xs">
              {sectionPoints.map((point) => (
                <div key={point.id} className="grid grid-cols-[64px_1fr] gap-2 rounded border border-slate-800 px-2 py-1 print:border-black">
                  <span className="font-black text-slate-100 print:text-black">{point.code}</span>
                  <span className="text-slate-400 print:text-black">{point.name}</span>
                </div>
              ))}
              {!sectionPoints.length ? <p className="text-slate-500">Belum ada titik.</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  unitId,
  selectedDate,
  sections,
  points,
  staff,
  selectedPointId,
  selectedSectionId,
  setSelectedPointId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  selectedDate: Date;
  sections: Section[];
  points: Point[];
  staff: Staff[];
  selectedPointId: string;
  selectedSectionId: string;
  setSelectedPointId: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle>Buat Jadwal PM</DialogTitle>
        </DialogHeader>
        <form action={async (formData) => { await createPmSchedule(formData); onOpenChange(false); }} className="grid gap-4">
          <input type="hidden" name="unit_id" value={unitId} />
          <input type="hidden" name="section_id" value={selectedSectionId} />
          <div className="grid gap-2">
            <Label>Titik PM</Label>
            <select name="point_id" value={selectedPointId} onChange={(event) => setSelectedPointId(event.target.value)} required className="h-11 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm">
              {sections.length === 0 ? <option value="">Buat bagian PM dulu</option> : null}
              {points.map((point) => (
                <option key={point.id} value={point.id}>{point.code} - {point.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tanggal</Label>
              <Input name="scheduled_date" type="date" defaultValue={format(selectedDate, "yyyy-MM-dd")} required />
            </div>
            <div className="grid gap-2">
              <Label>Shift</Label>
              <select name="shift" className="h-11 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm">
                <option value="">Tidak spesifik</option>
                <option value="pagi">Pagi</option>
                <option value="malam">Malam</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Petugas</Label>
            <select name="assigned_user_id" className="h-11 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm">
              <option value="">Belum ditentukan</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>{person.full_name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Catatan</Label>
            <Textarea name="notes" placeholder="Opsional" />
          </div>
          <SubmitButton pendingText="Menyimpan..." disabled={!points.length}>Simpan Jadwal</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionDialog({ open, onOpenChange, unitId }: { open: boolean; onOpenChange: (open: boolean) => void; unitId: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
        <DialogHeader><DialogTitle>Tambah Bagian PM</DialogTitle></DialogHeader>
        <form action={async (formData) => { await createSection(formData); onOpenChange(false); }} className="grid gap-4">
          <input type="hidden" name="unit_id" value={unitId} />
          <div className="grid gap-2"><Label>Nama Bagian</Label><Input name="name" placeholder="Contoh: SCP" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Warna</Label>
              <select name="color" className="h-11 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm">
                <option value="emerald">Hijau</option>
                <option value="amber">Kuning</option>
                <option value="blue">Biru</option>
                <option value="rose">Merah</option>
                <option value="purple">Ungu</option>
              </select>
            </div>
            <div className="grid gap-2"><Label>Urutan</Label><Input name="sort_order" type="number" defaultValue="0" /></div>
          </div>
          <SubmitButton pendingText="Menyimpan...">Simpan Bagian</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PointDialog({
  open,
  onOpenChange,
  unitId,
  sections,
  facilities,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  sections: Section[];
  facilities: Facility[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-950 text-slate-100">
        <DialogHeader><DialogTitle>Tambah Kode / Titik PM</DialogTitle></DialogHeader>
        <form action={async (formData) => { await createPoint(formData); onOpenChange(false); }} className="grid gap-4">
          <input type="hidden" name="unit_id" value={unitId} />
          <div className="grid gap-2">
            <Label>Bagian</Label>
            <select name="section_id" required className="h-11 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm">
              {sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label>Kode</Label><Input name="code" placeholder="A / 1.1.1 / FD 1.1.1" required /></div>
            <div className="grid gap-2">
              <Label>Frekuensi</Label>
              <select name="frequency" className="h-11 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm">
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
              </select>
            </div>
          </div>
          <div className="grid gap-2"><Label>Nama Titik</Label><Input name="name" placeholder="Contoh: SCP Inter Line 1" required /></div>
          <div className="grid gap-2"><Label>Lokasi Detail</Label><Textarea name="location_detail" placeholder="Opsional" /></div>
          <div className="grid gap-2">
            <Label>Relasi Fasilitas</Label>
            <select name="facility_id" className="h-11 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm">
              <option value="">Tidak spesifik</option>
              {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
            </select>
          </div>
          <div className="grid gap-2"><Label>Urutan</Label><Input name="sort_order" type="number" defaultValue="0" /></div>
          <SubmitButton pendingText="Menyimpan...">Simpan Titik PM</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    planned: "Direncanakan",
    ongoing: "Progres",
    completed: "Selesai",
    missed: "Terlewat",
  };
  return labels[status] ?? status;
}

function sectionTone(color?: string | null) {
  const tones: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    purple: "border-purple-500/30 bg-purple-500/10 text-purple-300",
  };
  return tones[color ?? "amber"] ?? tones.amber;
}
