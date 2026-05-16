"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAVIGATION_ITEMS } from "@/lib/constants/navigation";

export function MobileNav() {
  const pathname = usePathname();
  const [activePath, setActivePath] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset activePath when pathname actually changes
  useEffect(() => {
    setActivePath(null);
  }, [pathname]);

  if (pathname === "/login") return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.4)] sm:hidden">
      <div className="relative flex items-center justify-around h-16 px-2 pb-safe-area-inset-bottom">
        {NAVIGATION_ITEMS.filter(item => ["Beranda", "SCAN QR", "Profil"].includes(item.label)).map((item) => {
          const currentPath = activePath || pathname;
          const isActive = currentPath === item.href || (item.href !== "/dashboard" && currentPath.startsWith(item.href!));
          
          return (
            <Link 
              key={item.label} 
              href={item.href!} 
              prefetch={true}
              onClick={() => {
                startTransition(() => {
                  setActivePath(item.href!);
                });
              }}
              className="flex flex-1 flex-col items-center justify-center relative py-2 outline-none"
            >
              <div className="relative flex flex-col items-center transition-all duration-300">
                <div className={`p-2 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? "text-emerald-500" 
                    : "text-slate-600"
                }`}>
                  <item.icon className={`h-6 w-6 transition-transform duration-300 ${isActive ? "scale-110 stroke-[2.5]" : "scale-100 stroke-[1.8]"}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
