"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createFollowUp(formData: FormData) {
  const incidentId = formData.get("incident_id") as string;
  const dailyReportId = formData.get("daily_report_id") as string;
  const actionTaken = formData.get("action_taken") as string;
  const followUpTime = formData.get("follow_up_time") as string;
  const statusUpdate = formData.get("status_update") as string;
  const handlerType = formData.get("handler_type") as string;
  const photos = formData.getAll("photos") as File[];

  if (!incidentId || !dailyReportId || !actionTaken || !followUpTime || !statusUpdate || !handlerType) {
    redirect(`/insiden/${incidentId}/tindak-lanjut?error=incomplete`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getProfile(supabase, user.id);
  if (!profile) {
    redirect(`/insiden/${incidentId}/tindak-lanjut?error=profile_not_found`);
  }

  // Double check that the daily report belongs to the user's unit
  const { data: dailyReport } = await supabase
    .from("daily_reports")
    .select("id, unit_id")
    .eq("id", dailyReportId)
    .single();

  if (!dailyReport || dailyReport.unit_id !== profile.unit_id) {
    redirect(`/insiden/${incidentId}/tindak-lanjut?error=invalid_report`);
  }

  const admin = createAdminClient();

  // Step 1: Insert Follow up
  const followUpData = {
    incident_id: incidentId,
    daily_report_id: dailyReportId,
    reported_by: user.id,
    action_taken: actionTaken,
    follow_up_time: followUpTime,
    status_update: statusUpdate,
    handler_type: handlerType,
  };

  const { data: followUp, error: insertError } = await admin
    .from("incident_follow_ups")
    .insert(followUpData)
    .select()
    .single();

  if (insertError) {
    console.error("Follow-up insert error:", insertError);
    redirect(`/insiden/${incidentId}/tindak-lanjut?error=${encodeURIComponent(insertError.message)}`);
  }

  // Step 2: Upload Photos
  const validPhotos = photos.filter((p) => p.size > 0 && p.name !== "undefined");
  if (validPhotos.length > 0) {
    const photoRows = [];

    for (const photo of validPhotos) {
      const ext = photo.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const path = `${profile.unit_id}/${fileName}`;

      const { error: uploadError } = await admin.storage
        .from("incident-photos")
        .upload(path, photo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError.message);
        continue; // skip this photo but don't crash
      }

      photoRows.push({
        incident_id: incidentId,
        follow_up_id: followUp.id,
        storage_path: path,
        caption: photo.name,
      });
    }

    if (photoRows.length > 0) {
      await admin.from("incident_photos").insert(photoRows);
    }
  }

  // Step 3: If status is success, close the main incident
  if (statusUpdate === "success") {
    await admin
      .from("incidents")
      .update({
        status: "resolved",
        result_status: "success",
        handler_type: handlerType,
      })
      .eq("id", incidentId);
  } else if (statusUpdate === "failed") {
    await admin
      .from("incidents")
      .update({
        result_status: "failed",
        handler_type: handlerType,
      })
      .eq("id", incidentId);
  }

  redirect(`/insiden/${incidentId}?saved=followup`);
}
