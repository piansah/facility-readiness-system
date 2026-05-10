import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { canManageUnit } from "@/lib/auth/roles";
import { canAccessUnit } from "@/lib/auth/unit-access";
import { updateIncidentFollowUp } from "./actions";

type IncidentDetail = {
  id: string;
  title: string;
  description: string;
  action_taken: string | null;
  incident_time: string;
  status: string;
  follow_up_notes: string | null;
  official_letter_number: string | null;
  resolved_at: string | null;
  followed_up_at: string | null;
  daily_reports: {
    report_date: string;
    shift: string;
    unit_id: string;
  } | null;
  facilities: {
    name: string;
    location_detail: string | null;
  } | null;
  users: {
    full_name: string;
  } | null;
  incident_photos: {
    id: string;
    storage_path: string;
    caption: string | null;
  }[];
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/insiden/${id}`);
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active) {
    redirect("/dashboard");
  }

  const { data: incident } = await supabase
    .from("incidents")
    .select(
      `
      id,
      title,
      description,
      action_taken,
      incident_time,
      status,
      follow_up_notes,
      official_letter_number,
      resolved_at,
      followed_up_at,
      daily_reports (
        report_date,
        shift,
        unit_id
      ),
      facilities (
        name,
        location_detail
      ),
      users!incidents_reported_by_fkey (
        full_name
      ),
      incident_photos (
        id,
        storage_path,
        caption
      )
    `,
    )
    .eq("id", id)
    .single<IncidentDetail>();

  if (!incident) {
    notFound();
  }

  if (!(await canAccessUnit(supabase, profile, incident.daily_reports?.unit_id))) {
    notFound();
  }

  const photos = await Promise.all(
    incident.incident_photos.map(async (photo) => {
      const { data } = await supabase.storage
        .from("incident-photos")
        .createSignedUrl(photo.storage_path, 60 * 10);

      return {
        ...photo,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex" aria-label="Kembali ke history insiden">
            <Link href="/insiden">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Detail Non-Rutin
            </p>
            <h1 className="text-xl font-semibold text-slate-100">{incident.title}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {formatDateTime(incident.incident_time)} - {incident.status}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-5">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Insiden</CardTitle>
            <CardDescription>
              {incident.daily_reports?.report_date ?? "-"} - Shift {incident.daily_reports?.shift ?? "-"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-slate-300">
            <Info label="Fasilitas" value={incident.facilities?.name ?? "Tidak spesifik"} />
            <Info label="Lokasi" value={incident.facilities?.location_detail ?? "-"} />
            <Info label="Pelapor" value={incident.users?.full_name ?? "-"} />
            <Info label="Deskripsi" value={incident.description} />
            <Info label="Tindakan awal" value={incident.action_taken ?? "-"} />
            <Info label="Nomor surat dinas" value={incident.official_letter_number ?? "-"} />
            <Info label="Follow up" value={incident.follow_up_notes ?? "-"} />
            <Info label="Update terakhir" value={incident.followed_up_at ? formatDateTime(incident.followed_up_at) : "-"} />
            <Info label="Selesai pada" value={incident.resolved_at ? formatDateTime(incident.resolved_at) : "-"} />
          </CardContent>
        </Card>

        {canManageUnit(profile.role) ? (
          <Card>
            <CardHeader>
              <CardTitle>Follow Up Insiden</CardTitle>
              <CardDescription>Update status, catatan tindak lanjut, dan nomor surat dinas.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={updateIncidentFollowUp} className="grid gap-4">
                <input type="hidden" name="incident_id" value={incident.id} />
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={incident.status}
                    className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="open">Open</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="waiting_external">Menunggu Pihak Luar</option>
                    <option value="resolved">Selesai</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="official_letter_number">Nomor surat dinas</Label>
                  <input
                    id="official_letter_number"
                    name="official_letter_number"
                    defaultValue={incident.official_letter_number ?? ""}
                    className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="follow_up_notes">Catatan follow up</Label>
                  <textarea
                    id="follow_up_notes"
                    name="follow_up_notes"
                    defaultValue={incident.follow_up_notes ?? ""}
                    rows={5}
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <Button type="submit">Simpan Follow Up</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Foto Dokumentasi</CardTitle>
            <CardDescription>{photos.length} foto tersimpan di bucket private.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {photos.map((photo) =>
              photo.signedUrl ? (
                <figure key={photo.id} className="overflow-hidden rounded-md border border-slate-800 bg-slate-900">
                  <Image
                    src={photo.signedUrl}
                    alt={photo.caption ?? "Foto insiden"}
                    width={900}
                    height={600}
                    className="h-auto w-full object-cover"
                  />
                  {photo.caption ? (
                    <figcaption className="px-3 py-2 text-xs text-slate-400">{photo.caption}</figcaption>
                  ) : null}
                </figure>
              ) : null,
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="whitespace-pre-wrap text-slate-200">{value}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}
