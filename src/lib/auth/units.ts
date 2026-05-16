import { createAdminClient } from "@/lib/supabase/admin";

export async function getAllUnitsSafe() {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("units")
    .select("id, code, name")
    .eq("is_active", true)
    .order("code");

  if (error) {
    console.error("GET ALL UNITS SAFE ERROR:", error);
    return [];
  }

  return data || [];
}

export async function getUnitSafe(unitId: string) {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("units")
    .select("id, code, name")
    .eq("id", unitId)
    .single();

  if (error) {
    console.error("GET UNIT SAFE ERROR:", error);
    return null;
  }

  return data;
}
