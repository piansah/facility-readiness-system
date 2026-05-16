import { SupabaseClient } from "@supabase/supabase-js";
import type { AppProfile } from "./roles";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select(`
      *,
      units:unit_id (
        name
      )
    `)
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("GET PROFILE ERROR:", error);
    return { profile: null, error };
  }

  // Normalisasi: Pastikan 'units' selalu dalam bentuk objek { name: string }
  const rawUnit = (data as any).units;
  const normalizedUnit = Array.isArray(rawUnit) ? rawUnit[0] : rawUnit;

  return { 
    profile: {
      ...data,
      units: normalizedUnit ? { name: normalizedUnit.name } : null
    } as AppProfile & { units: { name: string } | null }, 
    error: null 
  };
}
