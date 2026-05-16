"use client";

import { useState } from "react";
import { Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import { QRCodeSVG } from "qrcode.react";
import ReactDOM from "react-dom";

type Facility = {
  id: string;
  name: string;
  location_detail: string | null;
};

import { QRCodeCanvas } from "qrcode.react";

export function BulkQRButton({ facilities, unitName }: { facilities: Facility[]; unitName: string }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    if (facilities.length === 0) return;
    setIsGenerating(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 10;
      const cols = 3;
      const rowsPerPage = 5;
      const itemWidth = (210 - (margin * 2)) / cols;
      const itemHeight = 55;
      const qrSize = 35;

      const baseUrl = window.location.origin;

      for (let i = 0; i < facilities.length; i++) {
        const f = facilities[i];
        
        if (i > 0 && i % (cols * rowsPerPage) === 0) {
          doc.addPage();
        }

        const pageIdx = i % (cols * rowsPerPage);
        const col = pageIdx % cols;
        const row = Math.floor(pageIdx / cols);
        
        const x = margin + (col * itemWidth);
        const y = margin + (row * itemHeight);

        // Get QR Canvas
        const canvas = document.getElementById(`bulk-qr-${f.id}`) as HTMLCanvasElement;
        if (canvas) {
          const qrDataUrl = canvas.toDataURL("image/png");
          
          // Draw Frame
          doc.setDrawColor(230, 230, 230);
          doc.roundedRect(x + 2, y + 2, itemWidth - 4, itemHeight - 4, 3, 3);
          
          // Draw QR
          doc.addImage(qrDataUrl, 'PNG', x + (itemWidth - qrSize) / 2, y + 5, qrSize, qrSize);
          
          // Add Text
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "bold");
          doc.text(f.name.toUpperCase(), x + itemWidth / 2, y + qrSize + 10, { align: 'center', maxWidth: itemWidth - 10 });
          
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(f.location_detail || unitName || "", x + itemWidth / 2, y + qrSize + 14, { align: 'center', maxWidth: itemWidth - 10 });
        }
      }

      doc.save(`QR_Codes_${unitName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={generatePDF}
        disabled={isGenerating || facilities.length === 0}
        className="border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 h-10 px-4 transition-all active:scale-95 flex items-center gap-2"
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        <span>Cetak QR Massal</span>
      </Button>

      {/* Hidden container for rendering all QRs to capture them */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0">
        {facilities.map(f => (
          <QRCodeCanvas 
            key={f.id}
            id={`bulk-qr-${f.id}`}
            value={`${window.location.origin}/fasilitas/${f.id}`}
            size={256}
            level="H"
            includeMargin={true}
          />
        ))}
      </div>
    </>
  );
}
