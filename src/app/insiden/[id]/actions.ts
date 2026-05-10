"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageUnit } from "@/lib/auth/roles";
import { getProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canAccessUnit } from "@/lib/auth/unit-access";

const incidentStatuses = ["open", "follow_up", "waiting_external", "resolved"] as const;

async function requireIncidentManager(incidentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/insiden/${incidentId}`);
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active || !canManageUnit(profile.role)) {
    redirect(`/insiden/${incidentId}?error=unauthorized`);
  }

  const { data: incident, error } = await supabase
    .from("incidents")
    .select(
      `
      id,
      daily_reports (
        unit_id
      )
    `,
    )
    .eq("id", incidentId)
    .single<{ id: string; daily_reports: { unit_id: string } | null }>();

  if (error || !incident) {
    redirect("/insiden?error=incident_not_found");
  }

  if (!(await canAccessUnit(supabase, profile, incident.daily_reports?.unit_id))) {
    redirect(`/insiden/${incidentId}?error=wrong_unit`);
  }

  return { profile, user };
}

export async function updateIncidentFollowUp(formData: FormData) {
  const incidentId = String(formData.get("incident_id") ?? "");
  const status = String(formData.get("status") ?? "open");
  const followUpNotes = String(formData.get("follow_up_notes") ?? "").trim();
  const officialLetterNumber = String(formData.get("official_letter_number") ?? "").trim();

  if (!incidentId || !incidentStatuses.includes(status as (typeof incidentStatuses)[number])) {
    redirect("/insiden?error=incomplete");
  }

  const { user } = await requireIncidentManager(incidentId);
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await admin
    .from("incidents")
    .update({
      status,
      follow_up_notes: followUpNotes || null,
      official_letter_number: officialLetterNumber || null,
      resolved_at: status === "resolved" ? now : null,
      followed_up_by: user.id,
      followed_up_at: now,
    })
    .eq("id", incidentId);

  if (error) {
    redirect(`/insiden/${incidentId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/insiden");
  revalidatePath(`/insiden/${incidentId}`);
  redirect(`/insiden/${incidentId}`);
}
