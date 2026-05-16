import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppProfile } from "./roles";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    console.error("GET PROFILE ERROR:", userError);
    return { profile: null, error: userError };
  }

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
