"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { canManageUnit } from "@/lib/auth/roles";

async function requireManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/manajemen/fasilitas");
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active || !canManageUnit(profile.role)) {
    redirect("/dashboard");
  }

  return profile;
}

function makeCategoryCode(name: string) {
  const code = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  return code || `KATEGORI_${Date.now()}`;
}

export async function createFacility(formData: FormData) {
  const manager = await requireManager();
  const admin = createAdminClient();
  const name = String(formData.get("name") ?? "").trim();
  const locationDetail = String(formData.get("location_detail") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const unitId =
    manager.role === "super_admin"
      ? String(formData.get("unit_id") ?? manager.unit_id ?? "")
      : manager.unit_id;

  if (!name || !categoryId || !unitId) {
    redirect("/manajemen/fasilitas?error=incomplete");
  }

  const { data: category, error: categoryError } = await admin
    .from("facility_categories")
    .select("id,unit_id")
    .eq("id", categoryId)
    .single<{ id: string; unit_id: string }>();

  if (categoryError || category?.unit_id !== unitId) {
    redirect("/manajemen/fasilitas?error=category_unit_mismatch");
  }

  const { error } = await admin.from("facilities").insert({
    unit_id: unitId,
    category_id: categoryId,
    name,
    location_detail: locationDetail || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_active: true,
  });

  if (error) {
    redirect(`/manajemen/fasilitas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manajemen/fasilitas");
  redirect("/manajemen/fasilitas");
}

export async function createFacilityCategory(formData: FormData) {
  const manager = await requireManager();
  const admin = createAdminClient();
  const name = String(formData.get("category_name") ?? "").trim();
  const icon = String(formData.get("category_icon") ?? "").trim();
  const sortOrder = Number(formData.get("category_sort_order") ?? 0);
  const unitId =
    manager.role === "super_admin"
      ? String(formData.get("category_unit_id") ?? manager.unit_id ?? "")
      : manager.unit_id;

  if (!name || !unitId) {
    redirect("/manajemen/fasilitas?error=incomplete_category");
  }

  const { error } = await admin.from("facility_categories").insert({
    unit_id: unitId,
    code: makeCategoryCode(name),
    name,
    icon: icon || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  });

  if (error) {
    redirect(`/manajemen/fasilitas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manajemen/fasilitas");
  redirect("/manajemen/fasilitas");
}

export async function updateFacility(formData: FormData) {
  const manager = await requireManager();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const locationDetail = String(formData.get("location_detail") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  const isActive = formData.get("is_active") === "true";

  if (!id || !name || !categoryId) {
    redirect("/manajemen/fasilitas?error=incomplete");
  }

  const { data: facility, error: facilityError } = await admin
    .from("facilities")
    .select("id,unit_id")
    .eq("id", id)
    .single<{ id: string; unit_id: string }>();

  if (facilityError || !facility) {
    redirect("/manajemen/fasilitas?error=facility_not_found");
  }

  if (manager.role !== "super_admin" && facility.unit_id !== manager.unit_id) {
    redirect("/manajemen/fasilitas?error=wrong_unit");
  }

  const { data: category, error: categoryError } = await admin
    .from("facility_categories")
    .select("id,unit_id")
    .eq("id", categoryId)
    .single<{ id: string; unit_id: string }>();

  if (categoryError || category?.unit_id !== facility.unit_id) {
    redirect("/manajemen/fasilitas?error=category_unit_mismatch");
  }

  const { error } = await admin
    .from("facilities")
    .update({
      name,
      location_detail: locationDetail || null,
      category_id: categoryId,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) {
    redirect(`/manajemen/fasilitas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manajemen/fasilitas");
  redirect("/manajemen/fasilitas");
}

export async function deleteFacility(formData: FormData) {
  const manager = await requireManager();
  const admin = createAdminClient();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    redirect("/manajemen/fasilitas?error=incomplete");
  }

  const { data: facility, error: facilityError } = await admin
    .from("facilities")
    .select("id,unit_id")
    .eq("id", id)
    .single<{ id: string; unit_id: string }>();

  if (facilityError || !facility) {
    redirect("/manajemen/fasilitas?error=facility_not_found");
  }

  if (manager.role !== "super_admin" && facility.unit_id !== manager.unit_id) {
    redirect("/manajemen/fasilitas?error=wrong_unit");
  }

  const { error } = await admin.from("facilities").delete().eq("id", id);

  if (error) {
    redirect(`/manajemen/fasilitas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manajemen/fasilitas");
  redirect("/manajemen/fasilitas");
}

export async function deleteFacilityCategory(formData: FormData) {
  const manager = await requireManager();
  const admin = createAdminClient();
  const id = String(formData.get("category_id") ?? "");

  if (!id) {
    redirect("/manajemen/fasilitas?error=incomplete_category");
  }

  let query = admin.from("facility_categories").delete().eq("id", id);

  if (manager.role !== "super_admin" && manager.unit_id) {
    query = query.eq("unit_id", manager.unit_id);
  }

  const { error } = await query;

  if (error) {
    redirect(`/manajemen/fasilitas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manajemen/fasilitas");
  redirect("/manajemen/fasilitas");
}

async function requireSuperAdmin() {
  const profile = await requireManager();

  if (profile.role !== "super_admin") {
    redirect("/manajemen/fasilitas?error=super_admin_only");
  }

  return profile;
}

export async function createUnit(formData: FormData) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const code = String(formData.get("unit_code") ?? "").trim().toUpperCase();
  const name = String(formData.get("unit_name") ?? "").trim();

  if (!code || !name) {
    redirect("/manajemen/fasilitas?error=incomplete_unit");
  }

  const { error } = await admin.from("units").insert({
    code,
    name,
    is_active: true,
  });

  if (error) {
    redirect(`/manajemen/fasilitas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manajemen/fasilitas");
  redirect("/manajemen/fasilitas");
}

export async function updateUnit(formData: FormData) {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const id = String(formData.get("unit_id") ?? "");
  const name = String(formData.get("unit_name") ?? "").trim();
  const isActive = formData.get("unit_is_active") === "true";

  if (!id || !name) {
    redirect("/manajemen/fasilitas?error=incomplete_unit");
  }

  const { error } = await admin
    .from("units")
    .update({
      name,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) {
    redirect(`/manajemen/fasilitas?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/manajemen/fasilitas");
  redirect("/manajemen/fasilitas");
}
