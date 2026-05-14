"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  facility: {
    id: string;
    name: string;
    location_detail: string | null;
  };
  triggerId?: string;
};

export function FacilityQRModal({ facility, triggerId }: Props) {
  const [open, setOpen] = useState(false);
  
  // Create the URL that the QR will point to
  // Format: domain/laporan/buat?facility_id=xxx
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const qrValue = `${baseUrl}/fasilitas/${facility.id}`;

  const downloadQR = () => {
    const svg = document.getElementById(`qr-code-${facility.id}`);
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 100;
      if (ctx) {
        // Background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw Image
        ctx.drawImage(img, 20, 20);
        
        // Add Text
        ctx.fillStyle = "black";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(facility.name, canvas.width / 2, img.height + 50);
        ctx.font = "12px Arial";
        ctx.fillText(facility.location_detail || "No Location Info", canvas.width / 2, img.height + 70);
        
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-${facility.name}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id={triggerId} variant="outline" size="sm" title="Lihat QR Code" className="h-8 gap-2 border-emerald-500/50 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400">
          <QrCode className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-tight">QR Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            QR Code Fasilitas
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-6 py-6">
          <div className="p-6 bg-white rounded-2xl shadow-2xl">
            <QRCodeSVG 
              id={`qr-code-${facility.id}`}
              value={qrValue} 
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-slate-100">{facility.name}</h3>
            <p className="text-sm text-slate-500">{facility.location_detail || "Lokasi tidak ditentukan"}</p>
          </div>
          
          <div className="flex gap-3 w-full">
            <Button onClick={downloadQR} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
            <Button onClick={() => window.print()} variant="outline" className="border-slate-800 text-slate-400">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-[10px] text-slate-600 italic">Scan QR ini untuk langsung mengisi laporan fasilitas tersebut.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
