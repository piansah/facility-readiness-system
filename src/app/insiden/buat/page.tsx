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
import { createIncident } from "./actions";
import { IncidentTimeInput } from "./incident-time-input";
import { DraftManager } from "@/components/draft-manager";
import { ImageCompressorInput } from "@/components/image-compressor-input";

type PageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

type ReportOption = {
  id: string;
  report_date: string;
  shift: string;
  status: string;
};

type FacilityOption = {
  id: string;
  name: string;
  location_detail: string | null;
};

export default async function CreateIncidentPage({ searchParams }: PageProps) {
  const params = await searchParams;
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

  const [{ data: reports }, { data: facilities }] = await Promise.all([
    supabase
      .from("daily_reports")
      .select("id,report_date,shift,status")
      .eq("unit_id", profile.unit_id)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<ReportOption[]>(),
    supabase
      .from("facilities")
      .select("id,name,location_detail")
      .eq("unit_id", profile.unit_id)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .returns<FacilityOption[]>(),
  ]);

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex" aria-label="Kembali ke dashboard">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Non-Rutin</p>
            <h1 className="text-xl font-semibold text-slate-100">Buat Laporan Insiden</h1>
            <p className="mt-1 text-sm text-slate-400">
              {profile.full_name} - {roleLabel(profile.role)}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
      <DraftManager formId="incident-form" storageKey="incident-draft" />

      <form id="incident-form" action={createIncident} className="grid gap-4">
        {params.error ? (
          <Card className="border-red-900/70 bg-red-950/40">
            <CardContent className="p-5 text-sm text-red-200">
              Gagal menyimpan insiden: {params.error}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Data Kegiatan</CardTitle>
            <CardDescription>Foto wajib diunggah sebagai dokumentasi non-rutin.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="daily_report_id">Laporan harian terkait</Label>
              <select
                id="daily_report_id"
                name="daily_report_id"
                required
                className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Pilih laporan</option>
                {(reports ?? []).map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.report_date} - {report.shift} - {report.status}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="facility_id">Fasilitas terkait</Label>
              <select
                id="facility_id"
                name="facility_id"
                className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Tidak spesifik</option>
                {(facilities ?? []).map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                    {facility.location_detail ? ` - ${facility.location_detail}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="incident_time">Waktu kejadian</Label>
              <IncidentTimeInput />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Judul</Label>
              <Input id="title" name="title" placeholder="Contoh: Pengecekan baterai UPS" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Tuliskan kronologi atau kegiatan yang dilakukan."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="action_taken">Tindakan awal</Label>
              <textarea
                id="action_taken"
                name="action_taken"
                rows={3}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Contoh: dilakukan pengecekan tegangan dan dokumentasi."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="photos">Foto dokumentasi</Label>
              <ImageCompressorInput name="photos" required />
              <p className="text-sm text-slate-400">
                Pilih satu atau beberapa foto dokumentasi. Di HP, tombol ini bisa membuka kamera atau galeri.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg">
          <SendHorizonal className="h-4 w-4" aria-hidden="true" />
          Simpan Laporan Non-Rutin
        </Button>
      </form>
      </div>
    </main>
  );
}
