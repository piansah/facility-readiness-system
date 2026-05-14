"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { QRScanner } from "./qr-scanner";
import { NAVIGATION_ITEMS } from "@/lib/constants/navigation";

export function MobileNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  const beranda = NAVIGATION_ITEMS.find(item => item.label === "Beranda");
  const profil = NAVIGATION_ITEMS.find(item => item.label === "Profil");
  const scannerItem = NAVIGATION_ITEMS.find(item => item.isScanner);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block sm:hidden">
      {/* Dark background bar */}
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/50" />
      
      <div className="relative flex items-center justify-around h-20 px-6 pb-safe-area-inset-bottom">
        {/* Beranda */}
        {beranda && (
          <NavItem item={beranda} pathname={pathname} />
        )}

        {/* Center Scanner Button */}
        {scannerItem && (() => {
          const ScanIcon = scannerItem.icon;
          return (
            <div className="relative -top-5">
              <QRScanner customTrigger={
                <button className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-[0_8px_25px_rgba(16,185,129,0.4)] transition-all active:scale-90 border-[6px] border-slate-950">
                  <ScanIcon className="h-8 w-8 text-slate-950 stroke-[2.5]" />
                </button>
              } />
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
      className="flex flex-col items-center justify-center relative py-2 px-4"
    >
      <div className={cn(
        "flex items-center justify-center h-12 w-12 rounded-full transition-all duration-300",
        isActive ? "bg-emerald-500/10 text-emerald-400" : "text-slate-500"
      )}>
        <item.icon className={cn("h-7 w-7", isActive && "scale-110")} />
      </div>
      
      {/* Pill/Dot Indicator instead of text */}
      {isActive && (
        <div className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" />
      )}
    </Link>
  );
}
