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

  useEffect(() => {
    // Jangan muncul kalau sudah mode standalone (sudah diinstall) atau BUKAN perangkat mobile
    if (isStandaloneMode() || !isMobileDevice()) {
      return;
    }

    queueMicrotask(() => setIsVisible(true));

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
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setIsVisible(false);
    }

    setInstallPrompt(null);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-3 pb-3 sm:bottom-4 sm:px-4">
      <div className="mx-auto max-w-md rounded-lg border border-emerald-500/30 bg-slate-950 p-3 shadow-2xl shadow-black/40">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-100">Install FRS di perangkat ini</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Agar akses lebih cepat seperti aplikasi. Jika tombol install belum aktif, gunakan menu browser lalu pilih
              Tambahkan ke layar utama.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-900 hover:text-slate-200"
            aria-label="Tutup popup install"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button type="button" onClick={installApp} disabled={!installPrompt} className="h-9">
            <Download className="h-4 w-4" aria-hidden="true" />
            Install
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsVisible(false)} className="h-9">
            Nanti
          </Button>
        </div>
      </div>
    </div>
  );
}
