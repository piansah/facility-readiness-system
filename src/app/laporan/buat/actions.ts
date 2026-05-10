"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { canCreateReports } from "@/lib/auth/roles";

type StaffSnapshot = {
  id: string;
  name: string;
  role: string;
};

export async function saveDailyReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getProfile(supabase, user.id);
  if (!profile?.is_active || !canCreateReports(profile.role)) {
    redirect("/dashboard");
  }

  const intent = (formData.get("intent") ?? "draft") as "draft" | "submitted";
  const reportDate = String(formData.get("report_date") ?? "");
  const shift = String(formData.get("shift") ?? "pagi");
  const facilityIds = formData.getAll("facility_id").map(String);
  const unitId = profile.unit_id;
  const currentStaffIds = formData.getAll("current_staff_id").map(String).filter(Boolean);
  const nextStaffIds = formData.getAll("next_staff_id").map(String).filter(Boolean);

  if (!unitId || !reportDate || !facilityIds.length) {
    redirect("/laporan/buat?error=incomplete");
  }

  const { data: validFacilities, error: facilityError } = await supabase
    .from("facilities")
    .select("id")
    .eq("unit_id", unitId)
    .eq("is_active", true)
    .in("id", facilityIds)
    .returns<{ id: string }[]>();

  if (facilityError) {
    redirect(`/laporan/buat?error=${encodeURIComponent(facilityError.message)}`);
  }

  const validFacilityIds = new Set(validFacilities?.map((facility) => facility.id) ?? []);
  if (validFacilityIds.size !== facilityIds.length) {
    redirect("/laporan/buat?error=invalid_facility");
  }

  const selectedStaffIds = Array.from(new Set([...currentStaffIds, ...nextStaffIds]));
  let currentShiftStaff: StaffSnapshot[] = [];
  let nextShiftStaff: StaffSnapshot[] = [];

  if (selectedStaffIds.length > 0) {
    const { data: staffUsers, error: staffError } = await supabase
      .from("users")
      .select("id,full_name,role")
      .eq("unit_id", unitId)
      .eq("is_active", true)
      .in("id", selectedStaffIds)
      .returns<{ id: string; full_name: string; role: string }[]>();

    if (staffError) {
      redirect(`/laporan/buat?error=${encodeURIComponent(staffError.message)}`);
    }

    const staffById = new Map(
      (staffUsers ?? []).map((s) => [
        s.id,
        { id: s.id, name: s.full_name, role: s.role },
      ]),
    );

    if (staffById.size !== selectedStaffIds.length) {
      redirect("/laporan/buat?error=invalid_staff");
    }

    currentShiftStaff = currentStaffIds.map((id) => staffById.get(id)).filter((s): s is StaffSnapshot => Boolean(s));
    nextShiftStaff = nextStaffIds.map((id) => staffById.get(id)).filter((s): s is StaffSnapshot => Boolean(s));
  }

  const { data: report, error: reportError } = await supabase
    .from("daily_reports")
    .upsert(
      {
        unit_id: unitId,
        created_by: user.id,
        report_date: reportDate,
        shift,
        status: intent,
        current_shift_staff: currentShiftStaff,
        next_shift_staff: nextShiftStaff,
      },
      {
        onConflict: "unit_id,report_date,shift",
      },
    )
    .select("id")
    .single<{ id: string }>();

  if (reportError || !report) {
    redirect(`/laporan/buat?error=${encodeURIComponent(reportError?.message ?? "report")}`);
  }

  const statusRows = facilityIds.map((facilityId) => ({
    daily_report_id: report.id,
    facility_id: facilityId,
    checked_by: user.id,
    status: String(formData.get(`status_${facilityId}`) ?? "normal"),
    notes: String(formData.get(`note_${facilityId}`) ?? "").trim() || null,
  }));

  const { error: logsError } = await supabase
    .from("facility_status_logs")
    .upsert(statusRows, { onConflict: "daily_report_id,facility_id" });

  if (logsError) {
    redirect(`/laporan/buat?error=${encodeURIComponent(logsError.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/laporan");
  redirect("/dashboard");
}
