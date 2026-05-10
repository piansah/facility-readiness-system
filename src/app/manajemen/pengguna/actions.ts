"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/profile";
import type { UserRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const validRoles = ["super_admin", "admin", "petugas", "viewer"] as const;

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/manajemen/pengguna");
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active || profile.role !== "super_admin") {
    redirect("/dashboard");
  }
}

function readRole(value: FormDataEntryValue | null): UserRole {
  const role = String(value ?? "");
  return validRoles.includes(role as UserRole) ? (role as UserRole) : "viewer";
}

export async function createUser(formData: FormData) {
  await requireSuperAdmin();

  const adminClient = createAdminClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = readRole(formData.get("role"));
  const unitId = String(formData.get("unit_id") ?? "");
  const assignedUnits = formData.getAll("assigned_units").map(String).filter(Boolean);

  if (!email || !password || !fullName) {
    return { error: "Nama, email, dan password wajib diisi." };
  }

  // 1. Create User in Supabase Auth
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    return { error: authError.message };
  }

  const userId = authUser.user.id;

  // 2. Create Profile in public.users
  const { error: profileError } = await adminClient.from("users").insert({
    id: userId,
    email,
    full_name: fullName,
    role,
    unit_id: role === "super_admin" ? null : (unitId || null),
    is_active: true,
  });

  if (profileError) {
    // Cleanup auth user if profile fails
    await adminClient.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  // 3. Handle Multi-Unit Access for Super Admin
  if (role === "super_admin" && assignedUnits.length > 0) {
    const accessRows = assignedUnits.map(uid => ({
      user_id: userId,
      unit_id: uid,
    }));
    await adminClient.from("super_admin_unit_access").insert(accessRows);
  }

  revalidatePath("/manajemen/pengguna");
  return { success: true };
}

export async function updateUserAccess(userId: string, assignedUnits: string[]) {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  // 1. Clear existing access
  await adminClient.from("super_admin_unit_access").delete().eq("user_id", userId);

  // 2. Add new access
  if (assignedUnits.length > 0) {
    const accessRows = assignedUnits.map(uid => ({
      user_id: userId,
      unit_id: uid,
    }));
    const { error } = await adminClient.from("super_admin_unit_access").insert(accessRows);
    if (error) return { error: error.message };
  }

  revalidatePath("/manajemen/pengguna");
  return { success: true };
}

export async function updateUser(formData: FormData) {
  await requireSuperAdmin();

  const adminClient = createAdminClient();
  const userId = String(formData.get("user_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = readRole(formData.get("role"));
  const unitId = String(formData.get("unit_id") ?? "");
  const assignedUnits = formData.getAll("assigned_units").map(String).filter(Boolean);

  if (!userId || !email || !fullName) {
    return { error: "Data pengguna belum lengkap." };
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    email,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    return { error: authError.message };
  }

  const { error: profileError } = await adminClient
    .from("users")
    .update({
      email,
      full_name: fullName,
      role,
      unit_id: role === "super_admin" ? null : unitId || null,
    })
    .eq("id", userId);

  if (profileError) {
    return { error: profileError.message };
  }

  await adminClient.from("super_admin_unit_access").delete().eq("user_id", userId);

  if (role === "super_admin" && assignedUnits.length > 0) {
    const { error } = await adminClient.from("super_admin_unit_access").insert(
      assignedUnits.map((assignedUnitId) => ({
        user_id: userId,
        unit_id: assignedUnitId,
      })),
    );

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/manajemen/pengguna");
  return { success: true };
}

export async function toggleUserStatus(userId: string, currentStatus: boolean) {
  await requireSuperAdmin();
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("users")
    .update({ is_active: !currentStatus })
    .eq("id", userId);

  if (error) return { error: error.message };
  
  revalidatePath("/manajemen/pengguna");
  return { success: true };
}
