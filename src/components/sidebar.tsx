"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAVIGATION_ITEMS } from "@/lib/constants/navigation";
import { QRScanner } from "./qr-scanner";
import { LogOut, ChevronRight } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "./ui/button";

export function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <aside className="hidden sm:flex flex-col w-64 h-dvh sticky top-0 border-r border-slate-800 bg-slate-950/50 backdrop-blur-xl z-50">
      {/* Brand Header */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <span style={{ fontFamily: "'Poppins', sans-serif" }} className="text-xl font-black text-slate-950 tracking-tighter">F</span>
          </div>
          <div>
            <h1 style={{ fontFamily: "'Poppins', sans-serif" }} className="text-lg font-bold text-slate-100 tracking-tight leading-none">FRS System</h1>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">BIJB Kertajati</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-2 space-y-1">
        <p className="px-2 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Menu Utama</p>
        
        {NAVIGATION_ITEMS.map((item) => {
          if (item.isScanner) {
            return (
              <div key="sidebar-scanner" className="pt-2 pb-2">
                <QRScanner 
                  customTrigger={
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold gap-2 h-11 rounded-xl shadow-lg shadow-emerald-500/10">
                      <item.icon className="h-5 w-5" />
                      Scan QR Fasilitas
                    </Button>
                  } 
                />
              </div>
            );
          }

          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href!));
          
          return (
            <Link
              key={item.label}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                isActive 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-5 bg-emerald-500 rounded-full" />
              )}
              <item.icon className="h-5 w-5" />
              <span className="text-sm font-semibold">{item.label}</span>
              {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>
          );
        })}
      </div>

      {/* Logout at Bottom */}
      <div className="p-4 mt-auto border-t border-slate-800/50">
        <form action={logout}>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-12 text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-bold">Keluar Sistem</span>
          </Button>
        </form>
      </div>
    </aside>
  );
}
