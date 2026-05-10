import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canReviewReports } from "@/lib/auth/roles";
import { getProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

type ReviewReport = {
  id: string;
  report_date: string;
  shift: string;
  status: string;
  units: {
    code: string;
    name: string;
  } | null;
  users: {
    full_name: string;
  } | null;
};

export default async function ReviewReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/laporan/review");
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active || !canReviewReports(profile.role)) {
    redirect("/dashboard");
  }

  let reportsQuery = supabase
    .from("daily_reports")
    .select(
      `
      id,
      report_date,
      shift,
      status,
      units (
        code,
        name
      ),
      users!daily_reports_created_by_fkey (
        full_name
      )
    `,
    )
    .eq("status", "submitted");

  reportsQuery = reportsQuery.eq("unit_id", profile.unit_id);

  const { data: reports, error } = await reportsQuery
    .order("report_date", { ascending: false })
    .order("shift", { ascending: true })
    .returns<ReviewReport[]>();

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex" aria-label="Kembali ke dashboard">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Review</p>
            <h1 className="text-xl font-semibold text-slate-100">Review Laporan Harian</h1>
            <p className="mt-1 text-sm text-slate-400">Verifikasi laporan yang sudah disubmit.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-5">
        <Card>
          <CardHeader>
            <CardTitle>Menunggu Review</CardTitle>
            <CardDescription>Laporan yang disetujui akan berubah status menjadi reviewed.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {error ? (
              <div className="rounded-md border border-red-900/70 bg-red-950/40 p-3 text-sm text-red-200">
                {error.message}
              </div>
            ) : null}
            {reports?.length ? (
              reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/laporan/${report.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-emerald-700 hover:bg-slate-900/80"
                >
                  <div>
                    <p className="font-semibold text-slate-100">
                      {report.units?.code ?? "-"} - {formatDate(report.report_date)}
                    </p>
                    <p className="mt-1 text-sm capitalize text-slate-400">
                      Shift {report.shift} - Dibuat oleh {report.users?.full_name ?? "-"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-md bg-blue-500/15 px-3 py-1 text-sm font-medium text-blue-200">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Review
                  </span>
                </Link>
              ))
            ) : (
              <div className="rounded-md border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
                Tidak ada laporan yang menunggu review.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
  }).format(new Date(value));
}
