import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive, Server, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getStorageStats } from "./actions";
import { StorageCleanupForm } from "./storage-cleanup-form";

export default async function SystemManagementPage() {
  const supabase = await createClient();
  const { user } = await (await supabase.auth.getUser()).data;
  
  if (!user) redirect("/login");

  const { profile } = await getProfile(supabase, user.id);

  if (profile?.role !== "super_admin") {
    redirect("/dashboard");
  }

  // Fetch storage stats
  const { totalBytes, fileCount } = await getStorageStats();
  
  // 1 GB = 1073741824 bytes
  const MAX_STORAGE_BYTES = 1073741824;
  const storagePercentage = Math.min((totalBytes / MAX_STORAGE_BYTES) * 100, 100);
  const usedMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const maxMB = 1024; // 1 GB in MB

  // Determine color based on usage
  let progressColor = "bg-emerald-500";
  let statusColor = "text-emerald-400";
  let StatusIcon = CheckCircle2;
  let statusText = "Kapasitas Aman";

  if (storagePercentage > 85) {
    progressColor = "bg-red-500";
    statusColor = "text-red-400";
    StatusIcon = AlertTriangle;
    statusText = "Kapasitas Kritis";
  } else if (storagePercentage > 60) {
    progressColor = "bg-amber-500";
    statusColor = "text-amber-400";
    StatusIcon = AlertTriangle;
    statusText = "Hampir Penuh";
  }

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-500 mb-1">
              <Server className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Sistem Operasional</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Manajemen Sistem</h1>
            <p className="text-sm text-slate-400">Pantau dan kelola resource aplikasi.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Storage Monitor */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-slate-400" />
                Penyimpanan Database (Foto)
              </CardTitle>
              <CardDescription>Batas Gratis Supabase: 1 GB</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-100">{usedMB} <span className="text-sm font-normal text-slate-400">MB</span></p>
                  <p className="text-xs text-slate-500 mt-1">Digunakan dari {maxMB} MB</p>
                </div>
                <div className={`flex flex-col items-end ${statusColor}`}>
                  <StatusIcon className="h-6 w-6 mb-1" />
                  <span className="text-xs font-semibold uppercase tracking-wider">{statusText}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-800">
                <div 
                  className={`absolute left-0 top-0 h-full transition-all duration-1000 ${progressColor}`} 
                  style={{ width: `${Math.max(storagePercentage, 1)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400">{fileCount} File Foto</span>
                <span className="text-slate-100">{storagePercentage.toFixed(1)}% Terpakai</span>
              </div>
            </CardContent>
          </Card>

          {/* Cleanup Action */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-500">
                <Trash2 className="h-5 w-5" />
                Pembersihan Otomatis
              </CardTitle>
              <CardDescription>Kosongkan ruang dengan menghapus foto insiden lama.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-amber-900/30 bg-amber-950/20 p-4 mb-4 text-sm text-amber-200">
                <p>Tindakan ini hanya menghapus <strong>file foto</strong> untuk menghemat kuota. Teks laporan harian dan data insiden akan tetap aman di database.</p>
              </div>
              
              <StorageCleanupForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
