"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createSchedule(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const plannedDate = formData.get("planned_date") as string;
  const facilityId = formData.get("facility_id") as string;
  const unitId = formData.get("unit_id") as string;

  if (!title || !plannedDate || !unitId) {
    throw new Error("Mohon lengkapi data yang wajib diisi.");
  }

  const { error } = await supabase
    .from("preventive_schedules")
    .insert({
      title,
      description,
      planned_date: plannedDate,
      facility_id: facilityId || null,
      unit_id: unitId,
      created_by: user.id,
      status: 'planned'
    });

  if (error) {
    console.error("Gagal membuat jadwal:", error);
    throw new Error(error.message);
  }

  revalidatePath("/manajemen/jadwal");
  revalidatePath("/dashboard");
}

export async function updateScheduleStatus(id: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("preventive_schedules")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/manajemen/jadwal");
  revalidatePath("/dashboard");
}

export async function deleteSchedule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("preventive_schedules")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/manajemen/jadwal");
  revalidatePath("/dashboard");
}
