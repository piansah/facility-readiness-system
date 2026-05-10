"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth/profile";
import { canReviewReports } from "@/lib/auth/roles";
import { canAccessUnit } from "@/lib/auth/unit-access";

export async function reviewDailyReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active || !canReviewReports(profile.role)) {
    throw new Error("Forbidden: hanya admin unit yang bisa review laporan");
  }

  const reportId = formData.get("report_id") as string;
  const status = formData.get("status") as string;
  const reviewNotes = formData.get("review_notes") as string;

  if (!reportId || !["reviewed", "rejected"].includes(status)) {
    throw new Error("Missing required fields");
  }

  const admin = createAdminClient();
  const { data: report, error: reportError } = await admin
    .from("daily_reports")
    .select("id,unit_id,status")
    .eq("id", reportId)
    .single<{ id: string; unit_id: string; status: string }>();

  if (reportError || !report) {
    throw new Error("Report not found");
  }

  if (!(await canAccessUnit(supabase, profile, report.unit_id))) {
    throw new Error("Forbidden: laporan milik unit lain");
  }

  const reviewPayload = {
    status,
    review_notes: reviewNotes,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("daily_reports")
    .update(reviewPayload)
    .eq("id", reportId);

  if (error) {
    console.error("Error reviewing report:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/laporan/${reportId}`);
  revalidatePath("/dashboard");
  redirect(`/laporan/${reportId}`);
}

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
    throw new Error("Forbidden: akun tidak aktif");
  }

  const admin = createAdminClient();
  
  // Verifikasi laporan
  const { data: report, error: reportError } = await admin
    .from("daily_reports")
    .select("id,unit_id,status")
    .eq("id", reportId)
    .single<{ id: string; unit_id: string; status: string }>();

  if (reportError || !report) {
    throw new Error("Report not found");
  }

  if (report.status !== "draft") {
    throw new Error("Hanya laporan dengan status draft yang dapat dihapus.");
  }

  if (!(await canAccessUnit(supabase, profile, report.unit_id))) {
    throw new Error("Forbidden: laporan milik unit lain");
  }

  try {
    // 1. Ambil insiden terkait untuk menghapus fotonya
    const { data: incidents } = await admin.from("incidents").select("id").eq("daily_report_id", reportId);
    const incidentIds = incidents?.map(i => i.id) || [];
    
    if (incidentIds.length > 0) {
      const { data: photos } = await admin.from("incident_photos").select("storage_path").in("incident_id", incidentIds);
      if (photos && photos.length > 0) {
        await admin.storage.from("incident-photos").remove(photos.map(p => p.storage_path));
      }
      await admin.from("incident_photos").delete().in("incident_id", incidentIds);
      await admin.from("incidents").delete().eq("daily_report_id", reportId);
    }
    
    // 2. Hapus facility logs
    await admin.from("facility_status_logs").delete().eq("daily_report_id", reportId);
    
    // 3. Hapus report
    const { error: deleteError } = await admin.from("daily_reports").delete().eq("id", reportId);
    
    if (deleteError) throw deleteError;
    
  } catch (err: any) {
    console.error("Gagal menghapus draft:", err);
    throw new Error("Gagal menghapus draft: " + err.message);
  }

  revalidatePath("/laporan");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteDraftAction(formData: FormData) {
  const reportId = formData.get("report_id") as string;
  if (!reportId) throw new Error("Missing report ID");
  const result = await deleteDraft(reportId);
  if (result.success) {
    redirect("/laporan?tab=draft");
  }
}

