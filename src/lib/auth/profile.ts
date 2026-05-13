import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppProfile } from "./roles";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,full_name,role,unit_id,is_active, units(code, name)")
    .eq("id", userId)
    .single<AppProfile>();

  if (error) {
    console.error("GET PROFILE ERROR:", error);
    throw new Error(`Gagal mengambil profil dari Supabase: ${error.message}`);
  }

  return { profile: data, error: null };
}
