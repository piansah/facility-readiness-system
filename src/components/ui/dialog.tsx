"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = ({ open, onOpenChange, children, className }: { open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode, className?: string }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className={cn("relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200", className)}>
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 transition-colors z-50"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("p-6", className)}>{children}</div>
);

const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
);

const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-slate-100">{children}</h2>
);

const DialogTrigger = ({ asChild, children, ...props }: any) => {
  return React.cloneElement(children as React.ReactElement, props);
};

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger };
