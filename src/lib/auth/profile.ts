import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppProfile } from "./roles";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*, units(name), units!users_unit_id_fkey(name)")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("GET PROFILE ERROR:", error);
    return { profile: null, error };
  }

  // Normalisasi: Ambil nama unit dari salah satu relasi yang berhasil
  const rawUnits = (data as any).units || (data as any)["units!users_unit_id_fkey"];
  const unitObj = Array.isArray(rawUnits) ? rawUnits[0] : rawUnits;

  return { 
    profile: {
      ...data,
      units: unitObj ? { name: unitObj.name } : null
    } as AppProfile & { units: { name: string } | null }, 
    error: null 
  };
}
