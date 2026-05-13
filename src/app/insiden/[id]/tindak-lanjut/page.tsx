import Link from "next/link";
import { ArrowLeft, SendHorizonal } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { canCreateReports, roleLabel } from "@/lib/auth/roles";
import { createFollowUp } from "./actions";
import { IncidentTimeInput } from "@/app/insiden/buat/incident-time-input";
import { ImageCompressorInput } from "@/components/image-compressor-input";
import { SubmitButton } from "@/components/submit-button";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

type ReportOption = {
  id: string;
  report_date: string;
  shift: string;
  status: string;
};

export default async function CreateFollowUpPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/insiden");
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active || !canCreateReports(profile.role)) {
    redirect("/dashboard?error=forbidden");
  }

  // Fetch the original incident to show its title
  const { data: incident } = await supabase
    .from("incidents")
    .select("title, status")
    .eq("id", id)
    .single();

  if (!incident) {
    redirect("/insiden?error=not_found");
  }

  const { data: reports } = await supabase
    .from("daily_reports")
    .select("id,report_date,shift,status")
    .eq("unit_id", profile.unit_id)
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<ReportOption[]>();

  return (
    <main className="min-h-dvh overflow-x-hidden bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex" aria-label="Kembali ke detail">
            <Link href={`/insiden/${id}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Tindak Lanjut</p>
            <h1 className="text-xl font-semibold text-slate-100 line-clamp-1">{incident.title}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {profile.full_name} - {roleLabel(profile.role)}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-5">
        <form action={createFollowUp} className="grid min-w-0 gap-4">
          <input type="hidden" name="incident_id" value={id} />
          
          {sp.error ? (
            <Card className="border-red-900/70 bg-red-950/40">
              <CardContent className="p-5 text-sm text-red-200">
                Gagal menyimpan tindak lanjut: {sp.error}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Data Tindak Lanjut</CardTitle>
              <CardDescription>Catat tindakan yang telah dilakukan untuk masalah ini.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="daily_report_id">Laporan harian terkait</Label>
                <div className="relative">
                  <select
                    id="daily_report_id"
                    name="daily_report_id"
                    className="flex h-10 w-full appearance-none rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                    defaultValue={reports?.[0]?.id}
                  >
                    <option value="" disabled>
                      Pilih laporan shift Anda
                    </option>
                    {reports?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {new Date(r.report_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        - Shift {r.shift} {r.status === "draft" ? "(Draft)" : ""}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="follow_up_time">Waktu tindak lanjut</Label>
                <IncidentTimeInput name="follow_up_time" />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="action_taken">Tindakan yang dilakukan</Label>
                <textarea
                  id="action_taken"
                  name="action_taken"
                  className="flex min-h-[120px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                  placeholder="Contoh: Telah dilakukan pembersihan filter AC dan penggantian kapasitor oleh teknisi..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <p className="text-sm font-medium text-slate-200">Status Hasil</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["success", "pending", "failed"] as const).map((val) => (
                      <label key={val} className="group relative flex cursor-pointer rounded-lg border border-slate-800 bg-slate-950 p-3 hover:bg-slate-900 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-500/10">
                        <input type="radio" name="status_update" value={val} className="peer sr-only" defaultChecked={val === "pending"} />
                        <span className="text-xs font-medium text-slate-400 peer-checked:text-emerald-400 m-auto">
                          {val === "success" ? "Berhasil" : val === "failed" ? "Gagal" : "Proses"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <p className="text-sm font-medium text-slate-200">Penanggung Jawab</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["internal", "vendor"] as const).map((val) => (
                      <label key={val} className="group relative flex cursor-pointer rounded-lg border border-slate-800 bg-slate-950 p-3 hover:bg-slate-900 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-500/10">
                        <input type="radio" name="handler_type" value={val} className="peer sr-only" defaultChecked={val === "internal"} />
                        <span className="text-xs font-medium text-slate-400 peer-checked:text-emerald-400 m-auto">
                          {val === "internal" ? "Internal" : "Vendor"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <Label>Foto dokumentasi tambahan (opsional)</Label>
                <ImageCompressorInput name="photos" />
              </div>
            </CardContent>
          </Card>

          <div className="sticky bottom-4 z-20 mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl backdrop-blur-md">
            <SubmitButton className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium" pendingText="Menyimpan...">
              <SendHorizonal className="mr-2 h-4 w-4" />
              Simpan Tindak Lanjut
            </SubmitButton>
          </div>
        </form>
      </div>
    </main>
  );
}
