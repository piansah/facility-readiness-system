"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth/profile";
import { canReviewReports } from "@/lib/auth/roles";
import { canAccessUnit } from "@/lib/auth/unit-access";

/**
 * Server Action to review a daily report (approve or reject)
 */
export async function reviewDailyReport(formData: FormData) {
  const reportId = formData.get("report_id") as string;
  const status = formData.get("status") as string;
  const reviewNotes = formData.get("review_notes") as string;

  if (!reportId || !status) {
    throw new Error("ID Laporan dan Status wajib diisi.");
  }

  // 1. Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Check authorization
  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active || !canReviewReports(profile.role)) {
    throw new Error("Unauthorized: Hanya admin yang dapat melakukan review laporan.");
  }

  const admin = createAdminClient();

  // 3. Verify unit access
  const { data: report, error: reportError } = await admin
    .from("daily_reports")
    .select("id, unit_id")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    throw new Error("Laporan tidak ditemukan.");
  }

  if (!(await canAccessUnit(supabase, profile, report.unit_id))) {
    throw new Error("Unauthorized: Anda tidak memiliki akses ke unit ini.");
  }

  // 4. Update report status
  const { error } = await admin
    .from("daily_reports")
    .update({
      status,
      review_notes: reviewNotes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    throw new Error(`Gagal memperbarui laporan: ${error.message}`);
  }

  // 5. Revalidate and redirect
  revalidatePath(`/laporan/${reportId}`);
  revalidatePath("/laporan/review");
  revalidatePath("/laporan");
  
  redirect(`/laporan/${reportId}`);
}

/**
 * Logic to delete a draft report and its associated data
 */
export async function deleteDraft(reportId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active) {
    throw new Error("Akun tidak aktif.");
  }

  const admin = createAdminClient();
  
  // Verify report existence and status
  const { data: report, error: reportError } = await admin
    .from("daily_reports")
    .select("id, unit_id, status")
    .eq("id", reportId)
    .single();

  if (reportError || !report) {
    throw new Error("Laporan tidak ditemukan.");
  }

  if (report.status !== "draft") {
    throw new Error("Hanya laporan dengan status draft yang dapat dihapus.");
  }

  if (!(await canAccessUnit(supabase, profile, report.unit_id))) {
    throw new Error("Unauthorized: Anda tidak memiliki akses ke unit ini.");
  }

  try {
    // 1. Get associated incidents to delete photos
    const { data: incidents } = await admin
      .from("incidents")
      .select("id")
      .eq("daily_report_id", reportId);
    
    const incidentIds = incidents?.map(i => i.id) || [];
    
    if (incidentIds.length > 0) {
      const { data: photos } = await admin
        .from("incident_photos")
        .select("storage_path")
        .in("incident_id", incidentIds);
      
      if (photos && photos.length > 0) {
        await admin.storage.from("incident-photos").remove(photos.map(p => p.storage_path));
      }
      
      await admin.from("incident_photos").delete().in("incident_id", incidentIds);
      await admin.from("incidents").delete().eq("daily_report_id", reportId);
    }
    
    // 2. Delete facility logs
    await admin.from("facility_status_logs").delete().eq("daily_report_id", reportId);
    
    // 3. Delete report
    const { error: deleteError } = await admin
      .from("daily_reports")
      .delete()
      .eq("id", reportId);
    
    if (deleteError) throw deleteError;
    
  } catch (err: any) {
    console.error("Gagal menghapus draft:", err);
    throw new Error("Gagal menghapus draft: " + err.message);
  }

  revalidatePath("/laporan");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Server Action for DeleteDraftButton
 */
export async function deleteDraftAction(formData: FormData) {
  const reportId = formData.get("report_id") as string;
  if (!reportId) throw new Error("Missing report ID");
  
  const result = await deleteDraft(reportId);
  if (result.success) {
    redirect("/laporan?tab=draft");
  }
}
