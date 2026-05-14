"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { QRScanner } from "./qr-scanner";
import { NAVIGATION_ITEMS } from "@/lib/constants/navigation";

export function MobileNav() {
  const pathname = usePathname();

  // Don't show navbar on login page
  if (pathname === "/login") return null;

  // We want: [Beranda] [SCAN QR] [Profil]
  const beranda = NAVIGATION_ITEMS.find(item => item.label === "Beranda");
  const profil = NAVIGATION_ITEMS.find(item => item.label === "Profil");
  const scannerItem = NAVIGATION_ITEMS.find(item => item.isScanner);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block sm:hidden">
      {/* Glassmorphism Background */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl border-t border-slate-800/50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]" />
      
      <div className="relative flex items-center justify-around px-4 h-20 pb-safe-area-inset-bottom">
        {/* Beranda */}
        {beranda && (
          <NavItem item={beranda} pathname={pathname} />
        )}

        {/* Center Scanner Button */}
        {scannerItem && (() => {
          const ScanIcon = scannerItem.icon;
          return (
            <div className="relative -top-6 flex flex-col items-center">
              <QRScanner customTrigger={
                <button className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-[0_10px_25px_rgba(16,185,129,0.4)] transition-all active:scale-90 active:shadow-inner border-4 border-slate-950">
                  <ScanIcon className="h-8 w-8 text-slate-950 stroke-[2.5]" />
                </button>
              } />
              <span className="mt-2 block text-center text-[10px] font-black uppercase tracking-widest text-emerald-500 drop-shadow-md">
                {scannerItem.label}
              </span>
            </div>
          );
        })()}

        {/* Profil */}
        {profil && (
          <NavItem item={profil} pathname={pathname} />
        )}
      </div>
    </nav>
  );
}

function NavItem({ item, pathname }: { item: any, pathname: string }) {
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href!));
  
  return (
    <Link
      href={item.href!}
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-300 min-w-[70px] relative",
        isActive ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
      )}
    >
      <div className={cn(
        "p-2 rounded-xl transition-all duration-300",
        isActive && "bg-emerald-500/10"
      )}>
        <item.icon className={cn("h-6 w-6", isActive && "animate-in zoom-in-75 duration-300")} />
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-tight mt-1 transition-all",
        isActive ? "opacity-100 scale-100" : "opacity-60 scale-95"
      )}>
        {item.label}
      </span>
      {isActive && (
        <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,1)]" />
      )}
    </Link>
  );
}
