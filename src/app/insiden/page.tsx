import Link from "next/link";
import { Camera, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { canCreateReports } from "@/lib/auth/roles";

type IncidentListItem = {
  id: string;
  title: string;
  incident_time: string;
  status: string;
  action_taken: string | null;
  daily_reports: {
    report_date: string;
    shift: string;
  } | null;
  facilities: {
    name: string;
  } | null;
  users: {
    full_name: string;
  } | null;
  incident_photos: {
    id: string;
  }[];
};

export default async function IncidentListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/insiden");
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active) {
    redirect("/dashboard");
  }

  const { data: incidents, error } = await supabase
    .from("incidents")
    .select(
      `
      id,
      title,
      incident_time,
      status,
      action_taken,
      daily_reports (
        report_date,
        shift
      ),
      facilities (
        name
      ),
      users!incidents_reported_by_fkey (
        full_name
      ),
      incident_photos (
        id
      )
    `,
    )
    .order("incident_time", { ascending: false })
    .limit(50)
    .returns<IncidentListItem[]>();

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">History</p>
            <h1 className="text-xl font-semibold text-slate-100">Laporan Non-Rutin</h1>
            <p className="mt-1 text-sm text-slate-400">Kegiatan dan insiden yang tercatat untuk unit.</p>
          </div>
          {canCreateReports(profile.role) ? (
            <Button asChild>
              <Link href="/insiden/buat">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Baru
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-5">
        {error ? (
          <Card className="border-red-900/70 bg-red-950/40">
            <CardContent className="p-5 text-sm text-red-200">Gagal mengambil data: {error.message}</CardContent>
          </Card>
        ) : null}

        {incidents?.length ? (
          incidents.map((incident) => (
            <Link key={incident.id} href={`/insiden/${incident.id}`} className="block">
              <Card className="transition-colors hover:border-emerald-900">
                <CardContent className="grid gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-100">{incident.title}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatDateTime(incident.incident_time)} - {incident.daily_reports?.shift ?? "-"}
                      </p>
                    </div>
                    <span className="rounded-md bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-200">
                      {incident.status}
                    </span>
                  </div>
                  <div className="grid gap-1 text-sm text-slate-400 sm:grid-cols-3">
                    <p>Fasilitas: {incident.facilities?.name ?? "Tidak spesifik"}</p>
                    <p>Pelapor: {incident.users?.full_name ?? "-"}</p>
                    <p className="flex items-center gap-1">
                      <Camera className="h-4 w-4" aria-hidden="true" />
                      {incident.incident_photos.length} foto
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Belum Ada Non-Rutin</CardTitle>
              <CardDescription>History kegiatan non-rutin akan muncul di sini setelah dibuat.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
