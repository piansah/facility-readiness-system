"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";

export async function getUploadFormData() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    return { error: "Not authenticated" };
  }
  
  const { profile } = await getProfile(supabase, userData.user.id);
  
  if (!profile) {
    return { error: "Profile not found" };
  }
  
  let query = supabase.from('facility_categories').select('id, name, icon');
  
  if (profile.role !== 'super_admin' && profile.unit_id) {
    query = query.eq('unit_id', profile.unit_id);
  }
  
  const { data: categories, error } = await query;
  
  if (error) {
    return { error: error.message };
  }
  
  return { 
    profile: {
      id: profile.id,
      unit_id: profile.unit_id,
      role: profile.role
    }, 
    categories 
  };
}

export async function getKnowledgeBaseDocs() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData?.user) {
    return { error: "Not authenticated" };
  }
  
  const { profile } = await getProfile(supabase, userData.user.id);
  
  if (!profile) {
    return { error: "Profile not found" };
  }
  
  let query = supabase
    .from('knowledge_base')
    .select(`
      *,
      facility_categories ( name, icon )
    `)
    .order('created_at', { ascending: false });
    
  if (profile.role !== 'super_admin' && profile.unit_id) {
    query = query.eq('unit_id', profile.unit_id);
  }
  
  const { data: docs, error } = await query;
  
  if (error) {
    return { error: error.message };
  }
  
  return { docs };
}
