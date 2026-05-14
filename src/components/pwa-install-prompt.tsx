"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Jangan muncul kalau sudah mode standalone (sudah diinstall)
    if (isStandaloneMode()) {
      return;
    }

    // Untuk iOS, kita tampilkan prompt manual jika bukan standalone
    if (isIOSDevice) {
      const hasShownPrompt = localStorage.getItem("pwa-prompt-dismissed");
      if (!hasShownPrompt) {
        queueMicrotask(() => setIsVisible(true));
      }
      return;
    }

    // Untuk Android/Desktop yang support beforeinstallprompt
    if (!isMobileDevice()) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      setIsVisible(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsVisible(false);
    setInstallPrompt(null);
  };

  const dismissPrompt = () => {
    setIsVisible(false);
    if (isIOS) {
      // Simpan status agar tidak muncul terus di iOS setiap refresh
      localStorage.setItem("pwa-prompt-dismissed", "true");
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-3 sm:bottom-4 sm:px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-100">Pasang Aplikasi FRS</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Akses sistem lebih cepat dan lancar langsung dari layar utama perangkat Anda.
            </p>

            {isIOS && (
              <div className="mt-3 rounded-lg bg-emerald-500/5 p-3 border border-emerald-500/10">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-2">Instruksi iPhone:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">1</span>
                    <span>Tap ikon <strong className="text-emerald-400">Share</strong> (kotak panah atas)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">2</span>
                    <span>Pilih <strong className="text-emerald-400">Add to Home Screen</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={dismissPrompt}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isIOS && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button type="button" onClick={installApp} disabled={!installPrompt} className="h-10 rounded-xl font-bold shadow-lg shadow-emerald-500/20">
              <Download className="mr-2 h-4 w-4" />
              Install Sekarang
            </Button>
            <Button type="button" variant="outline" onClick={dismissPrompt} className="h-10 rounded-xl border-slate-800 text-slate-400">
              Nanti Saja
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
