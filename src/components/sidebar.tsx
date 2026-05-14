"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAVIGATION_ITEMS } from "@/lib/constants/navigation";
import { LogOut, LayoutDashboard } from "lucide-react";
import { logout } from "@/app/login/actions";
import { QRScanner } from "./qr-scanner";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden sm:flex flex-col w-64 h-dvh sticky top-0 border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl z-50">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
            F
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-100 leading-tight">FRS System</h1>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">BIJB Kertajati</p>
          </div>
        </div>

        <nav className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">Menu Utama</p>
          {NAVIGATION_ITEMS.map((item) => {
            if (item.isScanner) {
              return (
                <div key={item.label} className="px-3 py-2">
                  <QRScanner customTrigger={
                    <button className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/10 active:scale-95">
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
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
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative",
                  isActive 
                    ? "bg-emerald-500/10 text-emerald-400" 
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
                <span>{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800/50">
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="h-5 w-5 rotate-180" />
          <span>Keluar Sistem</span>
        </button>
      </div>
    </aside>
  );
}
