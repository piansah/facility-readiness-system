import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Mail, Shield, Building2, ChevronRight, BookOpen } from "lucide-react";
import { getProfile } from "@/lib/auth/profile";
import { ProfileLogoutButton } from "@/components/ProfileLogoutButton";

import { Suspense } from "react";

export default function ProfilPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 pb-32">
      <Suspense fallback={<div className="p-12 text-center text-slate-500 animate-pulse uppercase text-[10px] font-bold tracking-widest">Menyiapkan Profil...</div>}>
        <ProfilContent />
      </Suspense>
    </div>
  );
}

async function ProfilContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile: userData } = await getProfile(supabase, user.id);

  const isSuperAdmin = userData?.role === "super_admin";
  const unitName = isSuperAdmin ? "Global / Pusat" : (userData as any)?.units?.name;

  const formatUnitName = (name?: string) => {
    if (isSuperAdmin) return "Global / Pusat";
    if (!name) return "Unit Tidak Diketahui";
    return name.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const roleLabel = (role?: string) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "admin": return "Admin Unit";
      case "petugas": return "Staff / Teknisi";
      case "viewer": return "Viewer / Tamu";
      default: return role || "User";
    }
  };

  return (
    <>
      {/* Header Section */}
      <div className="bg-slate-900/30 pt-12 pb-24 px-6 border-b border-slate-800">
      </div>

      <div className="px-6 -mt-16 max-w-md mx-auto w-full">
        {/* Profile Card */}
        <Card className="border-slate-800 bg-slate-900 shadow-2xl overflow-visible">
          <CardContent className="pt-0 flex flex-col items-center">
            {/* Avatar - Centered and prominent */}
            <div className="relative -top-12">
              <div className="h-24 w-24 rounded-full bg-emerald-500 flex items-center justify-center border-[6px] border-slate-900 shadow-xl">
                <User className="h-12 w-12 text-slate-950 stroke-[2.5]" />
              </div>
            </div>

            <div className="text-center -mt-8 mb-10">
              <h2 className="text-xl font-bold text-slate-100">{userData?.full_name || "User"}</h2>
            </div>

            {/* Info Items */}
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/30 border border-slate-800/30">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Email</span>
                    <span className="text-sm text-slate-200 font-medium">{user.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/30 border border-slate-800/30">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Wewenang</span>
                    <span className="text-sm text-slate-200 font-medium">{roleLabel(userData?.role)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/30 border border-slate-800/30">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Unit Kerja</span>
                    <span className="text-sm text-slate-200 font-medium">{formatUnitName(unitName)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu Section */}
        <div className="mt-8 space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Lainnya</p>
          <Button 
            asChild
            variant="outline" 
            className="w-full h-14 rounded-xl justify-between px-5 border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-200 font-bold active:scale-95 transition-all"
          >
            <Link href="/panduan">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span>Panduan Sistem</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </Link>
          </Button>
        </div>

        {/* Action Button */}
        <div className="mt-10 flex flex-col items-center w-full max-w-[240px] mx-auto">
          <ProfileLogoutButton />
        </div>
      </div>
    </>
  );
}
