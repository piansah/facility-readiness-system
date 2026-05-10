import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppProfile } from "./roles";

export async function getAccessibleUnitIds(supabase: SupabaseClient, profile: AppProfile) {
  if (profile.role !== "super_admin") {
    return profile.unit_id ? [profile.unit_id] : [];
  }

  const { data } = await supabase
    .from("super_admin_unit_access")
    .select("unit_id")
    .eq("user_id", profile.id)
    .returns<{ unit_id: string }[]>();

  return data?.map((access) => access.unit_id) ?? [];
}

export async function canAccessUnit(supabase: SupabaseClient, profile: AppProfile, unitId: string | null | undefined) {
  if (!unitId) {
    return false;
  }

  if (profile.role !== "super_admin") {
    return profile.unit_id === unitId;
  }

  const accessibleUnitIds = await getAccessibleUnitIds(supabase, profile);
  return accessibleUnitIds.length === 0 || accessibleUnitIds.includes(unitId);
}
