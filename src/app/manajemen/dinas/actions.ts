"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateRoster(rosters: any[], unitId: string | null) {
  if (!unitId) throw new Error("Unit ID is required");
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Filter out any entries that might not belong to this unit (Safety)
  // AND IMPORTANT: Remove the 'id' field to avoid null constraint errors
  const rosterToSave = rosters.map(r => ({
    user_id: r.user_id,
    duty_date: r.duty_date,
    shift_code: r.shift_code,
    unit_id: unitId
  }));

  // We use a manual loop or a batch upsert. 
  // Since rosters can be many, we'll perform a batch upsert.
  // Note: duty_rosters table has a UNIQUE constraint on (user_id, duty_date)
  
  const { error } = await supabase
    .from("duty_rosters")
    .upsert(rosterToSave, { 
      onConflict: 'user_id, duty_date' 
    });

  if (error) {
    console.error("Error saving roster:", error);
    throw new Error(error.message);
  }

  revalidatePath("/manajemen/dinas");
}

export async function updateShiftConfigs(shifts: any[], unitId: string | null) {
  if (!unitId) throw new Error("Unit ID is required");
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const shiftsToSave = shifts.map(s => ({
    unit_id: unitId,
    code: s.code,
    name: s.name,
    color_code: s.color_code,
    start_time: s.start_time,
    end_time: s.end_time
  }));

  const { error } = await supabase
    .from("shift_configs")
    .upsert(shiftsToSave, { onConflict: 'unit_id, code' });

  if (error) {
    console.error("Error saving shifts:", error);
    throw new Error(error.message);
  }

  revalidatePath("/manajemen/dinas");
}
