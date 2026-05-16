import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { MobileNav } from "@/components/mobile-nav";
import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";

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
  if (user) {
    const { profile } = await getProfile(supabase, user.id);
    if (profile?.role === "super_admin") {
      unitName = "Administrator Pusat";
    } else {
      const rawUnits = (profile as any)?.units;
      unitName = (Array.isArray(rawUnits) ? rawUnits[0]?.name : rawUnits?.name) || (profile as any)?.["units!users_unit_id_fkey"]?.name || "Unit Tidak Diketahui";
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
      <body className="min-h-full flex flex-row bg-slate-950" style={{ fontFamily: "'Inter', sans-serif" }}>
        <ServiceWorkerRegister />
        <PwaInstallPrompt />
        
        {/* Desktop Sidebar - Only show if logged in */}
        {user && <Sidebar unitName={unitName} />}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 sm:pb-0">
          {children}
        </div>

        {/* Mobile Bottom Nav - Only show if logged in */}
        {user && <MobileNav />}
      </body>
    </html>
  );
}
