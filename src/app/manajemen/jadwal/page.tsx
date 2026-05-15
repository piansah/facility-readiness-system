import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/profile";
import CalendarContent from "./CalendarContent";

import { Suspense } from "react";

export default function JadwalPage() {
  return (
    <div className="min-h-dvh bg-slate-950">
      <Suspense fallback={<div className="p-6 h-full flex items-center justify-center text-slate-500">Memuat Kalender...</div>}>
        <JadwalContent />
      </Suspense>
    </div>
  );
}

async function JadwalContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { profile } = await getProfile(supabase, user.id);
  if (!profile?.is_active) redirect("/dashboard");

  const isSuperAdmin = profile.role === "super_admin";

  let query = supabase
    .from("preventive_schedules")
    .select(`
      *,
      facilities (name, location_detail)
    `)
    .order("planned_date", { ascending: true });

  if (!isSuperAdmin) {
    query = query.eq("unit_id", profile.unit_id);
  }

  let facQuery = supabase
    .from("facilities")
    .select("id, name, location_detail")
    .eq("is_active", true);

  if (!isSuperAdmin) {
    facQuery = facQuery.eq("unit_id", profile.unit_id);
  }

  const [{ data: schedules }, { data: facilities }] = await Promise.all([
    query,
    facQuery.order("name")
  ]);

  return (
    <CalendarContent 
      initialSchedules={schedules || []} 
      facilities={facilities || []}
      userUnitId={profile.unit_id}
      isAdmin={profile.role === 'admin' || isSuperAdmin}
    />
  );
}
