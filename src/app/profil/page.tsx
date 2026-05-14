import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Mail, Shield, Building2, ChevronRight } from "lucide-react";
import { logout } from "@/app/login/actions";

export default async function ProfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const roleLabel = (role?: string) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "admin": return "Admin Unit";
      default: return "Staff / Teknisi";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 pb-32">
      {/* Header Section */}
      <div className="bg-slate-900/50 pt-12 pb-24 px-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-slate-100 text-center">Profil Saya</h1>
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

            <div className="text-center -mt-8 mb-8">
              <h2 className="text-xl font-bold text-slate-100">{profile?.full_name || "User"}</h2>
              <p className="text-emerald-500 font-bold text-xs uppercase tracking-widest mt-1">
                {roleLabel(profile?.role)}
              </p>
            </div>

            {/* Info Items */}
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Email</span>
                    <span className="text-sm text-slate-200">{user.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Wewenang</span>
                    <span className="text-sm text-slate-200">{roleLabel(profile?.role)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Unit Kerja</span>
                    <span className="text-sm text-slate-200">{profile?.unit_id || "BIJB Kertajati"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="mt-12">
          <form action={logout}>
            <Button 
              variant="destructive" 
              className="w-full h-14 rounded-2xl gap-3 font-black text-base shadow-xl shadow-red-500/10 active:scale-95 transition-all"
            >
              <LogOut className="h-5 w-5" />
              Keluar Sistem
            </Button>
          </form>
          <div className="text-center mt-6">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              FRS Mobile v1.2.5 • BIJB Kertajati
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
