"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Camera, Wrench, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { QRScanner } from "./qr-scanner";

export function MobileNav() {
  const pathname = usePathname();

  // Don't show navbar on login page
  if (pathname === "/login") return null;

  const navItems = [
    {
      label: "Beranda",
      icon: Home,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "Laporan",
      icon: ClipboardList,
      href: "/laporan",
      active: pathname === "/laporan" || pathname.startsWith("/laporan/"),
    },
    {
      label: "Scan",
      icon: Camera,
      isScanner: true,
    },
    {
      label: "Aset",
      icon: Wrench,
      href: "/manajemen/fasilitas",
      active: pathname.startsWith("/manajemen/fasilitas") || pathname.startsWith("/fasilitas"),
    },
    {
      label: "Profil",
      icon: User,
      href: "/profil",
      active: pathname === "/profil",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block sm:hidden">
      {/* Background with blur and top border */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800/50" />
      
      <div className="relative flex items-end justify-around px-2 pb-safe-area-inset-bottom">
        {navItems.map((item) => {
          if (item.isScanner) {
            return (
              <div key={item.label} className="relative -top-4">
                <QRScanner customTrigger={
                  <button className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.4)] transition-transform active:scale-90">
                    <Camera className="h-7 w-7 text-slate-950" />
                  </button>
                } />
                <span className="mt-1 block text-center text-[10px] font-bold uppercase tracking-tighter text-emerald-500">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href!}
              className={cn(
                "flex flex-col items-center py-3 px-2 transition-colors",
                item.active ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-1", item.active && "animate-in zoom-in duration-300")} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                {item.label}
              </span>
              {item.active && (
                <div className="absolute bottom-0 h-0.5 w-4 rounded-full bg-emerald-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
