"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export function QRScanner({ customTrigger }: { customTrigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (open) {
      // Delay slightly to ensure the element is in DOM
      const timer = setTimeout(() => {
        scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            const baseUrl = window.location.origin;
            if (decodedText.startsWith(baseUrl) || decodedText.includes("/fasilitas/")) {
              scanner?.clear();
              setOpen(false);
              router.push(decodedText);
            } else {
              alert("QR Code tidak dikenali oleh sistem FRS.");
              scanner?.clear();
              setOpen(false);
            }
          },
          (errorMessage) => {
            // Quietly ignore errors
          }
        );
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(e => console.error("Scanner clear error", e));
        }
      };
    }
  }, [open, router]);

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
          <DialogTitle>
            Scanner Fasilitas
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          <div id="reader" className="w-full overflow-hidden rounded-xl border border-slate-800 bg-black"></div>
          <p className="text-xs text-slate-500 text-center italic">
            Arahkan kamera ke stiker QR Code pada fasilitas.
          </p>
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400">
            Batalkan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
