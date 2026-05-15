"use client";

import React, { useState } from 'react';
import { QrCode, X, Camera, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { QRScanner } from '@/components/qr-scanner';

export default function ScanPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header Halaman Scan */}
      <header className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">Scanner Fasilitas</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pindai QR Code Fasilitas</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      {/* Area Scanner Full Page */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm aspect-square relative rounded-3xl overflow-hidden border-2 border-slate-800 bg-slate-900 shadow-2xl">
          {/* Komponen Scanner yang sudah ada, tapi kita paksa tampil langsung */}
          <div className="absolute inset-0">
             <QRScanner mode="inline" />
          </div>
          
          {/* Overlay Bingkai Scan */}
          <div className="absolute inset-0 border-[40px] border-slate-950/40 pointer-events-none" />
          <div className="absolute inset-[40px] border-2 border-emerald-500/50 rounded-xl pointer-events-none animate-pulse">
             {/* Corner Accents */}
             <div className="absolute -top-1 -left-1 h-6 w-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
             <div className="absolute -top-1 -right-1 h-6 w-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
             <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
             <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
          </div>
        </div>

        <div className="mt-12 text-center space-y-4 max-w-xs">
          <div className="flex items-center justify-center gap-2 text-emerald-400">
             <Camera className="h-4 w-4" />
             <span className="text-xs font-bold uppercase tracking-widest">Kamera Aktif</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Arahkan kamera ke stiker QR Code yang tertempel pada unit fasilitas untuk melihat histori dan status.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="p-8 text-center">
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">
          Facility Readiness System • Security Scanning
        </p>
      </footer>
    </main>
  );
}
