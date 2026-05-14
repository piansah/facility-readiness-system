"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { QRScanner } from "./qr-scanner";
import { NAVIGATION_ITEMS } from "@/lib/constants/navigation";

export function MobileNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block sm:hidden">
      {/* Background with blur */}
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/50" />
      
      <div className="relative flex items-center justify-around h-20 px-2 pb-safe-area-inset-bottom">
        {NAVIGATION_ITEMS.map((item) => {
          if (item.isScanner) {
            return (
              <div key="scanner" className="relative -top-7">
                <QRScanner customTrigger={
                  <button 
                    id="mobile-scanner-trigger"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.5)] active:scale-90 border-[6px] border-slate-950 transition-all"
                  >
                    <item.icon className="h-8 w-8 text-slate-950 stroke-[2.5]" />
                  </button>
                } />
              </div>
            );
          }

          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href!));

          return (
            <Link
              key={item.label}
              href={item.href!}
              className="flex flex-col items-center justify-center relative py-2 px-1"
            >
              <div className={cn(
                "flex items-center justify-center h-10 w-10 transition-all duration-300",
                isActive ? "bg-emerald-500/15 text-emerald-400 rounded-[15%]" : "text-slate-500"
              )}>
                <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
              </div>
              
              {/* Dot Indicator */}
              {isActive && (
                <div className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
