import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { canCreateReports } from "@/lib/auth/roles";

type ReportListItem = {
  id: string;
  report_date: string;
  shift: string;
  status: string;
  submitted_at: string | null;
  users: {
    full_name: string;
  } | null;
  facility_status_logs: {
    status: string;
  }[];
  incidents: {
    id: string;
  }[];
};

export default async function ReportListPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const isDraftTab = tab === "draft";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/laporan");
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active) {
    redirect("/dashboard");
  }

  let query = supabase
    .from("daily_reports")
    .select(
      `
      id,
      report_date,
      shift,
      status,
      submitted_at,
      users!daily_reports_created_by_fkey (
        full_name
      ),
      facility_status_logs (
        status
      ),
      incidents (
        id
      )
    `,
    )
    .order("report_date", { ascending: false })
    .order("shift", { ascending: true })
    .limit(60);

  if (isDraftTab) {
    query = query.eq("status", "draft");
  } else {
    query = query.neq("status", "draft");
  }

  const { data: reports, error } = await query.returns<ReportListItem[]>();

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">History</p>
            <h1 className="truncate text-lg font-semibold text-slate-100 sm:text-xl">
              {isDraftTab ? "Laporan Draft" : "Laporan Harian"}
            </h1>
            <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
              {isDraftTab ? "Laporan yang belum disubmit." : "Laporan yang sudah disubmit."}
            </p>
          </div>
          {canCreateReports(profile.role) ? (
            <Button asChild size="sm" className="shrink-0">
              <Link href="/laporan/buat">
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
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

        {reports?.length ? (
          reports.map((report) => {
            const counts = countStatuses(report.facility_status_logs);

            return (
              <Link key={report.id} href={`/laporan/${report.id}`} className="block">
                <Card className="transition-colors hover:border-emerald-900">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-100 text-sm sm:text-base">
                          {formatDate(report.report_date)} - Shift {report.shift}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Oleh {report.users?.full_name ?? "-"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                        {report.status}
                      </span>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-800/50 pt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <p className="text-[11px] font-medium text-slate-400">Normal <span className="text-slate-100 ml-0.5">{counts.normal}</span></p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <p className="text-[11px] font-medium text-slate-400">Rusak <span className="text-slate-100 ml-0.5">{counts.rusak}</span></p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <p className="text-[11px] font-medium text-slate-400">Menurun <span className="text-slate-100 ml-0.5">{counts.operasi_menurun}</span></p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <p className="text-[11px] font-medium text-slate-400">Non-rutin <span className="text-slate-100 ml-0.5">{report.incidents.length}</span></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Belum Ada Laporan</CardTitle>
              <CardDescription>Laporan harian yang disimpan akan muncul di sini.</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </main>
  );
}

function countStatuses(logs: { status: string }[]) {
  return logs.reduce(
    (acc, log) => {
      if (log.status in acc) {
        acc[log.status as keyof typeof acc] += 1;
      }
      return acc;
    },
    { normal: 0, rusak: 0, operasi_menurun: 0 },
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
  }).format(new Date(value));
}
