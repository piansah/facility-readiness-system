"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { QRScanner } from "./qr-scanner";
import { NAVIGATION_ITEMS } from "@/lib/constants/navigation";
import { QrCode } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  // Split navigation items to Beranda/Jadwal M and Jadwal D/Profil
  const leftItems = NAVIGATION_ITEMS.filter(item => ["Beranda", "Jadwal Maintenance"].includes(item.label));
  const rightItems = NAVIGATION_ITEMS.filter(item => ["Jadwal Dinas", "Profil"].includes(item.label));
  const scannerItem = NAVIGATION_ITEMS.find(item => item.isScanner);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block sm:hidden">
      {/* Background with blur */}
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/50" />
      
      <div className="relative flex items-center justify-between h-20 px-6 pb-safe-area-inset-bottom">
        {/* Left Side */}
        <div className="flex flex-1 justify-around">
          {leftItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href!));
            return (
              <Link key={item.label} href={item.href!} className="flex flex-col items-center justify-center relative py-2">
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 transition-all duration-300",
                  isActive ? "bg-emerald-500/15 text-emerald-400 rounded-[15%]" : "text-slate-500"
                )}>
                  <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
                </div>
                {isActive && <div className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />}
              </Link>
            );
          })}
        </div>

        {/* Center Scanner (Force Render) */}
        <div className="relative -top-7 flex flex-col items-center">
          <QRScanner customTrigger={
            <button 
              id="mobile-scanner-trigger-forced"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.5)] active:scale-90 border-[6px] border-slate-950 transition-all"
            >
              <QrCode className="h-8 w-8 text-slate-950 stroke-[2.5]" />
            </button>
          } />
        </div>

        {/* Right Side */}
        <div className="flex flex-1 justify-around">
          {rightItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href!));
            return (
              <Link key={item.label} href={item.href!} className="flex flex-col items-center justify-center relative py-2">
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 transition-all duration-300",
                  isActive ? "bg-emerald-500/15 text-emerald-400 rounded-[15%]" : "text-slate-500"
                )}>
                  <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
                </div>
                {isActive && <div className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
