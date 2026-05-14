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
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 block sm:hidden w-[280px]">
      {/* Floating Pill Container */}
      <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-2xl border border-slate-800/50 rounded-full px-4 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Beranda */}
        {beranda && (
          <NavItem item={beranda} pathname={pathname} />
        )}

        {/* Center Scanner (The Action Button) */}
        {scannerItem && (() => {
          const ScanIcon = scannerItem.icon;
          return (
            <div className="relative -top-2">
              <QRScanner customTrigger={
                <button className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.4)] transition-all active:scale-90 border-4 border-slate-900">
                  <ScanIcon className="h-7 w-7 text-slate-950 stroke-[2.5]" />
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
      className={cn(
        "flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300",
        isActive ? "bg-emerald-500/20 text-emerald-400" : "text-slate-500"
      )}
    >
      <item.icon className={cn("h-6 w-6", isActive && "scale-110")} />
    </Link>
  );
}
