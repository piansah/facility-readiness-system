import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { logout } from "@/app/login/actions";
import Link from "next/link";
import { Home, LogOut } from "lucide-react";

export const metadata: Metadata = {
  title: "Facility Readiness System",
  description: "Reporting & Monitoring System for Facility Readiness - BIJB",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FRS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let unitName = "BIJB KERTAJATI";
  let role = "";
  if (user) {
    const { profile } = await getProfile(supabase, user.id);
    role = profile?.role || "";
    if (profile?.role === "super_admin") {
      unitName = "Administrator Pusat";
    } else {
      unitName = (profile as any)?.units?.name || "Unit Tidak Diketahui";
    }
  }

  return (
    <html
      lang="id"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100" style={{ fontFamily: "'Inter', sans-serif" }}>
        <ServiceWorkerRegister />
        <PwaInstallPrompt />
        
        {/* Global Header for Super Admin */}
        {user && role === "super_admin" && (
          <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  F
                </div>
                <div>
                  <h1 className="text-sm font-black text-slate-100 leading-tight">FRS System</h1>
                  <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Administrator Pusat</p>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <Link 
                  href="/dashboard" 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all"
                >
                  <Home className="h-4 w-4 text-emerald-500" />
                  <span>Dashboard</span>
                </Link>
                <div className="h-4 w-[1px] bg-slate-800 mx-1" />
                <form action={logout}>
                  <button 
                    type="submit" 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}

        <div className="flex flex-row flex-1 min-h-0 w-full">
          {/* Desktop Sidebar - Only show if logged in and not super_admin */}
          {user && role !== "super_admin" && <Sidebar unitName={unitName} />}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-0 w-full">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Nav - Only show if logged in and not super_admin */}
        {user && role !== "super_admin" && <MobileNav />}
      </body>
    </html>
  );
}
