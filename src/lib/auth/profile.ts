import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppProfile } from "./roles";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select(`
      *,
      assigned_unit:unit_id (name)
    `)
    .eq("id", userId)
    .single();

  if (error) {
    console.error("GET PROFILE ERROR:", error);
    return { profile: null, error };
  }

  // Normalisasi: Tangani jika assigned_unit adalah array atau objek
  const rawUnit = (data as any).assigned_unit;
  const unitData = Array.isArray(rawUnit) ? rawUnit[0] : rawUnit;

  return { 
    profile: { ...data, units: unitData } as AppProfile & { units: { name: string } | null }, 
    error: null 
  };
}
