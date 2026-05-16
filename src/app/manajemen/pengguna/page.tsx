import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Building2, ToggleLeft, ToggleRight } from "lucide-react";
import { toggleUserStatus } from "./actions";
import { UserEditModal, UserFormModal } from "./UserForm";
import { canAccessManagement, canManageUsers } from "@/lib/auth/roles";

// Types for the page
type UserWithAccess = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  unit_id: string | null;
  units?: { code: string; name: string };
  super_admin_unit_access?: { unit_id: string }[];
};

export default async function UserManagementPage() {
  const supabase = await createClient();
  const { user } = await (await supabase.auth.getUser()).data;
  
  if (!user) redirect("/login");

  const { profile } = await getProfile(supabase, user.id);

  // Gating: super_admin, admin, dan petugas bisa akses
  if (!canAccessManagement(profile?.role)) {
    redirect("/dashboard");
  }

  const isSuperAdmin = profile?.role === "super_admin";
  const canEdit = isSuperAdmin || profile?.role === "admin";

  // Super Admin: lihat semua user kecuali super_admin lain
  // Admin Unit: hanya lihat user di unit sendiri (tidak tampilkan super_admin)
  let usersQuery = supabase
    .from("users")
    .select(`
      *,
      units!users_unit_id_fkey (code, name),
      super_admin_unit_access (unit_id)
    `)
    .order("created_at", { ascending: false });

  if (isSuperAdmin) {
    // Super Admin melihat semua user
    // (tidak ada filter tambahan)
  } else {
    // Admin hanya melihat user di unitnya, exclude super_admin
    usersQuery = usersQuery
      .eq("unit_id", profile!.unit_id!)
      .neq("role", "super_admin");
  }

  const { data: usersData } = await usersQuery;
  
  // Sort manually to put admins first: super_admin > admin > petugas > viewer
  const rolePriority: Record<string, number> = {
    super_admin: 0,
    admin: 1,
    petugas: 2,
    viewer: 3
  };

  const users = ((usersData ?? []) as UserWithAccess[]).sort((a, b) => {
    const priorityDiff = (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99);
    if (priorityDiff !== 0) return priorityDiff;
    return a.full_name.localeCompare(b.full_name);
  });

  // Fetch All Units for the form/mapping
  let unitsQueryMapping = supabase
    .from("units")
    .select("id, code, name")
    .eq("is_active", true);

  if (profile?.role === "admin" && profile.unit_id) {
    unitsQueryMapping = unitsQueryMapping.eq("id", profile.unit_id);
  }

  const { data: allUnits } = await unitsQueryMapping.order("code");

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Administrator</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              {canEdit ? "Manajemen Pengguna" : "Daftar Pengguna"}
            </h1>
            <p className="text-sm text-slate-400">
              {canEdit 
                ? "Kelola akses, role, dan pembagian unit operasional." 
                : `Daftar personil dan rekan satu unit di ${isSuperAdmin ? "seluruh unit" : ((profile as any)?.units?.name || "Unit")}.`}
            </p>
          </div>
          {canEdit && <UserFormModal units={allUnits || []} currentUserRole={profile?.role ?? 'petugas'} />}
        </div>

        {/* User Stats — berbeda untuk Super Admin vs Admin */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
              <CardDescription className="text-[8px] sm:text-[10px] uppercase tracking-wider truncate">
                {isSuperAdmin ? "Total Pengguna" : "Pengguna Unit"}
              </CardDescription>
              <CardTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-xl">
                <Users className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-emerald-500 shrink-0" />
                {users.length}
              </CardTitle>
            </CardHeader>
          </Card>
          {isSuperAdmin ? (
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
                <CardDescription className="text-[8px] sm:text-[10px] uppercase tracking-wider truncate">Super Admin</CardDescription>
                <CardTitle className="text-base sm:text-xl">
                  {users.filter(u => u.role === 'super_admin').length}
                </CardTitle>
              </CardHeader>
            </Card>
          ) : (
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
                <CardDescription className="text-[8px] sm:text-[10px] uppercase tracking-wider truncate">Admin</CardDescription>
                <CardTitle className="text-base sm:text-xl">
                  {users.filter(u => u.role === 'admin').length}
                </CardTitle>
              </CardHeader>
            </Card>
          )}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
              <CardDescription className="text-[8px] sm:text-[10px] uppercase tracking-wider truncate">
                {isSuperAdmin ? "Unit Aktif" : "Petugas"}
              </CardDescription>
              <CardTitle className="text-base sm:text-xl">
                {isSuperAdmin
                  ? (allUnits?.length || 0)
                  : users.filter(u => u.role === 'petugas').length
                }
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* User Table */}
        <Card className="border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Nama & Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Akses Unit</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-100">{u.full_name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'super_admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        u.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.role === 'super_admin' ? (
                        <div className="flex flex-wrap gap-1">
                          {(u.super_admin_unit_access ?? []).length > 0 ? (
                            (u.super_admin_unit_access ?? []).map((acc) => {
                              const unitInfo = allUnits?.find(au => au.id === acc.unit_id);
                              return (
                                <span key={acc.unit_id} className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-500/10">
                                  {unitInfo?.code || '??'}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-500 text-[10px] italic">Global Access</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Building2 className="h-3 w-3 text-slate-500" />
                          <span className="text-xs font-medium">
                            {u.units?.code || '-'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <form action={async () => { 
                        "use server"; 
                        if (!canEdit) return;
                        await toggleUserStatus(u.id, u.is_active); 
                      }}>
                        <button type="submit" className={!canEdit ? "cursor-default" : "focus:outline-none"} disabled={!canEdit}>
                          {u.is_active ? (
                            <div className="flex items-center justify-center gap-1 text-emerald-400">
                              <ToggleRight className="h-6 w-6" />
                              <span className="text-[10px] font-bold uppercase">Aktif</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-slate-600">
                              <ToggleLeft className="h-6 w-6" />
                              <span className="text-[10px] font-bold uppercase">Mati</span>
                            </div>
                          )}
                        </button>
                      </form>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canEdit ? (
                        <UserEditModal user={u} units={allUnits || []} currentUserRole={profile?.role ?? 'petugas'} />
                      ) : (
                        <span className="text-[10px] text-slate-600 font-bold uppercase">Read Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  );
}
