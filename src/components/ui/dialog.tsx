"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

const Dialog = ({ open, onOpenChange, children }: { open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogTrigger = ({ asChild, children }: any) => {
  const context = React.useContext(DialogContext);
  if (!context) return null;

  return React.cloneElement(children as React.ReactElement<any>, {
    onClick: () => context.onOpenChange(true)
  });
};

const DialogContent = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const context = React.useContext(DialogContext);
  if (!context?.open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={cn("relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in duration-200", className)}>
        <button 
          onClick={() => context.onOpenChange(false)}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 transition-colors z-[110]"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
);

const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-slate-100">{children}</h2>
);

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger };
