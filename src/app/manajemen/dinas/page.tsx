import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/profile";
import RosterContent from "@/app/manajemen/dinas/RosterContent";
import { startOfMonth, endOfMonth, format } from "date-fns";

import { Suspense } from "react";

export default function DinasPage({ searchParams }: { searchParams: { month?: string } }) {
  return (
    <div className="min-h-dvh bg-slate-950">
      <Suspense fallback={<div className="p-12 text-center text-slate-500 animate-pulse uppercase text-[10px] font-bold tracking-widest">Memuat Jadwal Dinas...</div>}>
        <DinasContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DinasContent({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { profile } = await getProfile(supabase, user.id);
  if (!profile?.is_active) redirect("/dashboard");

  const isSuperAdmin = profile.role === "super_admin";
  
  const selectedMonthStr = (await searchParams).month || format(new Date(), "yyyy-MM");
  const selectedMonth = new Date(selectedMonthStr + "-01");
  const startDate = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

  let userQuery = supabase
    .from("users")
    .select("id, full_name, role, unit_id")
    .eq("is_active", true)
    .in("role", ["admin", "petugas"]);
  
  if (!isSuperAdmin) {
    userQuery = userQuery.eq("unit_id", profile.unit_id);
  }

  let shiftQuery = supabase.from("shift_configs").select("*");
  if (!isSuperAdmin) {
    shiftQuery = shiftQuery.eq("unit_id", profile.unit_id);
  }

  let rosterQuery = supabase
    .from("duty_rosters")
    .select("*")
    .gte("duty_date", startDate)
    .lte("duty_date", endDate);
  
  if (!isSuperAdmin) {
    rosterQuery = rosterQuery.eq("unit_id", profile.unit_id);
  }

  let personnel, shifts, rosters;
  let shouldRedirect = false;

  try {
    const [pRes, sRes, rRes] = await Promise.all([
      userQuery.order("full_name"),
      shiftQuery.order("code"),
      rosterQuery
    ]);

    if (pRes.error || sRes.error || rRes.error) {
      return <div>Database Error</div>;
    }

    // Sort manually: Admin first, then Petugas, then alphabetical by name
    const rolePriority: Record<string, number> = {
      admin: 0,
      petugas: 1,
      viewer: 2
    };

    personnel = (pRes.data || []).sort((a, b) => {
      const priorityDiff = (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99);
      if (priorityDiff !== 0) return priorityDiff;
      return a.full_name.localeCompare(b.full_name);
    });

    shifts = sRes.data;
    rosters = rRes.data;

    if (shifts?.length === 0 && !isSuperAdmin) {
       const defaultShifts = [
         { unit_id: profile.unit_id, code: 'APBA', name: 'Shift Pagi (A)', color_code: '#000000', start_time: '08:00:00', end_time: '20:00:00' },
         { unit_id: profile.unit_id, code: 'APBB', name: 'Shift Malam (B)', color_code: '#10b981', start_time: '20:00:00', end_time: '08:00:00' },
         { unit_id: profile.unit_id, code: 'FREE', name: 'Libur', color_code: '#ef4444', start_time: null, end_time: null },
         { unit_id: profile.unit_id, code: 'AH', name: 'Asrama Haji', color_code: '#f59e0b', start_time: '08:00:00', end_time: '20:00:00' },
         { unit_id: profile.unit_id, code: 'APN7', name: 'Admin Masuk Jam 7', color_code: '#2563eb', start_time: '07:00:00', end_time: '16:00:00' },
         { unit_id: profile.unit_id, code: 'APN8', name: 'Admin Masuk Jam 8', color_code: '#7c3aed', start_time: '08:00:00', end_time: '17:00:00' }
       ];
       await supabase.from("shift_configs").insert(defaultShifts);
       shouldRedirect = true;
    }
  } catch (err) {
    return <div>Error loading roster</div>;
  }

  if (shouldRedirect) {
    redirect(`/manajemen/dinas?month=${selectedMonthStr}`);
  }

  const profileUnitName = (profile as any)?.units?.name;

  const unitName = isSuperAdmin 
    ? "Pusat / Global" 
    : profileUnitName || "Unit Tidak Diketahui";

  return (
    <RosterContent 
      personnel={personnel || []} 
      shifts={shifts || []}
      rosters={rosters || []}
      selectedMonth={selectedMonth}
      unitId={profile.unit_id}
      unitName={unitName}
      adminName={profile.full_name || "Admin"}
      isAdmin={profile.role === 'admin' || isSuperAdmin}
      currentUserId={user.id}
    />
  );
}
