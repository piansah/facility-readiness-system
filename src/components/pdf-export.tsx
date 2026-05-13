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
    result_status: string | null;
    handler_type: string | null;
    photos?: {
      signedUrl: string | null;
      caption: string | null;
    }[];
  }[];
  incident_follow_ups?: {
    action_taken: string;
    follow_up_time: string;
    status_update: string;
    handler_type: string;
    incident: { title: string } | null;
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
          
          let statusText = incident.status;
          if (incident.result_status) {
            const rs = incident.result_status === 'success' ? 'Berhasil' : incident.result_status === 'failed' ? 'Gagal' : 'Proses';
            const ht = incident.handler_type === 'vendor' ? 'Vendor' : 'Internal';
            statusText = `${rs} (Oleh ${ht})`;
          }
          
          doc.text(`Waktu: ${formatDateTime(incident.incident_time)} | Status: ${statusText}`, 20, currentY + 10);
          doc.text(`Dilaporkan oleh: ${report.users?.full_name ?? "-"}`, 20, currentY + 15);

          const splitDescription = doc.splitTextToSize(`Deskripsi: ${incident.description}`, pageWidth - 35);
          doc.text(splitDescription, 20, currentY + 22);
          currentY += 22 + splitDescription.length * 4;

          if (incident.action_taken) {
            const splitAction = doc.splitTextToSize(`Tindakan: ${incident.action_taken}`, pageWidth - 35);
            doc.text(splitAction, 20, currentY);
            currentY += splitAction.length * 4 + 5;
          }

          let photoX = 20;
          let maxRowHeight = 0;

          for (const photo of incident.photos ?? []) {
            if (!photo.signedUrl) continue;

            try {
              const image = await fetchImageData(photo.signedUrl);
              const isPortrait = image.height > image.width;
              
              // Tentukan lebar target
              // Portrait: ~55mm (muat 3 per baris), Landscape: 100mm (1 per baris)
              let targetWidth = isPortrait ? 55 : 100;
              let imgWidth = targetWidth;
              let imgHeight = (image.height * imgWidth) / image.width;

              // Batasi tinggi max agar tidak makan satu halaman sendiri
              const maxHeight = 80;
              if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = (image.width * imgHeight) / image.height;
              }

              // Cek apakah harus ganti baris (untuk portrait) atau memang landscape
              if (!isPortrait || (photoX + imgWidth > pageWidth - 15)) {
                currentY += maxRowHeight + (maxRowHeight > 0 ? 5 : 0);
                photoX = 20;
                maxRowHeight = 0;
              }

              // Cek apakah harus ganti halaman
              if (currentY + imgHeight > 270) {
                doc.addPage();
                currentY = 20;
                photoX = 20;
              }

              doc.addImage(image.dataUrl, image.format, photoX, currentY, imgWidth, imgHeight);
              
              if (isPortrait) {
                photoX += imgWidth + 5;
                maxRowHeight = Math.max(maxRowHeight, imgHeight);
              } else {
                currentY += imgHeight + 10;
                photoX = 20;
                maxRowHeight = 0;
              }
            } catch (error) {
              console.error("Failed to add image to PDF", error);
              doc.text("Foto gagal dimuat.", 20, currentY);
              currentY += 8;
            }
          }

          currentY += maxRowHeight + (maxRowHeight > 0 ? 10 : 5);
        }
      }

      if (report.incident_follow_ups && report.incident_follow_ups.length > 0) {
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        } else {
          currentY += 10;
        }

        doc.setFontSize(12);
        doc.text("3. Tindak Lanjut Laporan Non-Rutin", 15, currentY);
        currentY += 5;

        for (const fu of report.incident_follow_ups) {
          if (currentY > 270) {
            doc.addPage();
            currentY = 20;
          }

          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(`- Tindak Lanjut: ${fu.incident?.title}`, 15, currentY + 5);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          const rs = fu.status_update === 'success' ? 'Berhasil' : fu.status_update === 'failed' ? 'Gagal' : 'Proses';
          const ht = fu.handler_type === 'vendor' ? 'Vendor' : 'Internal';
          doc.text(`Waktu: ${formatDateTime(fu.follow_up_time)} | Status: ${rs} (Oleh ${ht})`, 20, currentY + 10);

          const splitAction = doc.splitTextToSize(`Tindakan: ${fu.action_taken}`, pageWidth - 35);
          doc.text(splitAction, 20, currentY + 17);
          currentY += 17 + splitAction.length * 4;

          // Render photos for follow-ups
          let photoX = 20;
          let maxRowHeight = 0;

          for (const photo of fu.photos ?? []) {
            if (!photo.signedUrl) continue;

            try {
              const image = await fetchImageData(photo.signedUrl);
              const isPortrait = image.height > image.width;
              
              let targetWidth = isPortrait ? 55 : 100;
              let imgWidth = targetWidth;
              let imgHeight = (image.height * imgWidth) / image.width;

              const maxHeight = 80;
              if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = (image.width * imgHeight) / image.height;
              }

              if (!isPortrait || (photoX + imgWidth > pageWidth - 15)) {
                currentY += maxRowHeight + (maxRowHeight > 0 ? 5 : 0);
                photoX = 20;
                maxRowHeight = 0;
              }

              if (currentY + imgHeight > 270) {
                doc.addPage();
                currentY = 20;
                photoX = 20;
              }

              doc.addImage(image.dataUrl, image.format, photoX, currentY, imgWidth, imgHeight);
              
              if (isPortrait) {
                photoX += imgWidth + 5;
                maxRowHeight = Math.max(maxRowHeight, imgHeight);
              } else {
                currentY += imgHeight + 10;
                photoX = 20;
                maxRowHeight = 0;
              }
            } catch (error) {
              console.error("Failed to add follow-up image to PDF", error);
              doc.text("Foto gagal dimuat.", 20, currentY);
              currentY += 8;
            }
          }
          currentY += maxRowHeight + (maxRowHeight > 0 ? 10 : 5);
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

  // Ambil dimensi asli gambar
  const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = dataUrl;
  });

  return {
    dataUrl,
    format: blob.type.includes("png") ? "PNG" : "JPEG",
    width: dimensions.width,
    height: dimensions.height,
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
