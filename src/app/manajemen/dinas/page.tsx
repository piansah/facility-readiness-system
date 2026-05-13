import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/profile";
import RosterContent from "@/app/manajemen/dinas/RosterContent";
import { startOfMonth, endOfMonth, format } from "date-fns";

export default async function DinasPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { profile } = await getProfile(supabase, user.id);
  if (!profile?.is_active) redirect("/dashboard");

  const isSuperAdmin = profile.role === "super_admin";
  
  // Handle selected month (default to current)
  const selectedMonthStr = (await searchParams).month || format(new Date(), "yyyy-MM");
  const selectedMonth = new Date(selectedMonthStr + "-01");
  const startDate = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

  // 1. Fetch Users in the unit (Filtered by role)
  let userQuery = supabase
    .from("users")
    .select("id, full_name, role, unit_id")
    .eq("is_active", true)
    .in("role", ["admin", "petugas"]);
  
  if (!isSuperAdmin) {
    userQuery = userQuery.eq("unit_id", profile.unit_id);
  }

  // 2. Fetch Shift Configs
  let shiftQuery = supabase
    .from("shift_configs")
    .select("*");
  
  if (!isSuperAdmin) {
    shiftQuery = shiftQuery.eq("unit_id", profile.unit_id);
  }

  // 3. Fetch Existing Roster for the month
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
      return (
        <div className="p-20 text-red-500 bg-slate-950 min-h-screen">
          <h1 className="text-xl font-bold mb-4">Database Error:</h1>
          <pre className="bg-slate-900 p-4 rounded border border-red-500/30 text-xs">
            {JSON.stringify({ personnel: pRes.error, shifts: sRes.error, rosters: rRes.error }, null, 2)}
          </pre>
        </div>
      );
    }

    personnel = pRes.data;
    shifts = sRes.data;
    rosters = rRes.data;

    // Seed default shifts if none exist
    if (shifts?.length === 0 && !isSuperAdmin) {
       const defaultShifts = [
         { unit_id: profile.unit_id, code: 'APBA', name: 'Shift Pagi (A)', color_code: '#000000', start_time: '08:00:00', end_time: '20:00:00' },
         { unit_id: profile.unit_id, code: 'APBB', name: 'Shift Malam (B)', color_code: '#10b981', start_time: '20:00:00', end_time: '08:00:00' },
         { unit_id: profile.unit_id, code: 'FREE', name: 'Libur', color_code: '#ef4444', start_time: null, end_time: null },
         { unit_id: profile.unit_id, code: 'AH', name: 'Asrama Haji', color_code: '#f59e0b', start_time: '08:00:00', end_time: '20:00:00' }
       ];
       await supabase.from("shift_configs").insert(defaultShifts);
       shouldRedirect = true;
    }

    // AUTO-FIX: Jika ada shift yang jam kerjanya masih NULL, kita isi otomatis
    const nullShifts = shifts?.filter(s => !s.start_time && s.code !== 'FREE');
    if (nullShifts && nullShifts.length > 0 && !shouldRedirect) {
      for (const s of nullShifts) {
        const isNight = s.code === 'APBB';
        await supabase.from("shift_configs").update({ 
          start_time: isNight ? '20:00:00' : '08:00:00',
          end_time: isNight ? '08:00:00' : '20:00:00'
        }).eq("unit_id", s.unit_id).eq("code", s.code);
      }
      shouldRedirect = true;
    }

    // AUTO-FIX: Tukar warna Pagi (Hijau -> Hitam) dan Malam (Biru -> Hijau)
    const hasOldColors = shifts?.some(s => (s.code === 'APBA' && s.color_code === '#10b981') || (s.code === 'APBB' && s.color_code === '#3b82f6'));
    if (hasOldColors && !shouldRedirect) {
      await Promise.all([
        supabase.from("shift_configs").update({ color_code: '#000000' }).eq("unit_id", profile.unit_id).eq("code", "APBA"),
        supabase.from("shift_configs").update({ color_code: '#10b981' }).eq("unit_id", profile.unit_id).eq("code", "APBB")
      ]);
      shouldRedirect = true;
    }
  } catch (err: any) {
    return (
      <div className="p-20 text-red-500 bg-slate-950 min-h-screen">
        <h1 className="text-xl font-bold mb-4">Runtime Error:</h1>
        <p className="text-sm">{err.message}</p>
      </div>
    );
  }

  // Handle redirect outside of try-catch
  if (shouldRedirect) {
    redirect(`/manajemen/dinas?month=${selectedMonthStr}`);
  }

  // 4. Fetch Unit Name
  const { data: unit } = await supabase
    .from("units")
    .select("name")
    .eq("id", profile.unit_id)
    .single();

  return (
    <div className="min-h-dvh bg-slate-950">
      <RosterContent 
        personnel={personnel || []} 
        shifts={shifts || []}
        rosters={rosters || []}
        selectedMonth={selectedMonth}
        unitId={profile.unit_id}
        unitName={unit?.name || "Unit"}
        adminName={profile.full_name || "Admin"}
        isAdmin={profile.role === 'admin' || isSuperAdmin}
        currentUserId={user.id}
      />
    </div>
  );
}
