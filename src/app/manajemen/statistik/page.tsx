import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/profile";
import { canAccessManagement } from "@/lib/auth/roles";
import StatistikContent from "@/app/manajemen/statistik/StatistikContent";

export default async function StatistikPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active) {
    redirect("/dashboard?error=forbidden");
  }

  const isSuperAdmin = profile.role === "super_admin";

  // Fetch all incidents for this unit (or all units if super admin)
  let query = supabase
    .from("incidents")
    .select(`
      id,
      result_status,
      handler_type,
      incident_time,
      facilities (name)
    `);

  if (!isSuperAdmin) {
    // We need to filter by unit_id. Incidents are linked to daily_reports which have unit_id.
    // However, for performance and simplicity in statistics, it's better if incidents had unit_id.
    // Let's assume we filter via daily_reports.
    const { data: reports } = await supabase
      .from("daily_reports")
      .select("id")
      .eq("unit_id", profile.unit_id);
    
    const reportIds = reports?.map(r => r.id) || [];
    query = query.in("daily_report_id", reportIds);
  }

  const { data: incidents, error } = await query;

  const formattedIncidents = (incidents || []).map((incident: any) => ({
    ...incident,
    facilities: Array.isArray(incident.facilities) ? incident.facilities[0] : incident.facilities
  }));

  if (error) {
    console.error("Error fetching stats:", error);
  }

  return (
    <div className="min-h-dvh bg-slate-950">
      <StatistikContent initialData={formattedIncidents} unitName={isSuperAdmin ? 'Seluruh Unit' : 'Unit Terkait'} />
    </div>
  );
}
