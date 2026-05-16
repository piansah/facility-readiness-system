import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppProfile } from "./roles";

export async function getProfile(supabase: SupabaseClient, userId: string) {
  // Tahap 1: Ambil profil dasar menggunakan client anonim (sesuai sesi user)
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !userData) {
    console.error("GET PROFILE ERROR:", userError);
    return { profile: null, error: userError };
  }

  // Tahap 2: Ambil nama unit menggunakan admin client (bypass RLS)
  // Ini krusial agar Petugas bisa melihat nama unitnya sendiri
  let unitName = null;
  if (userData.unit_id) {
    const adminSupabase = createAdminClient();
    const { data: unitData } = await adminSupabase
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
