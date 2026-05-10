"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth/profile";
import { revalidatePath } from "next/cache";

export async function getStorageStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { totalBytes: 0, fileCount: 0 };
  
  const { profile } = await getProfile(supabase, user.id);
  if (profile?.role !== "super_admin") return { totalBytes: 0, fileCount: 0 };

  const adminClient = await createAdminClient();
  
  // Supabase doesn't have a direct "get bucket size" API that is fast.
  // The workaround is to list files, but it's paginated. 
  // For a rough estimate, we will fetch up to 10,000 files in a few batches.
  let totalBytes = 0;
  let fileCount = 0;
  let hasMore = true;
  let offset = 0;
  const limit = 1000;

  try {
    // List folders first (usually user UUIDs)
    const { data: folders } = await adminClient.storage.from("incident-photos").list();
    if (!folders) return { totalBytes, fileCount };

    for (const folder of folders) {
      if (!folder.id) continue; // skip actual files at root if any
      
      const { data: incidentFolders } = await adminClient.storage.from("incident-photos").list(folder.name);
      if (!incidentFolders) continue;

      for (const incFolder of incidentFolders) {
        if (!incFolder.id) continue;
        
        const { data: files } = await adminClient.storage.from("incident-photos").list(`${folder.name}/${incFolder.name}`);
        if (!files) continue;

        for (const file of files) {
          if (file.id) {
            totalBytes += file.metadata?.size || 0;
            fileCount++;
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch storage stats", e);
  }

  return { totalBytes, fileCount };
}

export async function cleanUpOldPhotos(monthsOld: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { profile } = await getProfile(supabase, user.id);
  if (profile?.role !== "super_admin") throw new Error("Forbidden");

  const adminClient = await createAdminClient();
  
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);
  
  try {
    // 1. Find old incidents
    const { data: oldIncidents } = await supabase
      .from("incidents")
      .select("id")
      .lt("created_at", cutoffDate.toISOString());

    if (!oldIncidents || oldIncidents.length === 0) {
      return { success: true, deletedCount: 0, message: "Tidak ada foto usang yang perlu dihapus." };
    }

    const oldIncidentIds = oldIncidents.map(i => i.id);

    // 2. Find photos belonging to those old incidents
    const { data: oldPhotos } = await supabase
      .from("incident_photos")
      .select("id, storage_path")
      .in("incident_id", oldIncidentIds);

    if (!oldPhotos || oldPhotos.length === 0) {
      return { success: true, deletedCount: 0, message: "Tidak ada foto yang terkait dengan insiden lama." };
    }

    const pathsToDelete = oldPhotos.map(p => p.storage_path);

    // 3. Delete files from Storage
    const { error: storageError } = await adminClient.storage
      .from("incident-photos")
      .remove(pathsToDelete);

    if (storageError) {
      console.error("Storage delete error", storageError);
      throw new Error("Gagal menghapus file dari Storage.");
    }

    // 4. Delete records from database
    const { error: dbError } = await supabase
      .from("incident_photos")
      .delete()
      .in("id", oldPhotos.map(p => p.id));

    if (dbError) {
      console.error("DB delete error", dbError);
      throw new Error("Gagal menghapus rekaman foto dari database.");
    }

    revalidatePath("/manajemen/sistem");
    return { success: true, deletedCount: oldPhotos.length, message: `Berhasil menghapus ${oldPhotos.length} foto lama.` };
  } catch (error: any) {
    return { success: false, deletedCount: 0, message: error.message };
  }
}
