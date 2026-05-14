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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function FacilityQRModal({ facility, triggerId, open: externalOpen, onOpenChange: setExternalOpen }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen !== undefined ? setExternalOpen : setInternalOpen;
  
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
      {/* Hanya tampilkan trigger jika tidak dikontrol secara eksternal (fallback) */}
      {!externalOpen && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2 border-emerald-500/50 bg-emerald-500/5 text-emerald-500">
            <QrCode className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase">QR Code</span>
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="max-w-md border-slate-800 bg-slate-950 p-0 overflow-hidden">
        <div className="absolute top-4 right-4 z-50">
          {/* Close button is handled by DialogContent usually, but we ensure it's clean */}
        </div>

        <DialogHeader className="p-6 pb-0 text-center">
          <DialogTitle className="text-xl font-bold text-slate-100">
            QR Code Fasilitas
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Digital Asset Identity</p>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-6 p-8">
          <div className="relative group">
            <div className="absolute -inset-4 bg-emerald-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6 bg-white rounded-2xl shadow-2xl">
              <QRCodeSVG 
                id={`qr-code-${facility.id}`}
                value={qrValue} 
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black text-slate-100 tracking-tight">{facility.name}</h3>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                {facility.location_detail || "Lokasi Umum"}
              </span>
            </div>
          </div>
          
          <div className="flex gap-3 w-full pt-2">
            <Button onClick={downloadQR} className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11 font-bold shadow-lg shadow-emerald-900/20">
              <Download className="mr-2 h-4 w-4" /> Download PNG
            </Button>
            <Button onClick={() => window.print()} variant="outline" className="h-11 w-11 border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="w-full pt-4 border-t border-slate-900">
            <p className="text-[10px] text-slate-500 text-center italic leading-relaxed">
              Scan QR ini untuk melihat riwayat perawatan dan <br/> melaporkan kerusakan khusus untuk alat ini.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
