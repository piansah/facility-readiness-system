import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Box, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryListPanel } from "./category-list-panel";
import { FacilityHeaderActions } from "./facility-header-actions";
import { FacilityRowActions } from "./facility-row-actions";
import { BulkQRButton } from "./bulk-qr-button";
import { canAccessManagement, canManageFacilities, canManageUnits } from "@/lib/auth/roles";

type Unit = {
  id: string;
  code: string;
  name: string;
  is_active?: boolean;
};

type Category = {
  id: string;
  name: string;
  icon: string | null;
  unit_id: string;
};

type Facility = {
  id: string;
  name: string;
  location_detail: string | null;
  category_id: string;
  sort_order: number | null;
  is_active: boolean;
  facility_categories: {
    name: string;
    icon: string | null;
  } | null;
};

export default async function FacilityManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string; category?: string }>;
}) {
  const params = await searchParams;
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

  // Fetch all units for sidebar/filter
  let unitsQuery = supabase
    .from("units")
    .select("*")
    .order("code");

  // Admin hanya boleh lihat unitnya sendiri di kueri
  if (profile?.role === "admin" && profile.unit_id) {
    unitsQuery = unitsQuery.eq("id", profile.unit_id);
  }

  const { data: units } = await unitsQuery.returns<Unit[]>();

  // Fetch categories
  const { data: categories } = await supabase
    .from("facility_categories")
    .select("*")
    .order("sort_order")
    .returns<Category[]>();

  // Admin/Petugas: default ke unit sendiri. Super Admin: gunakan query param atau unit pertama.
  const selectedUnitId = params.unit || (profile?.role !== "super_admin" ? profile?.unit_id : units?.[0]?.id) || "";

  // Fetch facilities for selected unit
  const { data: facilities } = await supabase
    .from("facilities")
    .select(`
      *,
      facility_categories (name, icon)
    `)
    .eq("unit_id", selectedUnitId)
    .order("name")
    .returns<Facility[]>();

  const selectedUnitCategories = (categories ?? []).filter((category) => category.unit_id === selectedUnitId);

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Infrastruktur</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              {canEdit ? "Manajemen Fasilitas" : "Daftar Aset"}
            </h1>
            <p className="text-sm text-slate-400">
              {canEdit ? "Konfigurasi unit, kategori, dan daftar aset operasional." : "Daftar aset operasional dan informasi penempatan."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canEdit && (
              <FacilityHeaderActions
                units={units ?? []}
                categories={categories ?? []}
                selectedUnitId={selectedUnitId}
                isSuperAdmin={isSuperAdmin}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sisi Kiri (1 Kolom): Sidebar Unit (SA) & Daftar Kategori */}
          <div className="space-y-6 lg:col-span-1">
            {isSuperAdmin && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input className="pl-9 bg-slate-900/50 border-slate-800 h-9 text-xs" placeholder="Cari unit..." />
                </div>
                <div className="space-y-1">
                  {units?.map((u) => (
                    <Link
                      key={u.id}
                      href={`/manajemen/fasilitas?unit=${u.id}`}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${selectedUnitId === u.id
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                        }`}
                    >
                      <span className="font-medium">{u.code}</span>
                      <span className="text-[10px] opacity-50">{u.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Daftar Kategori di Sidebar */}
            <CategoryListPanel
              categories={categories ?? []}
              selectedUnitId={selectedUnitId}
            />
          </div>

          {/* Sisi Kanan (3 Kolom): Daftar Fasilitas */}
          <div className="space-y-4 lg:col-span-3">
            <Card className="border-slate-800 bg-slate-900/40 overflow-hidden">
              <CardHeader className="border-b border-slate-800/50 bg-slate-900/20 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm sm:text-lg uppercase font-bold tracking-tight">
                      DAFTAR ASET - {units?.find(u => u.id === selectedUnitId)?.name}
                    </CardTitle>
                    <Badge className="bg-slate-800 text-slate-400 text-[10px] whitespace-nowrap shrink-0">
                      {facilities?.length || 0} Aset
                    </Badge>
                  </div>
                  <BulkQRButton 
                    facilities={facilities ?? []} 
                    unitName={units?.find(u => u.id === selectedUnitId)?.name || ""} 
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Nama Aset</th>
                        <th className="px-6 py-4">Kategori</th>
                        <th className="px-6 py-4">Tempat/Lokasi</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {facilities?.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-200">
                            {f.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-400">{f.facility_categories?.name}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 italic">
                            {f.location_detail || "-"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <FacilityRowActions facility={f} categories={selectedUnitCategories} />
                          </td>
                        </tr>
                      ))}
                      {(!facilities || facilities.length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                            Belum ada fasilitas terdaftar di unit ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
