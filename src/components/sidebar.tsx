"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAVIGATION_ITEMS } from "@/lib/constants/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="group fixed inset-y-0 left-0 z-[100] flex">
      {/* Invisible Trigger Area - Hover this to show sidebar */}
      <div className="w-2 h-full bg-transparent" />

      {/* The Actual Sidebar */}
      <aside className={cn(
        "flex flex-col w-64 h-full border-r border-slate-800 bg-slate-950/80 backdrop-blur-2xl transition-transform duration-300 ease-in-out shadow-2xl",
        "translate-x-[-100%] group-hover:translate-x-0",
        "hidden sm:flex"
      )}>
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
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">Monitoring & History</p>
            {NAVIGATION_ITEMS.filter(item => item.href !== "/scan").map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href!));
              
              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  )}
                >
                  <div className={cn(
                    "relative flex items-center justify-center h-5 w-5",
                    isActive && "text-emerald-400"
                  )}>
                    <item.icon className="h-5 w-5" />
                    {isActive && (
                      <div className="absolute -left-4 h-6 w-1 rounded-r-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" />
                    )}
                  </div>
                  {item.label}
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
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Visual Indicator (Optional subtle glow on edge) */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-32 bg-emerald-500/20 rounded-r-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
