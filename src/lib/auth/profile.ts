import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppProfile } from "./roles";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*, units(name)")
    .eq("id", userId)
    .single<AppProfile & { units: { name: string } | null }>();

  if (error) {
    console.error("GET PROFILE ERROR:", error);
    return { profile: null, error };
  }

  return { profile: data, error: null };
}
