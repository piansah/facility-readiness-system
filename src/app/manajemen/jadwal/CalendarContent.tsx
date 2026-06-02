"use client";

import { useMemo, useRef, useState } from "react";
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
  isWeekend,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Layers3, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/text-area";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { createPmScheduleQuick, createPoint, createPmSchedule, createSection, deletePmScheduleQuick } from "./actions";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
type MatrixCell = {
  sectionId: string;
  sectionName: string;
  shift: string;
  shiftCode: string;
  date: string;
} | null;

const SHIFT_CODE_LABELS: Record<string, string> = {
  pagi: "APBA",
  malam: "APBB",
};

const DEFAULT_MATRIX_SHIFTS = [
  { id: "pagi", code: SHIFT_CODE_LABELS.pagi },
  { id: "malam", code: SHIFT_CODE_LABELS.malam },
];

function normalizeSchedule(schedule: any): Schedule {
  return {
    ...schedule,
    pm_sections: Array.isArray(schedule.pm_sections) ? (schedule.pm_sections[0] ?? null) : schedule.pm_sections,
    pm_points: Array.isArray(schedule.pm_points) ? (schedule.pm_points[0] ?? null) : schedule.pm_points,
    users: Array.isArray(schedule.users) ? (schedule.users[0] ?? null) : schedule.users,
  };
}

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
  const [selectedCell, setSelectedCell] = useState<MatrixCell>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [localSchedules, setLocalSchedules] = useState<Schedule[]>(initialSchedules);

  const unit = units.find((item) => item.id === selectedUnitId) ?? units[0];
  const unitSections = sections.filter((section) => section.unit_id === selectedUnitId);
  const unitPoints = points.filter((point) => point.unit_id === selectedUnitId);
  const unitSchedules = localSchedules.filter((schedule) => schedule.unit_id === selectedUnitId);
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

  const [isPrinting, setIsPrinting] = useState(false);

  async function generateSchedulePdf() {
    setIsPrinting(true);
    try {
      const { default: jsPDFLib } = await import("jspdf");
      const { default: autoTableLib } = await import("jspdf-autotable");

      const doc = new jsPDFLib({ orientation: "landscape", unit: "mm", format: "a3" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const leftMargin = 10;
      const rightMargin = 10;
      const contentWidth = pageWidth - leftMargin - rightMargin;

      // ── HEADER ──────────────────────────────────────────────────────────────────
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("JADWAL PREVENTIVE MAINTENANCE", pageWidth / 2, 14, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Unit : ${unit?.code ?? "-"} - ${unit?.name ?? "-"}`, pageWidth / 2, 20, { align: "center" });

      const monthLabel = format(currentMonth, "MMMM yyyy", { locale: id }).toUpperCase();
      doc.text(`Periode : ${monthLabel}`, pageWidth / 2, 25, { align: "center" });

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, 28, pageWidth - rightMargin, 28);

      // ── MATRIKS TABEL ───────────────────────────────────────────────────────────
      // Header kolom: ["Bagian", "Shift", 1, 2, ..., daysInMonth]
      const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
      const head = [["BAGIAN PM", "SHIFT", ...dayNumbers]];

      // Body rows: per section × shift
      const body: (string | { content: string; styles?: object })[][] = [];

      const SHIFT_LABELS: Record<string, string> = { pagi: "APBA", malam: "APBB" };
      const DEFAULT_SHIFTS = ["pagi", "malam"];

      for (const section of unitSections) {
        const sectionSchedules = monthSchedules.filter((s) => s.section_id === section.id);

        // Collect shifts that appear + default shifts
        const shiftSet = new Set<string>(DEFAULT_SHIFTS);
        sectionSchedules.forEach((s) => { if (s.shift) shiftSet.add(s.shift); });
        const shiftList = [...shiftSet];

        shiftList.forEach((shift, shiftIdx) => {
          const shiftCode = SHIFT_LABELS[shift] ?? shift.toUpperCase();
          const cells: string[] = dayNumbers.map((dayStr) => {
            const date = `${monthKey}-${dayStr.padStart(2, "0")}`;
            const found = sectionSchedules.find(
              (s) => s.scheduled_date === date && (s.shift ?? "pagi") === shift
            );
            return found?.pm_points?.code ?? "";
          });

          if (shiftIdx === 0) {
            body.push([section.name, shiftCode, ...cells]);
          } else {
            body.push(["", shiftCode, ...cells]);
          }
        });
      }

      // Lebar kolom: Bagian=35mm, Shift=18mm, sisa dibagi rata untuk tanggal
      const fixedWidth = 35 + 18;
      const dayColWidth = (contentWidth - fixedWidth) / daysInMonth;

      autoTableLib(doc, {
        startY: 31,
        head,
        body,
        theme: "grid",
        headStyles: {
          fillColor: [22, 163, 74],  // emerald-600
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
          fontSize: 7,
          cellPadding: 1.5,
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 1.5,
          overflow: "hidden",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: "bold" },
          1: { cellWidth: 18, halign: "center", fontStyle: "bold" },
          ...Object.fromEntries(
            dayNumbers.map((_, i) => [i + 2, { cellWidth: dayColWidth, halign: "center" }])
          ),
        },
        // Merge section name cells (rowSpan simulation via empty string + same row)
        didDrawCell: (data) => {
          // Highlight weekend columns (Sat=col index 7, Sun=col index 1, relative to month)
          if (data.column.index >= 2) {
            const dayNum = data.column.index - 1; // 1-indexed day
            const dateVal = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
            const dow = dateVal.getDay(); // 0=Sun, 6=Sat
            if (dow === 0 || dow === 6) {
              doc.setFillColor(254, 226, 226); // red-100
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
              // Redraw text on top
              if (data.cell.text.length > 0) {
                doc.setFontSize(6.5);
                doc.setTextColor(data.row.index === -1 ? 255 : 185, data.row.index === -1 ? 255 : 28, data.row.index === -1 ? 255 : 28);
                doc.text(data.cell.text, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: "center" });
                doc.setTextColor(0, 0, 0);
              }
            }
          }
        },
        margin: { left: leftMargin, right: rightMargin },
      });

      // ── SECTION TABLES (Keterangan per Bagian PM) ──────────────────────────────
      const afterTableY = (doc as any).lastAutoTable?.finalY ?? 160;
      let currentY = afterTableY + 6;

      // Helper: hex color → [r, g, b]
      function hexToRgb(hex: string): [number, number, number] {
        const clean = hex.replace(/^#/, "");
        if (clean.length === 3) {
          const r = parseInt(clean[0] + clean[0], 16);
          const g = parseInt(clean[1] + clean[1], 16);
          const b = parseInt(clean[2] + clean[2], 16);
          return [r, g, b];
        }
        return [
          parseInt(clean.substring(0, 2), 16),
          parseInt(clean.substring(2, 4), 16),
          parseInt(clean.substring(4, 6), 16),
        ];
      }

      for (const section of unitSections) {
        const pointsInSection = unitPoints.filter(p => p.section_id === section.id);
        if (!pointsInSection.length) continue;

        // Check page space — add new page if needed
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = 15;
        }

        // Section color
        const sectionRgb = hexToRgb(section.color || "#4a5568");

        // Table: Kode | Nama | Lokasi
        const secHead = [[section.name, "", ""]];
        const secBody = pointsInSection.map(p => [
          p.code,
          p.name,
          p.location_detail ?? "-",
        ]);

        autoTableLib(doc, {
          startY: currentY,
          head: secHead,
          body: secBody,
          theme: "grid",
          headStyles: {
            fillColor: sectionRgb,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "left",
            fontSize: 8,
            cellPadding: 2,
          },
          styles: {
            fontSize: 7,
            cellPadding: 1.5,
            valign: "middle",
          },
          columnStyles: {
            0: { cellWidth: 30, fontStyle: "bold" },
            1: { cellWidth: 80 },
            2: { cellWidth: 60 },
          },
          margin: { left: leftMargin, right: rightMargin },
        });

        currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 4;
      }

      // ── TANDA TANGAN ────────────────────────────────────────────────────────────
      const signY = pageHeight - 38;
      const prevMonth = format(subMonths(currentMonth, 1), "MMMM yyyy", { locale: id });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      // Right side only (menyetujui)
      const signX = pageWidth - rightMargin - 60;
      doc.text(`Kertajati, ${prevMonth}`, signX, signY, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text("Menyetujui,", signX, signY + 5, { align: "center" });
      doc.text("Pgs. Ass.Man. OF ELECTRONIC FACILITY & IT", signX, signY + 10, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text("", signX, signY + 28, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.text("DWI EKA HARDIANTA", signX, signY + 32, { align: "center" });
      // underline
      const nameText = "DWI EKA HARDIANTA";
      const nameW = doc.getTextWidth(nameText);
      doc.line(signX - nameW / 2, signY + 33, signX + nameW / 2, signY + 33);

      const filename = `Jadwal_PM_${unit?.code ?? "Unit"}_${format(currentMonth, "MMMM_yyyy", { locale: id })}.pdf`.replace(/\s+/g, "_");
      doc.save(filename);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setIsPrinting(false);
    }
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
            <Button
              variant="outline"
              size="sm"
              onClick={generateSchedulePdf}
              disabled={isPrinting}
              className="border-slate-800 bg-slate-900 hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">{isPrinting ? "Menyiapkan..." : "Cetak PDF"}</span>
            </Button>
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
            </div>
          </div>
        </section>

        <PrintHeader unit={unit} currentMonth={currentMonth} />

        {activeTab === "matrix" ? (
          <div className="print:hidden">
            <MonthlyMatrix
              daysInMonth={daysInMonth}
              currentMonth={currentMonth}
              monthKey={monthKey}
              schedules={monthSchedules}
              sections={unitSections}
              points={unitPoints}
              unitId={selectedUnitId}
              isAdmin={isAdmin}
              onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
              onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
              onSelect={setSelectedSchedule}
              onCellSelect={setSelectedCell}
            />
          </div>
        ) : null}

        {activeTab === "calendar" ? (
          <div className="print:hidden">
            <CalendarGrid
              currentMonth={currentMonth}
              schedules={unitSchedules}
              sections={unitSections}
              points={unitPoints}
              onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
              onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
            />
          </div>
        ) : null}

        {activeTab === "master" ? (
          <div className="print:hidden">
            <MasterPanel
              unitId={selectedUnitId}
              sections={unitSections}
              points={unitPoints}
              facilities={facilities}
              isAdmin={isAdmin}
              onAddSection={() => setIsSectionOpen(true)}
              onAddPoint={() => setIsPointOpen(true)}
            />
          </div>
        ) : null}

        {/* Print-Only Monthly Matrix */}
        <div className="hidden print:block">
          <MonthlyMatrix
            daysInMonth={daysInMonth}
            currentMonth={currentMonth}
            monthKey={monthKey}
            schedules={monthSchedules}
            sections={unitSections}
            points={unitPoints}
            unitId={selectedUnitId}
            isAdmin={false}
            onPrevMonth={() => {}}
            onNextMonth={() => {}}
            onSelect={() => {}}
            onCellSelect={() => {}}
          />
        </div>

        <Legend sections={unitSections} points={unitPoints} />

        {/* Print-Only Signature Block */}
        <div className="hidden print:block mt-8 w-full">
          <div className="flex justify-end">
            <div className="text-center text-xs print:text-black mr-8">
              <p className="mb-1">Kertajati, {format(subMonths(currentMonth, 1), "MMMM yyyy", { locale: id })}</p>
              <p className="font-bold">Menyetujui,</p>
              <p className="font-bold mb-16">Pgs. Ass.Man. OF ELECTRONIC FACILITY & IT</p>
              <p className="font-bold underline uppercase">DWI EKA HARDIANTA</p>
            </div>
          </div>
        </div>
      </main>

      {selectedCell ? (
        <Dialog open={Boolean(selectedCell)} onOpenChange={(open) => !open && setSelectedCell(null)}>
          <DialogContent className="max-w-md border-slate-800 bg-slate-950 text-slate-100">
            <DialogHeader>
              <DialogTitle>{selectedCell.sectionName} - {selectedCell.shiftCode}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <p className="text-xs font-bold uppercase text-slate-500">
                {format(parseISO(selectedCell.date), "dd MMMM yyyy", { locale: id })}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {unitPoints
                  .filter((point) => point.section_id === selectedCell.sectionId)
                  .map((point) => {
                    const existingSchedule = monthSchedules.find(
                      (schedule) =>
                        schedule.section_id === selectedCell.sectionId &&
                        schedule.point_id === point.id &&
                        schedule.scheduled_date === selectedCell.date &&
                        schedule.shift === selectedCell.shift,
                    );
                    const cellSchedules = monthSchedules.filter(
                      (schedule) =>
                        schedule.section_id === selectedCell.sectionId &&
                        schedule.scheduled_date === selectedCell.date &&
                        schedule.shift === selectedCell.shift,
                    );
                    return (
                      <Button
                        key={point.id}
                        type="button"
                        variant={existingSchedule ? "default" : "outline"}
                        className={existingSchedule ? "justify-start bg-emerald-600 hover:bg-emerald-500" : "justify-start border-slate-800 bg-slate-900"}
                        onClick={async () => {
                          const section = unitSections.find((item) => item.id === selectedCell.sectionId);
                          if (!section) return;

                          if (existingSchedule) {
                            setLocalSchedules((current) => current.filter((schedule) => !cellSchedules.some((cellSchedule) => cellSchedule.id === schedule.id)));
                            setSelectedCell(null);
                            try {
                              await Promise.all(cellSchedules.map((schedule) => deletePmScheduleQuick(schedule.id)));
                            } catch {
                              setLocalSchedules((current) => [...current, ...cellSchedules]);
                              toast.error("Gagal menghapus jadwal PM");
                            }
                            return;
                          }

                          const tempId = `temp-${selectedCell.sectionId}-${point.id}-${selectedCell.date}-${selectedCell.shift}-${Date.now()}`;
                          const replacedSchedules = cellSchedules.filter((schedule) => schedule.point_id !== point.id);
                          const optimisticSchedule: Schedule = {
                            id: tempId,
                            unit_id: selectedUnitId,
                            section_id: selectedCell.sectionId,
                            point_id: point.id,
                            assigned_user_id: null,
                            scheduled_date: selectedCell.date,
                            shift: selectedCell.shift,
                            status: "planned",
                            notes: null,
                            pm_sections: { name: section.name, color: section.color },
                            pm_points: { code: point.code, name: point.name, location_detail: point.location_detail },
                            users: null,
                          };
                          setLocalSchedules((current) => [
                            ...current.filter(
                              (schedule) =>
                                !cellSchedules.some((cellSchedule) => cellSchedule.id === schedule.id) &&
                                !(schedule.id.startsWith("temp-") && schedule.section_id === selectedCell.sectionId && schedule.scheduled_date === selectedCell.date && schedule.shift === selectedCell.shift),
                            ),
                            optimisticSchedule,
                          ]);
                          setSelectedCell(null);

                          try {
                            await Promise.all(replacedSchedules.map((schedule) => deletePmScheduleQuick(schedule.id)));
                            const savedSchedule = await createPmScheduleQuick({
                              unitId: selectedUnitId,
                              sectionId: selectedCell.sectionId,
                              pointId: point.id,
                              scheduledDate: selectedCell.date,
                              shift: selectedCell.shift,
                            });
                            setLocalSchedules((current) =>
                              current.map((schedule) => (schedule.id === tempId ? normalizeSchedule(savedSchedule) : schedule)),
                            );
                          } catch {
                            setLocalSchedules((current) => [
                              ...current.filter((schedule) => schedule.id !== tempId),
                              ...replacedSchedules,
                            ]);
                            toast.error("Gagal menambahkan jadwal PM");
                          }
                        }}
                      >
                        {point.code}
                      </Button>
                    );
                  })}
              </div>
              {!unitPoints.some((point) => point.section_id === selectedCell.sectionId) ? (
                <p className="text-sm text-slate-500">Belum ada titik PM untuk bagian ini.</p>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <SectionDialog open={isSectionOpen} onOpenChange={setIsSectionOpen} unitId={selectedUnitId} />
      <PointDialog
        open={isPointOpen}
        onOpenChange={setIsPointOpen}
        unitId={selectedUnitId}
        sections={unitSections}
        facilities={facilities}
      />

      {selectedSchedule ? (
        <ConfirmDialog
          isOpen={Boolean(selectedSchedule)}
          onClose={() => {
            setIsDeleteOpen(false);
            setSelectedSchedule(null);
          }}
          onConfirm={async () => {
            const scheduleToDelete = selectedSchedule;
            setIsDeletePending(true);
            setLocalSchedules((current) => current.filter((schedule) => schedule.id !== scheduleToDelete.id));
            try {
              await deletePmScheduleQuick(scheduleToDelete.id);
              setIsDeleteOpen(false);
              setSelectedSchedule(null);
              toast.success("Jadwal berhasil dihapus");
            } catch {
              setLocalSchedules((current) => [...current, scheduleToDelete]);
              toast.error("Gagal menghapus jadwal");
            } finally {
              setIsDeletePending(false);
            }
          }}
          title="Hapus Jadwal PM"
          description={`Hapus ${selectedSchedule.pm_points?.code ?? ""} pada ${format(parseISO(selectedSchedule.scheduled_date), "dd MMMM yyyy", { locale: id })}?`}
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
  currentMonth,
  monthKey,
  schedules,
  sections,
  points,
  unitId,
  isAdmin,
  onPrevMonth,
  onNextMonth,
  onSelect,
  onCellSelect,
}: {
  daysInMonth: number;
  currentMonth: Date;
  monthKey: string;
  schedules: Schedule[];
  sections: Section[];
  points: Point[];
  unitId: string;
  isAdmin: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelect: (schedule: Schedule) => void;
  onCellSelect: (cell: MatrixCell) => void;
}) {
  const getShiftCode = (shift: string | null) => {
    if (!shift) return "Belum ditentukan";
    return SHIFT_CODE_LABELS[shift.toLowerCase()] ?? shift.toUpperCase();
  };

  const groupedRows = sections.map((section) => {
    const sectionSchedules = schedules.filter((schedule) => schedule.section_id === section.id);
    const scheduledShiftRows = Array.from(
      new Map(
        sectionSchedules.map((schedule) => [
          schedule.shift ?? "__unassigned__",
          {
            id: schedule.shift ?? "__unassigned__",
            code: getShiftCode(schedule.shift),
          },
        ]),
      ).values(),
    );
    const defaultShiftIds = new Set(DEFAULT_MATRIX_SHIFTS.map((shift) => shift.id));
    const extraShiftRows = scheduledShiftRows.filter((shift) => !defaultShiftIds.has(shift.id));
    const shiftRows = [...DEFAULT_MATRIX_SHIFTS, ...extraShiftRows];

    return {
      section,
      rows: shiftRows,
    };
  });

  const displayGroups = groupedRows.length
    ? groupedRows
    : [{ section: { id: "__empty__", name: "Belum ada bagian PM", color: "amber", unit_id: "", sort_order: 0 }, rows: [{ id: "__empty__", code: "" }] }];
  const pointCountBySection = new Map<string, number>();
  points.forEach((point) => {
    pointCountBySection.set(point.section_id, (pointCountBySection.get(point.section_id) ?? 0) + 1);
  });

  return (
    <Card className="overflow-hidden rounded-xl border-slate-800 bg-slate-950 shadow-2xl print:border-black print:bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-4 py-4 print:hidden">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold capitalize text-slate-100">{format(currentMonth, "MMMM yyyy", { locale: id })}</h2>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={onPrevMonth} className="h-10 w-10 border-slate-800 bg-slate-950 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onNextMonth} className="h-10 w-10 border-slate-800 bg-slate-950 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="hidden rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-[10px] font-bold text-slate-500 md:block">
          Klik sel tanggal lalu pilih kode titik PM
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-xs print:text-[8px]">
          <thead>
            <tr className="border-b border-slate-800 print:bg-lime-200">
              <th className="sticky left-0 z-20 min-w-[150px] border-r border-slate-800 bg-slate-950 p-3 text-left text-[10px] font-bold uppercase text-slate-500 print:static print:border-black print:bg-lime-200 print:text-black">
                <span className="print:hidden">PM</span>
                <span className="hidden print:inline">NIK</span>
              </th>
              <th className="min-w-[92px] border-r border-slate-800 bg-slate-950 p-3 text-left text-[10px] font-bold uppercase text-slate-500 print:border-black print:bg-lime-200 print:text-black">
                <span className="print:hidden">Code Shift</span>
                <span className="hidden print:inline">NAMA</span>
              </th>
              {Array.from({ length: daysInMonth }, (_, index) => {
                const date = `${monthKey}-${String(index + 1).padStart(2, "0")}`;
                const dateValue = parseISO(date);
                const isCurrentDay = isToday(dateValue);
                const weekend = isWeekend(dateValue);
                return (
                  <th
                    key={date}
                    className={`min-w-[35px] border-r border-slate-800 p-2 text-center text-[10px] font-bold print:border-black ${
                      isCurrentDay
                        ? "bg-blue-500/20 text-blue-400 ring-1 ring-inset ring-blue-500/50"
                        : weekend
                          ? "bg-red-500/5 text-red-400"
                          : "text-slate-500"
                    }`}
                  >
                    <div>{format(dateValue, "EE", { locale: id })}</div>
                    <div className={`text-xs ${isCurrentDay ? "text-blue-400" : "text-slate-300"}`}>{format(dateValue, "dd")}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayGroups.map((group) =>
              group.rows.map((shift, shiftIndex) => {
                return (
                  <tr key={`${group.section.id}-${shift.id}`} className="border-b border-slate-800 transition-colors hover:bg-slate-900/30 print:bg-white">
                    {shiftIndex === 0 ? (
                      <td
                        rowSpan={group.rows.length}
                        className="sticky left-0 z-10 border-r border-slate-800 bg-slate-950 p-3 align-middle font-bold uppercase text-slate-100 print:static print:border-black print:bg-white print:text-black"
                      >
                        {group.section.name}
                      </td>
                    ) : null}
                    <td className="border-r border-slate-800 p-3 font-semibold text-slate-100 print:border-black print:text-black">
                      {shift.code}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                      const date = `${monthKey}-${String(dayIndex + 1).padStart(2, "0")}`;
                      const cellSchedules = schedules.filter(
                        (schedule) =>
                          schedule.section_id === group.section.id &&
                          schedule.scheduled_date === date &&
                          (schedule.shift ?? "__unassigned__") === shift.id,
                      );
                      const visibleSchedule = cellSchedules[0];
                      return (
                        <td
                          key={date}
                          className={`border-r border-slate-800 p-1 align-top print:border-black ${
                            isToday(parseISO(date)) ? "bg-blue-500/10 ring-1 ring-inset ring-blue-500/20" : ""
                          }`}
                        >
                          <div
                            role={isAdmin && group.section.id !== "__empty__" ? "button" : undefined}
                            tabIndex={isAdmin && group.section.id !== "__empty__" ? 0 : undefined}
                            onClick={() => {
                              if (!isAdmin || group.section.id === "__empty__") return;
                              onCellSelect({
                                sectionId: group.section.id,
                                sectionName: group.section.name,
                                shift: shift.id,
                                shiftCode: shift.code,
                                date,
                              });
                            }}
                            onKeyDown={(event) => {
                              if (!isAdmin || group.section.id === "__empty__") return;
                              if (event.key !== "Enter" && event.key !== " ") return;
                              event.preventDefault();
                              onCellSelect({
                                sectionId: group.section.id,
                                sectionName: group.section.name,
                                shift: shift.id,
                                shiftCode: shift.code,
                                date,
                              });
                            }}
                            className={`grid min-h-12 gap-1 rounded transition ${
                              isAdmin && group.section.id !== "__empty__" ? "cursor-pointer hover:bg-slate-800/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/60" : ""
                            }`}
                            title={
                              isAdmin && group.section.id !== "__empty__"
                                ? `${pointCountBySection.get(group.section.id) ?? 0} titik PM tersedia`
                                : undefined
                            }
                          >
                            {visibleSchedule ? (
                              <ScheduleCodeButton
                                key={visibleSchedule.id}
                                schedule={visibleSchedule}
                                color={visibleSchedule.pm_sections?.color ?? group.section.color}
                                onHold={onSelect}
                              />
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ScheduleCodeButton({
  schedule,
  color,
  onHold,
}: {
  schedule: Schedule;
  color: string;
  onHold: (schedule: Schedule) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHoldTimer() {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function startHoldTimer() {
    clearHoldTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onHold(schedule);
    }, 650);
  }

  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.stopPropagation();
        startHoldTimer();
      }}
      onMouseUp={clearHoldTimer}
      onMouseLeave={clearHoldTimer}
      onTouchStart={(event) => {
        event.stopPropagation();
        startHoldTimer();
      }}
      onTouchEnd={clearHoldTimer}
      onTouchCancel={clearHoldTimer}
      onClick={(event) => event.stopPropagation()}
      className={`${sectionTone(color)} rounded px-1 py-0.5 text-center text-[10px] font-black print:border print:border-black print:bg-white print:text-black`}
      title={`Tahan untuk hapus ${schedule.pm_points?.name ?? ""}`}
    >
      {schedule.pm_points?.code ?? "-"}
    </button>
  );
}

function CalendarGrid({
  currentMonth,
  schedules,
  sections,
  points,
  onPrevMonth,
  onNextMonth,
}: {
  currentMonth: Date;
  schedules: Schedule[];
  sections: Section[];
  points: Point[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
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
      const daySchedules = schedules
        .filter((schedule) => isSameDay(parseISO(schedule.scheduled_date), cloneDay))
        .sort((a, b) => {
          const sectionA = sections.find((s) => s.id === a.section_id);
          const sectionB = sections.find((s) => s.id === b.section_id);
          const orderA = sectionA?.sort_order ?? 9999;
          const orderB = sectionB?.sort_order ?? 9999;
          if (orderA !== orderB) return orderA - orderB;

          const pointA = points.find((p) => p.id === a.point_id);
          const pointB = points.find((p) => p.id === b.point_id);
          const pOrderA = pointA?.sort_order ?? 9999;
          const pOrderB = pointB?.sort_order ?? 9999;
          if (pOrderA !== pOrderB) return pOrderA - pOrderB;

          return (a.shift ?? "").localeCompare(b.shift ?? "");
        });

      const isOutside = !isSameMonth(day, monthStart);
      const isCurrentDay = isToday(day);

      days.push(
        <div
          key={day.toString()}
          className={`min-h-28 border border-slate-800/70 p-2 text-left ${
            isOutside ? "bg-slate-950/30" : "bg-slate-950"
          } ${isCurrentDay ? "bg-emerald-950/30 ring-1 ring-inset ring-emerald-500/30" : ""}`}
        >
          <span
            className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
              isCurrentDay
                ? "bg-emerald-500 font-bold text-slate-950"
                : isOutside
                  ? "text-slate-700"
                  : isWeekend(day)
                    ? "text-red-400"
                    : "text-slate-300"
            }`}
          >
            {format(day, "d")}
          </span>
          <span className="grid gap-1">
            {daySchedules.map((schedule) => (
              <span
                key={schedule.id}
                className={`${sectionTone(schedule.pm_sections?.color)} rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight`}
              >
                <span className="block truncate font-black">{schedule.pm_points?.code}</span>
                <span className="block truncate opacity-70">{schedule.pm_sections?.name}</span>
              </span>
            ))}
          </span>
        </div>,
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
      {/* Month/Year Header - jelas dan besar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-emerald-400" />
          <div>
            <h2 className="text-xl font-black capitalize text-slate-100">
              {format(currentMonth, "MMMM", { locale: id })}
            </h2>
            <p className="text-sm font-bold text-emerald-400">{format(currentMonth, "yyyy")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-[10px] font-bold text-slate-500 sm:inline">
            View Only
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={onPrevMonth} className="h-9 w-9 border-slate-800 bg-slate-950 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onNextMonth} className="h-9 w-9 border-slate-800 bg-slate-950 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/40 text-center text-[10px] font-bold uppercase text-slate-500">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((dayName) => (
          <div key={dayName} className="p-2">{dayName}</div>
        ))}
      </div>
      <div className="divide-y divide-slate-800/50">{rows}</div>
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
                <div key={point.id} className="grid grid-cols-[max-content_1fr] gap-2 rounded border border-slate-800 px-2 py-1 print:border-black">
                  <span className="font-black text-slate-100 print:text-black">{point.code}</span>
                  <span className="text-slate-400 print:text-black">
                    <span className="block">{point.name}</span>
                    {point.location_detail ? (
                      <span className="block text-[10px] text-slate-500 print:text-black">{point.location_detail}</span>
                    ) : null}
                  </span>
                </div>
              ))}
              {section.name === "SCP" ? (
                <>
                  <div className="grid grid-cols-[max-content_1fr] gap-2 rounded border border-slate-800 px-2 py-1 print:border-black items-center">
                    <span className="h-3 w-3 rounded-sm bg-amber-500 border border-amber-600 block"></span>
                    <span className="text-slate-400 print:text-black font-semibold">: LAPORAN HARIAN & MINGGUAN</span>
                  </div>
                  <div className="grid grid-cols-[max-content_1fr] gap-2 rounded border border-slate-800 px-2 py-1 print:border-black items-center">
                    <span className="h-3 w-3 rounded-sm bg-blue-500 border border-blue-600 block"></span>
                    <span className="text-slate-400 print:text-black font-semibold">: LAPORAN HARIAN & MINGGUAN & BULANAN</span>
                  </div>
                </>
              ) : null}
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
              <select name="shift" defaultValue="pagi" className="h-11 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm">
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
