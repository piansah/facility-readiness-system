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
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  if (!unitId || !name) throw new Error("Unit dan nama bagian wajib diisi.");

  const { supabase } = await requireManager(unitId);
  const { error } = await supabase.from("pm_sections").insert({
    unit_id: unitId,
    name,
    color,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
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
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  if (!unitId || !sectionId || !code || !name) {
    throw new Error("Bagian, kode, dan nama titik PM wajib diisi.");
  }

  const { supabase } = await requireManager(unitId);
  const { error } = await supabase.from("pm_points").insert({
    unit_id: unitId,
    section_id: sectionId,
    code,
    name,
    location_detail: locationDetail || null,
    frequency,
    facility_id: facilityId || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
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
  const shift = String(formData.get("shift") ?? "");
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
    shift: shift || null,
    notes: notes || null,
    created_by: user.id,
    status: "planned",
  });

  if (error) throw new Error(error.message);
  revalidatePath(PATH);
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
