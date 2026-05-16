"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addUnit(formData: FormData) {
  const supabase = await createClient();
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;

  if (!code || !name) {
    return { error: "Kode dan Nama unit harus diisi." };
  }

  const { error } = await supabase.from("units").insert([
    { 
      code: code.toUpperCase(), 
      name,
      is_active: true
    }
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateUnit(id: string, formData: FormData) {
  const supabase = await createClient();
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;

  if (!code || !name) {
    return { error: "Kode dan Nama unit harus diisi." };
  }

  const { error } = await supabase
    .from("units")
    .update({ 
      name 
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
