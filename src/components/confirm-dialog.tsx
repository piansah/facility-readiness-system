"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  variant?: "emerald" | "destructive";
  isPending?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  variant = "emerald",
  isPending = false
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  // Explicit mapping to avoid dynamic tailwind class issues
  const styles = {
    emerald: {
      glow: "bg-emerald-500/10",
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-500",
      button: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20",
    },
    destructive: {
      glow: "bg-red-500/10",
      iconBg: "bg-red-500/10",
      iconText: "text-red-500",
      button: "bg-red-600 hover:bg-red-500 shadow-red-900/20",
    }
  }[variant];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={isPending ? undefined : onClose}
      />
      
      {/* Modal - Strictly centered with flex and fixed max-width */}
      <div className="relative w-full max-w-[340px] sm:max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
        {/* Decorative Glow */}
        <div className={`absolute -right-16 -top-16 h-32 w-32 rounded-full ${styles.glow} blur-3xl pointer-events-none`} />
        
        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${styles.iconBg} ${styles.iconText}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          
          <h3 className="mb-2 text-lg font-bold text-slate-100">{title}</h3>
          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            {description}
          </p>
          
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
            <Button 
              variant="ghost" 
              className="h-11 flex-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100" 
              onClick={onClose}
              disabled={isPending}
              type="button"
            >
              Batal
            </Button>
            <Button 
              type="button"
              className={`h-11 flex-1 font-semibold text-white shadow-lg ${styles.button}`}
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? "Memproses..." : confirmText}
            </Button>
          </div>
        </div>
        
        {!isPending && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
