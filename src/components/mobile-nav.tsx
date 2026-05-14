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

  // For mobile, we only show the first 2 items, the scanner, and the last 2 items
  // This is a common pattern to keep the center button for the primary action
  const primaryItems = NAVIGATION_ITEMS.filter(item => !item.isScanner).slice(0, 2);
  const secondaryItems = NAVIGATION_ITEMS.filter(item => !item.isScanner).slice(2, 4);
  const scannerItem = NAVIGATION_ITEMS.find(item => item.isScanner);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block sm:hidden">
      {/* Background with blur and top border */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/50" />
      
      <div className="relative flex items-end justify-around px-2 pb-safe-area-inset-bottom">
        {/* First 2 items */}
        {primaryItems.map((item) => (
          <NavItem key={item.label} item={item} pathname={pathname} />
        ))}

        {/* Center Scanner */}
        {scannerItem && (
          <div className="relative -top-4 flex flex-col items-center">
            <QRScanner customTrigger={
              <button className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.4)] transition-transform active:scale-90">
                <scannerItem.icon className="h-7 w-7 text-slate-950" />
              </button>
            } />
            <span className="mt-1 block text-center text-[10px] font-bold uppercase tracking-tighter text-emerald-500">
              {scannerItem.label}
            </span>
          </div>
        )}

        {/* Next 2 items */}
        {secondaryItems.map((item) => (
          <NavItem key={item.label} item={item} pathname={pathname} />
        ))}
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
        "flex flex-col items-center py-3 px-2 transition-colors min-w-[64px]",
        isActive ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
      )}
    >
      <item.icon className={cn("h-5 w-5 mb-1", isActive && "animate-in zoom-in duration-300")} />
      <span className="text-[10px] font-bold uppercase tracking-tighter">
        {item.label}
      </span>
      {isActive && (
        <div className="absolute bottom-0 h-0.5 w-4 rounded-full bg-emerald-400" />
      )}
    </Link>
  );
}
