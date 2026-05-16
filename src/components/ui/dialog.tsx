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

const DialogContent = ({ 
  children, 
  className, 
  position = "center" 
}: { 
  children: React.ReactNode, 
  className?: string,
  position?: "center" | "bottom"
}) => {
  const context = React.useContext(DialogContext);
  if (!context?.open) return null;

  const isBottom = position === "bottom";

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200",
      isBottom ? "items-end sm:items-center justify-center" : "items-center justify-center"
    )}>
      <div className={cn(
        "relative w-full max-w-md bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in duration-300",
        isBottom 
          ? "rounded-2xl sm:rounded-xl slide-in-from-bottom-10 sm:zoom-in" 
          : "rounded-xl zoom-in",
        className
      )}>
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

const DialogHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("mb-4", className)}>{children}</div>
);

const DialogTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <h2 className={cn("text-xl font-bold text-slate-100", className)}>{children}</h2>
);

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger };
