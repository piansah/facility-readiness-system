"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { revalidatePath } from "next/cache";

// Fetch all vendors with their contracts and unit info
export async function getVendorsData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { profile } = await getProfile(supabase, user.id);
  if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
    return { error: "Forbidden" };
  }

  let query = supabase
    .from("vendors")
    .select(`
      *,
      units (id, code, name),
      contracts (*)
    `)
    .order("name", { ascending: true });

  if (profile.role !== "super_admin") {
    // Regular admin can only see vendors under their unit
    query = query.eq("unit_id", profile.unit_id);
  }

  const { data: vendors, error } = await query;
  if (error) return { error: error.message };

  return { vendors };
}

// Fetch all active units for vendor mapping (Super Admin only)
export async function getActiveUnits() {
  const supabase = await createClient();
  const { data: units, error } = await supabase
    .from("units")
    .select("id, code, name")
    .eq("is_active", true)
    .order("code");

  if (error) return [];
  return units;
}

// Create new vendor
export async function createVendor(formData: {
  unit_id: string;
  name: string;
  pic_name?: string;
  pic_phone?: string;
  emergency_phone?: string;
  email?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { profile } = await getProfile(supabase, user.id);
  if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
    return { error: "Forbidden" };
  }

  // Force unit_id if normal admin
  const targetUnitId = profile.role === "super_admin" ? formData.unit_id : profile.unit_id;
  if (!targetUnitId) return { error: "Unit ID is required" };

  const { data, error } = await supabase
    .from("vendors")
    .insert({
      unit_id: targetUnitId,
      name: formData.name,
      pic_name: formData.pic_name || null,
      pic_phone: formData.pic_phone || null,
      emergency_phone: formData.emergency_phone || null,
      email: formData.email || null
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/manajemen/vendor");
  return { success: true, vendor: data };
}

// Update vendor
export async function updateVendor(id: string, formData: {
  name: string;
  pic_name?: string;
  pic_phone?: string;
  emergency_phone?: string;
  email?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { profile } = await getProfile(supabase, user.id);
  if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
    return { error: "Forbidden" };
  }

  const { error } = await supabase
    .from("vendors")
    .update({
      name: formData.name,
      pic_name: formData.pic_name || null,
      pic_phone: formData.pic_phone || null,
      emergency_phone: formData.emergency_phone || null,
      email: formData.email || null
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/manajemen/vendor");
  return { success: true };
}

// Delete vendor
export async function deleteVendor(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { profile } = await getProfile(supabase, user.id);
  if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
    return { error: "Forbidden" };
  }

  const { error } = await supabase
    .from("vendors")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/manajemen/vendor");
  return { success: true };
}

// Create contract
export async function createContract(formData: {
  vendor_id: string;
  title: string;
  contract_number?: string;
  start_date?: string;
  end_date?: string;
  warranty_period_months?: number;
  sla_response_hours?: number;
  document_path?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { profile } = await getProfile(supabase, user.id);
  if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
    return { error: "Forbidden" };
  }

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      vendor_id: formData.vendor_id,
      title: formData.title,
      contract_number: formData.contract_number || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      warranty_period_months: formData.warranty_period_months || null,
      sla_response_hours: formData.sla_response_hours || null,
      document_path: formData.document_path || null
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/manajemen/vendor");
  return { success: true, contract: data };
}

// Delete contract
export async function deleteContract(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { profile } = await getProfile(supabase, user.id);
  if (!profile || (profile.role !== "super_admin" && profile.role !== "admin")) {
    return { error: "Forbidden" };
  }

  const { error } = await supabase
    .from("contracts")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/manajemen/vendor");
  return { success: true };
}

// Create vendor service log (external service log)
export async function createServiceLog(formData: {
  incident_id: string;
  vendor_id: string;
  called_at: string;
  responded_at?: string;
  completed_at?: string;
  cost: number;
  service_details: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("vendor_service_logs")
    .insert({
      incident_id: formData.incident_id,
      vendor_id: formData.vendor_id,
      called_at: formData.called_at,
      responded_at: formData.responded_at || null,
      completed_at: formData.completed_at || null,
      cost: formData.cost || 0.00,
      service_details: formData.service_details
    });

  if (error) return { error: error.message };

  revalidatePath("/insiden");
  revalidatePath("/manajemen/vendor");
  return { success: true };
}

// Fetch all service logs for a specific vendor
export async function getVendorServiceLogs(vendorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_service_logs")
    .select(`
      *,
      incidents (
        id,
        title,
        status,
        facilities (id, name, asset_code)
      )
    `)
    .eq("vendor_id", vendorId)
    .order("called_at", { ascending: false });

  if (error) return [];
  return data;
}

// Fetch incidents for service log attachment
export async function getUnitIncidents() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { profile } = await getProfile(supabase, user.id);
  if (!profile) return [];

  let query = supabase
    .from("incidents")
    .select(`
      id,
      title,
      status,
      incident_time,
      daily_reports!inner (unit_id)
    `)
    .neq("status", "resolved")
    .order("incident_time", { ascending: false });

  if (profile.role !== "super_admin") {
    query = query.eq("daily_reports.unit_id", profile.unit_id);
  }

  const { data, error } = await query;
  if (error) return [];
  return data;
}
