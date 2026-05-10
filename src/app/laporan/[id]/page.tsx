import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Calendar, Clock3, User } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/text-area";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth/profile";
import { canAccessUnit } from "@/lib/auth/unit-access";
import { canReviewReports, canCreateReports } from "@/lib/auth/roles";
import { reviewDailyReport } from "./actions";
import { PdfExport } from "@/components/pdf-export";
import { DeleteDraftButton } from "./delete-draft-button";

type ReportDetail = {
  id: string;
  unit_id: string;
  report_date: string;
  shift: string;
  status: string;
  submitted_at: string | null;
  current_shift_staff: StaffSnapshot[];
  next_shift_staff: StaffSnapshot[];
  users: {
    full_name: string;
  } | null;
  units: {
    code: string;
    name: string;
  } | null;
  facility_status_logs: {
    id: string;
    status: string;
    notes: string | null;
    facilities: {
      name: string;
      location_detail: string | null;
      facility_categories: {
        name: string;
        icon: string | null;
        sort_order: number;
      } | null;
    } | null;
  }[];
  incidents: {
    id: string;
    title: string;
    description: string;
    action_taken: string | null;
    incident_time: string;
    status: string;
    incident_photos: {
      id: string;
      storage_path: string;
      caption: string | null;
    }[];
    photos?: {
      id: string;
      signedUrl: string | null;
      caption: string | null;
    }[];
  }[];
};

type StaffSnapshot = {
  id?: string;
  name: string;
  role?: string;
};

type ReviewMetadata = {
  reviewed_at: string | null;
  review_notes: string | null;
  reviewer: {
    full_name: string;
  } | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/laporan/${id}`);
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data: report } = await admin
    .from("daily_reports")
    .select(
      `
      id,
      unit_id,
      report_date,
      shift,
      status,
      submitted_at,
      current_shift_staff,
      next_shift_staff,
      users!daily_reports_created_by_fkey (
        full_name
      ),
      units (
        code,
        name
      ),
      facility_status_logs (
        id,
        status,
        notes,
        facilities (
          name,
          location_detail,
          facility_categories (
            name,
            icon,
            sort_order
          )
        )
      ),
      incidents (
        id,
        title,
        description,
        action_taken,
        incident_time,
        status,
        incident_photos (
          id,
          storage_path,
          caption
        )
      )
    `,
    )
    .eq("id", id)
    .single<ReportDetail>();

  if (!report) {
    notFound();
  }

  if (!(await canAccessUnit(supabase, profile, report.unit_id))) {
    notFound();
  }

  const { data: reviewMetadata } = await admin
    .from("daily_reports")
    .select(
      `
      reviewed_at,
      review_notes,
      reviewer:users!daily_reports_reviewed_by_fkey (
        full_name
      )
    `,
    )
    .eq("id", id)
    .maybeSingle<ReviewMetadata>();

  // Fetch signed URLs for all incident photos in this report
  const incidentsWithPhotos = await Promise.all(
    report.incidents.map(async (incident) => {
      const photosWithUrls = await Promise.all(
        incident.incident_photos.map(async (photo) => {
          const { data } = await supabase.storage
            .from("incident-photos")
            .createSignedUrl(photo.storage_path, 60 * 60); // 1 hour
          return { ...photo, signedUrl: data?.signedUrl ?? null };
        }),
      );
      return { ...incident, photos: photosWithUrls };
    }),
  );

  const reportWithFullIncidents = { ...report, ...reviewMetadata, incidents: incidentsWithPhotos };

  const groups = groupLogs(report.facility_status_logs);
  const canReview = canReviewReports(profile.role);

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-3 px-4 py-4">
          <div className="flex items-start gap-3">
            <Button asChild variant="ghost" size="sm" aria-label="Kembali ke history laporan" className="mt-1 hidden sm:inline-flex">
              <Link href="/laporan">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Laporan Kesiapan</p>
              <h1 className="text-xl font-semibold text-slate-100">
                Unit {report.units?.code ?? "Unit"}
              </h1>
            </div>
          </div>
          <PdfExport report={reportWithFullIncidents} />
        </div>
      </header>



      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-6">
        {/* --- Draft Actions --- */}
        {report.status === "draft" && canCreateReports(profile.role) ? (
          <div className="relative z-20 flex items-center justify-center gap-3">
            <DeleteDraftButton reportId={report.id} />
            <Button asChild variant="outline" className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-950/50 hover:text-emerald-400">
              <Link href={`/laporan/${report.id}/edit`}>Lanjutkan Draft</Link>
            </Button>
          </div>
        ) : null}

        {/* --- Quick Information Card --- */}
        <Card className="border-slate-800 bg-slate-900/40">
          <CardContent className="p-0">
            <div className="grid divide-y divide-slate-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tanggal</p>
                  <p className="text-sm font-semibold text-slate-100">{formatDate(report.report_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Shift</p>
                  <p className="text-sm font-semibold capitalize text-slate-100">{report.shift}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pembuat / Status</p>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <p className="truncate text-sm font-semibold text-slate-100">{report.users?.full_name ?? "-"}</p>
                    <StatusBadge status={report.status} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {report.status === "reviewed" || report.status === "rejected" ? (
          <Card className={report.status === "reviewed" ? "border-emerald-900/50 bg-emerald-950/10" : "border-red-900/50 bg-red-950/10"}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {report.status === "reviewed" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                Laporan {report.status === "reviewed" ? "Disetujui" : "Ditolak"}
              </CardTitle>
              <CardDescription>
                {reviewMetadata?.reviewed_at
                  ? `Oleh ${reviewMetadata.reviewer?.full_name ?? "Admin"} pada ${formatDateTime(reviewMetadata.reviewed_at)}`
                  : "Status review sudah tercatat pada laporan ini."}
              </CardDescription>
            </CardHeader>
            {reviewMetadata?.review_notes ? (
              <CardContent>
                <p className="text-sm italic text-slate-300">&ldquo;{reviewMetadata.review_notes}&rdquo;</p>
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        {canReview && report.status === "submitted" ? (
          <Card className="border-emerald-900/30 bg-emerald-950/5">
            <CardHeader>
              <CardTitle>Review Laporan</CardTitle>
              <CardDescription>Berikan persetujuan atau penolakan untuk laporan ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={reviewDailyReport} className="grid gap-4">
                <input type="hidden" name="report_id" value={report.id} />
                <div className="grid gap-2">
                  <Label htmlFor="review_notes">Catatan Review (Opsional)</Label>
                  <Textarea
                    id="review_notes"
                    name="review_notes"
                    placeholder="Contoh: Laporan sudah lengkap, atau Perbaiki bagian fasilitas X..."
                    className="bg-slate-900"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" name="status" value="reviewed" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Setujui
                  </Button>
                  <Button type="submit" name="status" value="rejected" variant="destructive" className="flex-1">
                    <XCircle className="mr-2 h-4 w-4" /> Tolak
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Petugas Serah Terima Shift</CardTitle>
            <CardDescription>Daftar petugas/admin yang tercatat pada laporan ini.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <StaffList
              title={`Petugas shift ${report.shift}`}
              staff={report.current_shift_staff ?? []}
            />
            <StaffList
              title="Petugas shift berikutnya"
              staff={report.next_shift_staff ?? []}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kesiapan Fasilitas</CardTitle>
            <CardDescription>Status fasilitas per kategori.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {groups.map((group, index) => (
              <section key={group.name} className="grid gap-2">
                <h2 className="font-semibold text-slate-100">
                  {index + 1}. {group.icon ? `${group.icon} ` : ""}
                  {group.name}
                </h2>
                <div className="grid gap-2">
                  {group.logs.map((log, logIndex) => (
                    <div
                      key={log.id}
                      className="grid gap-1 rounded-md border border-slate-800 bg-slate-900 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-slate-100">
                          {logIndex + 1}. {statusIcon(log.status)} {log.facilities?.name ?? "-"}
                        </p>
                        <span className="rounded-md bg-slate-950 px-2 py-1 text-xs text-slate-300">
                          {statusLabel(log.status)}
                        </span>
                      </div>
                      {log.facilities?.location_detail ? (
                        <p className="text-slate-500">{log.facilities.location_detail}</p>
                      ) : null}
                      {log.notes ? <p className="text-slate-400">Catatan: {log.notes}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Non-Rutin Terkait</CardTitle>
            <CardDescription>Kegiatan atau insiden yang terhubung ke laporan ini.</CardDescription>
          </CardHeader>
          <CardContent>
            {report.incidents.length ? (
              <div className="grid gap-2">
                {report.incidents.map((incident) => (
                  <Link
                    key={incident.id}
                    href={`/insiden/${incident.id}`}
                    className="rounded-md border border-slate-800 bg-slate-900 p-3 text-sm transition-colors hover:border-emerald-900"
                  >
                    <p className="font-medium text-slate-100">{incident.title}</p>
                    <div className="mt-1 text-xs text-slate-400">
                      <p>{formatDateTime(incident.incident_time)} - {incident.status}</p>
                      <p className="mt-0.5 text-emerald-500/80">Dilaporkan oleh: {report.users?.full_name ?? "Tidak diketahui"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-md bg-slate-900 p-4 text-sm text-slate-400">
                Tidak ada non-rutin pada laporan ini.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-800 text-slate-400",
    submitted: "bg-blue-500/20 text-blue-300",
    reviewed: "bg-emerald-500/20 text-emerald-300",
    rejected: "bg-red-500/20 text-red-300",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Menunggu Review",
    reviewed: "Disetujui",
    rejected: "Perlu Perbaikan",
  };

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

function StaffList({ title, staff }: { title: string; staff: StaffSnapshot[] }) {
  return (
    <section className="grid gap-1.5 rounded-md border border-slate-800 bg-slate-900 p-2.5 sm:p-3">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      {staff.length ? (
        <ul className="grid gap-1 text-sm text-slate-300">
          {staff.map((person, index) => (
            <li key={`${person.id ?? person.name}-${index}`} className="flex items-center justify-between gap-2 text-xs sm:text-sm">
              <span>{person.name}</span>
              {person.role ? <span className="text-[10px] sm:text-xs uppercase text-slate-500">{person.role}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs sm:text-sm text-slate-500">Belum dicatat.</p>
      )}
    </section>
  );
}

function groupLogs(logs: ReportDetail["facility_status_logs"]) {
  const groups = new Map<
    string,
    { name: string; icon: string | null; sortOrder: number; logs: ReportDetail["facility_status_logs"] }
  >();

  for (const log of logs) {
    const category = log.facilities?.facility_categories;
    const name = category?.name ?? "Lainnya";
    const current = groups.get(name);

    if (current) {
      current.logs.push(log);
    } else {
      groups.set(name, {
        name,
        icon: category?.icon ?? null,
        sortOrder: category?.sort_order ?? 999,
        logs: [log],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function statusIcon(status: string) {
  if (status === "rusak") return "X";
  if (status === "operasi_menurun") return "!";
  return "OK";
}

function statusLabel(status: string) {
  if (status === "rusak") return "Rusak";
  if (status === "operasi_menurun") return "Operasi Menurun";
  return "Normal";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
