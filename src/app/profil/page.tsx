import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User, Mail, Shield, Building2 } from "lucide-react";
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Profil Pengguna</h1>
      
      <Card className="border-slate-800 bg-slate-900/40 overflow-hidden mb-6">
        <div className="h-24 bg-gradient-to-r from-emerald-600 to-emerald-900" />
        <CardContent className="relative pt-0 px-6 pb-6">
          <div className="absolute -top-12 left-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-900 border-4 border-slate-900 shadow-xl overflow-hidden">
              <User className="h-12 w-12 text-emerald-500" />
            </div>
          </div>
          
          <div className="mt-16 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100">{profile?.full_name || "User"}</h2>
              <p className="text-emerald-500 font-medium text-sm">{roleLabel(profile?.role)}</p>
            </div>

            <div className="grid gap-3 pt-2">
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <Shield className="h-4 w-4" />
                <span>Role: {profile?.role || "Staff"}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <Building2 className="h-4 w-4" />
                <span>Unit: {profile?.unit_id || "Kertajati"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout button for mobile (visible everywhere but prominent here) */}
      <div className="mt-8">
        <form action={logout}>
          <Button 
            variant="destructive" 
            className="w-full h-12 gap-3 font-bold shadow-lg shadow-red-500/10"
          >
            <LogOut className="h-5 w-5" />
            Keluar dari Sistem
          </Button>
        </form>
        <p className="text-center text-xs text-slate-500 mt-4 italic">
          Versi Aplikasi v1.2.0 - BIJB Kertajati
        </p>
      </div>
    </div>
  );
}
