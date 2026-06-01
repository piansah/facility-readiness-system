import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import CalendarContent from "./CalendarContent";

type Section = {
  id: string;
  unit_id: string;
  name: string;
  color: string;
  sort_order: number;
};

type Point = {
  id: string;
  unit_id: string;
  section_id: string;
  code: string;
  name: string;
  location_detail: string | null;
  frequency: string;
  facility_id: string | null;
  sort_order: number;
};

type Schedule = {
  id: string;
  unit_id: string;
  section_id: string;
  point_id: string;
  assigned_user_id: string | null;
  scheduled_date: string;
  shift: string | null;
  status: "planned" | "ongoing" | "completed" | "missed";
  notes: string | null;
  pm_sections: { name: string; color: string } | null;
  pm_points: { code: string; name: string; location_detail: string | null } | null;
  users: { full_name: string } | null;
};

type Staff = {
  id: string;
  full_name: string;
  role: string;
};

type UnitOption = {
  id: string;
  code: string;
  name: string;
};

type Facility = {
  id: string;
  name: string;
  location_detail: string | null;
};

export default function JadwalPage() {
  return (
    <div className="min-h-dvh bg-slate-950">
      <Suspense fallback={<div className="flex min-h-dvh items-center justify-center p-6 text-slate-500">Memuat jadwal PM...</div>}>
        <JadwalContent />
      </Suspense>
    </div>
  );
}

async function JadwalContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { profile } = await getProfile(supabase, user.id);
  if (!profile?.is_active) redirect("/dashboard");

  const isSuperAdmin = profile.role === "super_admin";
  const isAdmin = profile.role === "admin" || isSuperAdmin;

  let unitIds: string[] = [];
  let units: UnitOption[] = [];

  if (isSuperAdmin) {
    const { data: assignedUnits } = await supabase
      .from("super_admin_unit_access")
      .select("unit_id")
      .eq("user_id", user.id);

    const assignedUnitIds = (assignedUnits ?? []).map((item) => item.unit_id as string);
    let unitsQuery = supabase.from("units").select("id, code, name").eq("is_active", true).order("code");
    if (assignedUnitIds.length > 0) unitsQuery = unitsQuery.in("id", assignedUnitIds);
    const { data: unitData } = await unitsQuery.returns<UnitOption[]>();
    units = unitData ?? [];
    unitIds = units.map((unit) => unit.id);
  } else if (profile.unit_id) {
    const { data: unitData } = await supabase
      .from("units")
      .select("id, code, name")
      .eq("id", profile.unit_id)
      .maybeSingle<UnitOption>();
    units = unitData ? [unitData] : [];
    unitIds = [profile.unit_id];
  }

  if (unitIds.length === 0) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-center text-slate-400">
        Tidak ada unit yang bisa ditampilkan.
      </main>
    );
  }

  const [sectionsResult, pointsResult, schedulesResult, staffResult, facilitiesResult] = await Promise.all([
    supabase
      .from("pm_sections")
      .select("id, unit_id, name, color, sort_order")
      .in("unit_id", unitIds)
      .eq("is_active", true)
      .order("sort_order")
      .returns<Section[]>(),
    supabase
      .from("pm_points")
      .select("id, unit_id, section_id, code, name, location_detail, frequency, facility_id, sort_order")
      .in("unit_id", unitIds)
      .eq("is_active", true)
      .order("sort_order")
      .returns<Point[]>(),
    supabase
      .from("pm_schedules")
      .select(`
        id,
        unit_id,
        section_id,
        point_id,
        assigned_user_id,
        scheduled_date,
        shift,
        status,
        notes,
        pm_sections (name, color),
        pm_points (code, name, location_detail),
        users!pm_schedules_assigned_user_id_fkey (full_name)
      `)
      .in("unit_id", unitIds)
      .order("scheduled_date")
      .returns<Schedule[]>(),
    supabase
      .from("users")
      .select("id, full_name, role")
      .in("unit_id", unitIds)
      .eq("is_active", true)
      .order("full_name")
      .returns<Staff[]>(),
    supabase
      .from("facilities")
      .select("id, name, location_detail")
      .in("unit_id", unitIds)
      .eq("is_active", true)
      .order("name")
      .returns<Facility[]>(),
  ]);

  return (
    <CalendarContent
      initialSchedules={schedulesResult.data ?? []}
      sections={sectionsResult.data ?? []}
      points={pointsResult.data ?? []}
      staff={staffResult.data ?? []}
      facilities={facilitiesResult.data ?? []}
      units={units}
      defaultUnitId={unitIds[0]}
      isAdmin={isAdmin}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
