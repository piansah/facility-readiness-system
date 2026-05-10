"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { canCreateReports } from "@/lib/auth/roles";

export async function createIncident(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/insiden/buat");
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active || !canCreateReports(profile.role)) {
    redirect("/dashboard?error=forbidden");
  }

  const dailyReportId = String(formData.get("daily_report_id") ?? "");
  const facilityId = String(formData.get("facility_id") ?? "");
  const incidentTime = String(formData.get("incident_time") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const actionTaken = String(formData.get("action_taken") ?? "").trim();
  const photos = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!dailyReportId || !incidentTime || !title || !description || photos.length === 0) {
    redirect("/insiden/buat?error=incomplete");
  }

  const { data: dailyReport, error: reportError } = await supabase
    .from("daily_reports")
    .select("id,unit_id")
    .eq("id", dailyReportId)
    .single<{ id: string; unit_id: string }>();

  if (reportError || !dailyReport || dailyReport.unit_id !== profile.unit_id) {
    redirect("/insiden/buat?error=invalid_report");
  }

  if (facilityId) {
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id,unit_id,is_active")
      .eq("id", facilityId)
      .single<{ id: string; unit_id: string; is_active: boolean }>();

    if (facilityError || !facility?.is_active || facility.unit_id !== profile.unit_id) {
      redirect("/insiden/buat?error=invalid_facility");
    }
  }

  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .insert({
      daily_report_id: dailyReportId,
      facility_id: facilityId || null,
      reported_by: user.id,
      incident_time: incidentTime,
      title,
      description,
      action_taken: actionTaken || null,
      status: "open",
    })
    .select("id")
    .single<{ id: string }>();

  if (incidentError || !incident) {
    redirect(`/insiden/buat?error=${encodeURIComponent(incidentError?.message ?? "incident")}`);
  }

  const photoRows: { incident_id: string; storage_path: string; caption: string | null }[] = [];

  for (const [index, photo] of photos.entries()) {
    const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${incident.id}/${Date.now()}-${index}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("incident-photos")
      .upload(path, photo, {
        contentType: photo.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      redirect(`/insiden/buat?error=${encodeURIComponent(uploadError.message)}`);
    }

    photoRows.push({
      incident_id: incident.id,
      storage_path: path,
      caption: photo.name,
    });
  }

  const { error: photoError } = await supabase.from("incident_photos").insert(photoRows);

  if (photoError) {
    redirect(`/insiden/buat?error=${encodeURIComponent(photoError.message)}`);
  }

  redirect("/dashboard");
}
