"use client";

import { useEffect, useState } from "react";
import { QrCode, Camera } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export function QRScanner({ 
  customTrigger, 
  mode = "dialog",
  forceShow = false 
}: { 
  customTrigger?: React.ReactNode, 
  mode?: "dialog" | "inline",
  forceShow?: boolean 
}) {
  const [open, setOpen] = useState(forceShow || mode === "inline");
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if ((mode === "dialog" && !open) || !isMounted) return;

    let scanner: any = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        
        setTimeout(async () => {
          const readerElement = document.getElementById("reader");
          if (!readerElement) return;

          // Hapus instance lama jika ada
          if (scanner) {
            try { await scanner.stop(); } catch(e) {}
          }

          scanner = new Html5Qrcode("reader");
          
          const qrCodeSuccessCallback = (decodedText: string) => {
            const baseUrl = window.location.origin;
            let targetPath = decodedText;
            
            if (decodedText.startsWith(baseUrl)) {
              targetPath = decodedText.replace(baseUrl, "");
            }

            if (targetPath.includes("/fasilitas/")) {
              scanner?.stop().then(() => {
                setOpen(false);
                router.push(targetPath);
              }).catch(() => {
                setOpen(false);
                router.push(targetPath);
              });
            } else {
              toast.error("QR Code tidak dikenali oleh sistem FRS.");
            }
          };

          const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          };

          // Langsung jalankan kamera belakang (environment)
          scanner.start(
            { facingMode: "environment" }, 
            config, 
            qrCodeSuccessCallback,
            () => {}
          ).catch((err: any) => {
            console.error("Kamera gagal start secara otomatis:", err);
            // Jika gagal otomatis (misal: butuh klik user), biarkan saja atau beri info
          });
        }, 300);
      } catch (err) {
        console.error("Failed to load scanner", err);
      }
    };

    startScanner();

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch((e: any) => console.error("Scanner stop error", e));
      }
    };
  }, [open, isMounted, router, mode]);

  if (mode === "inline") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black">
        <div id="reader" className="w-full h-full overflow-hidden"></div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {customTrigger ? (
          customTrigger
        ) : (
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-bold gap-2 shadow-lg shadow-emerald-500/20">
            <Camera className="h-6 w-6" /> Scan QR Fasilitas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scanner Fasilitas</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div id="reader" className="w-full min-h-[300px] overflow-hidden rounded-xl border border-slate-800 bg-black"></div>
          <p className="text-xs text-slate-500 text-center italic">
            Arahkan kamera ke stiker QR Code pada fasilitas.
          </p>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
            Batalkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
