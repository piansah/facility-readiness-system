"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";

const PATH = "/manajemen/jadwal";

async function requireManager(unitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { profile } = await getProfile(supabase, user.id);
  const isSuperAdmin = profile?.role === "super_admin";
  const isUnitAdmin = profile?.role === "admin" && profile.unit_id === unitId;

  if (!profile?.is_active || (!isSuperAdmin && !isUnitAdmin)) {
    redirect("/dashboard?error=forbidden");
  }

  return { supabase, user };
}

export async function createSection(formData: FormData) {
  const unitId = String(formData.get("unit_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "amber");

  if (!unitId || !name) throw new Error("Unit dan nama bagian wajib diisi.");

  const { supabase } = await requireManager(unitId);

  // Auto-calculate next sort_order
  let sortOrder = 10;
  const { data: maxSection } = await supabase
    .from("pm_sections")
    .select("sort_order")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  if (maxSection) {
    sortOrder = maxSection.sort_order + 10;
  }

  const { error } = await supabase.from("pm_sections").insert({
    unit_id: unitId,
    name,
    color,
    sort_order: sortOrder,
  });

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function createPoint(formData: FormData) {
  const unitId = String(formData.get("unit_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const locationDetail = String(formData.get("location_detail") ?? "").trim();
  const frequency = String(formData.get("frequency") ?? "monthly");
  const facilityId = String(formData.get("facility_id") ?? "");

  if (!unitId || !sectionId || !code || !name) {
    throw new Error("Bagian, kode, dan nama titik PM wajib diisi.");
  }

  const { supabase } = await requireManager(unitId);

  // Auto-calculate next sort_order
  let sortOrder = 10;
  const { data: maxPoint } = await supabase
    .from("pm_points")
    .select("sort_order")
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();

  if (maxPoint) {
    sortOrder = maxPoint.sort_order + 10;
  }

  const { error } = await supabase.from("pm_points").insert({
    unit_id: unitId,
    section_id: sectionId,
    code,
    name,
    location_detail: locationDetail || null,
    frequency,
    facility_id: facilityId || null,
    sort_order: sortOrder,
  });

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function createPmSchedule(formData: FormData) {
  const unitId = String(formData.get("unit_id") ?? "");
  const pointId = String(formData.get("point_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");
  const assignedUserId = String(formData.get("assigned_user_id") ?? "");
  const scheduledDate = String(formData.get("scheduled_date") ?? "");
  const shift = String(formData.get("shift") ?? "pagi");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!unitId || !pointId || !sectionId || !scheduledDate) {
    throw new Error("Tanggal dan titik PM wajib diisi.");
  }

  const { supabase, user } = await requireManager(unitId);
  const { error } = await supabase.from("pm_schedules").insert({
    unit_id: unitId,
    section_id: sectionId,
    point_id: pointId,
    assigned_user_id: assignedUserId || null,
    scheduled_date: scheduledDate,
    shift: shift || "pagi",
    notes: notes || null,
    created_by: user.id,
    status: "planned",
  });

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function createPmScheduleQuick(input: {
  unitId: string;
  sectionId: string;
  pointId: string;
  scheduledDate: string;
  shift: string;
}) {
  const unitId = input.unitId;
  const sectionId = input.sectionId;
  const pointId = input.pointId;
  const scheduledDate = input.scheduledDate;
  const shift = input.shift || "pagi";

  if (!unitId || !pointId || !sectionId || !scheduledDate) {
    throw new Error("Tanggal dan titik PM wajib diisi.");
  }

  const { supabase, user } = await requireManager(unitId);
  const { data, error } = await supabase.from("pm_schedules").insert({
    unit_id: unitId,
    section_id: sectionId,
    point_id: pointId,
    assigned_user_id: null,
    scheduled_date: scheduledDate,
    shift,
    notes: null,
    created_by: user.id,
    status: "planned",
  }).select(`
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
  `).single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updatePmScheduleStatus(id: string, status: string) {
  const supabase = await createClient();
  const { data: schedule, error: scheduleError } = await supabase
    .from("pm_schedules")
    .select("unit_id")
    .eq("id", id)
    .single<{ unit_id: string }>();

  if (scheduleError || !schedule) throw new Error(scheduleError?.message ?? "Jadwal tidak ditemukan.");

  await requireManager(schedule.unit_id);
  const { error } = await supabase.from("pm_schedules").update({ status }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function deletePmScheduleQuick(id: string) {
  const supabase = await createClient();
  const { data: schedule, error: scheduleError } = await supabase
    .from("pm_schedules")
    .select("unit_id")
    .eq("id", id)
    .single<{ unit_id: string }>();

  if (scheduleError || !schedule) throw new Error(scheduleError?.message ?? "Jadwal tidak ditemukan.");

  await requireManager(schedule.unit_id);
  const { error } = await supabase.from("pm_schedules").delete().eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deletePmSchedule(id: string) {
  const supabase = await createClient();
  const { data: schedule, error: scheduleError } = await supabase
    .from("pm_schedules")
    .select("unit_id")
    .eq("id", id)
    .single<{ unit_id: string }>();

  if (scheduleError || !schedule) throw new Error(scheduleError?.message ?? "Jadwal tidak ditemukan.");

  await requireManager(schedule.unit_id);
  const { error } = await supabase.from("pm_schedules").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}
