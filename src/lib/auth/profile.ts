import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppProfile } from "./roles";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,full_name,role,unit_id,is_active")
    .eq("id", userId)
    .single<AppProfile>();

  if (error) {
    return { profile: null, error };
  }

  return { profile: data, error: null };
}
