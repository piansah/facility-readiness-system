import { SupabaseClient } from "@supabase/supabase-js";
import type { AppProfile } from "./roles";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  // Tahap 1: Ambil data profil dasar
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    console.error("GET PROFILE ERROR:", userError);
    return { profile: null, error: userError };
  }

  // Tahap 2: Ambil data unit secara terpisah (Safe Fetch)
  let unitName = null;
  if (userData.unit_id) {
    const { data: unitData } = await supabase
      .from("units")
      .select("name")
      .eq("id", userData.unit_id)
      .maybeSingle();
    unitName = unitData?.name || null;
  }

  return { 
    profile: {
      ...userData,
      units: unitName ? { name: unitName } : null
    } as AppProfile & { units: { name: string } | null }, 
    error: null 
  };
}
