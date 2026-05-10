"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { FileText } from "lucide-react";
import { Button } from "./ui/button";

type ReportForPdf = {
  report_date: string;
  shift: string;
  status: string;
  current_shift_staff?: StaffSnapshot[];
  next_shift_staff?: StaffSnapshot[];
  users: {
    full_name: string;
  } | null;
  units: {
    code: string;
    name: string;
  } | null;
  reviewer?: {
    full_name: string;
  } | null;
  facility_status_logs: {
    status: string;
    notes: string | null;
    facilities: {
      name: string;
      location_detail: string | null;
    } | null;
  }[];
  incidents: {
    title: string;
    description: string;
    action_taken: string | null;
    incident_time: string;
    status: string;
    photos?: {
      signedUrl: string | null;
      caption: string | null;
    }[];
  }[];
};

type StaffSnapshot = {
  id?: string;
  name: string;
  role?: string;
};

type PdfExportProps = {
  report: ReportForPdf;
};

type PdfWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

export function PdfExport({ report }: PdfExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generatePdf = async () => {
    setIsExporting(true);
    setErrorMessage(null);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(16);
      doc.text("LAPORAN HARIAN KESIAPAN FASILITAS", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Unit: ${report.units?.code ?? "-"} - ${report.units?.name ?? "-"}`, pageWidth / 2, 28, {
        align: "center",
      });
      doc.setLineWidth(0.5);
      doc.line(15, 32, pageWidth - 15, 32);

      doc.setFontSize(10);
      doc.text(`Tanggal: ${formatDate(report.report_date)}`, 15, 40);
      doc.text(`Shift: ${report.shift?.toUpperCase()}`, 15, 46);
      doc.text(`Dibuat oleh: ${report.users?.full_name ?? "-"}`, 15, 52);
      doc.text(`Status: ${report.status?.toUpperCase()}`, pageWidth - 15, 40, { align: "right" });

      doc.setFontSize(11);
      doc.text("Petugas Serah Terima Shift", 15, 62);
      doc.setFontSize(9);
      const currentStaff = formatStaffList(report.current_shift_staff);
      const nextStaff = formatStaffList(report.next_shift_staff);
      doc.text(`Shift ${report.shift}: ${currentStaff}`, 15, 68);
      doc.text(`Shift berikutnya: ${nextStaff}`, 15, 74);

      doc.setFontSize(12);
      doc.text("1. Checklist Kesiapan Fasilitas", 15, 86);

      const tableData = report.facility_status_logs.map((log, index) => [
        index + 1,
        log.facilities?.name ?? "-",
        log.facilities?.location_detail ?? "-",
        log.status.toUpperCase().replace("_", " "),
        log.notes ?? "-",
      ]);

      autoTable(doc, {
        startY: 91,
        head: [["No", "Fasilitas", "Lokasi", "Status", "Catatan"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
      });

      let currentY = ((doc as PdfWithAutoTable).lastAutoTable?.finalY ?? 70) + 15;

      doc.setFontSize(12);
      doc.text("2. Laporan Non-Rutin / Insiden", 15, currentY);
      currentY += 5;

      if (report.incidents.length === 0) {
        doc.setFontSize(10);
        doc.text("Tidak ada laporan non-rutin.", 15, currentY + 5);
        currentY += 15;
      } else {
        for (const incident of report.incidents) {
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(`- ${incident.title}`, 15, currentY + 5);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.text(`Waktu: ${formatDateTime(incident.incident_time)} | Status: ${incident.status}`, 20, currentY + 10);
          doc.text(`Dilaporkan oleh: ${report.users?.full_name ?? "-"}`, 20, currentY + 15);

          const splitDescription = doc.splitTextToSize(`Deskripsi: ${incident.description}`, pageWidth - 35);
          doc.text(splitDescription, 20, currentY + 22);
          currentY += 22 + splitDescription.length * 4;

          if (incident.action_taken) {
            const splitAction = doc.splitTextToSize(`Tindakan: ${incident.action_taken}`, pageWidth - 35);
            doc.text(splitAction, 20, currentY);
            currentY += splitAction.length * 4 + 5;
          }

          for (const photo of incident.photos ?? []) {
            if (!photo.signedUrl) {
              continue;
            }

            try {
              if (currentY > 220) {
                doc.addPage();
                currentY = 20;
              }

              const image = await fetchImageData(photo.signedUrl);
              doc.addImage(image.dataUrl, image.format, 20, currentY, 80, 50);
              currentY += 55;

              if (photo.caption) {
                doc.text(photo.caption, 20, currentY);
                currentY += 8;
              }
            } catch (error) {
              console.error("Failed to add image to PDF", error);
              doc.text("Foto gagal dimuat ke PDF.", 20, currentY);
              currentY += 8;
            }
          }

          currentY += 5;
        }
      }

      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      const signY = currentY + 20;
      doc.setFontSize(10);

      doc.text("Dibuat oleh,", 30, signY);
      doc.text("( ____________________ )", 30, signY + 30);
      doc.text(report.users?.full_name ?? "Petugas", 30, signY + 35);

      const filename = makePdfFilename(report);
      doc.save(filename);
    } catch (error) {
      console.error("Failed to export PDF", error);
      setErrorMessage("Export PDF gagal. Coba ulangi atau cek koneksi foto.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Button variant="outline" onClick={generatePdf} disabled={isExporting}>
        <FileText className="h-4 w-4" aria-hidden="true" />
        {isExporting ? "Menyiapkan..." : "Export PDF"}
      </Button>
      {errorMessage ? <p className="text-xs text-red-300">{errorMessage}</p> : null}
    </div>
  );
}

async function fetchImageData(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  return {
    dataUrl,
    format: blob.type.includes("png") ? "PNG" : "JPEG",
  } as const;
}

function makePdfFilename(report: ReportForPdf) {
  const unit = report.units?.code ?? "Unit";
  return `Laporan_${unit}_${report.report_date}_Shift_${report.shift}.pdf`.replace(/[^a-zA-Z0-9_.-]+/g, "_");
}

function formatStaffList(staff?: StaffSnapshot[]) {
  if (!staff?.length) {
    return "-";
  }

  return staff.map((person) => person.name).join(", ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
