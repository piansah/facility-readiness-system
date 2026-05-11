import Link from "next/link";
import { AlertTriangle, Camera, CheckCircle2, ClipboardList, Clock3, LogOut, Wrench, Server } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { getProfile } from "@/lib/auth/profile";
import { canCreateReports, canManageUnit, canReviewReports, roleLabel } from "@/lib/auth/roles";

type ReportSummary = {
  id?: string;
  report_date?: string;
  shift?: string;
  status?: string;
  unit_id?: string;
  total_normal?: number;
  total_rusak?: number;
  total_menurun?: number;
};

type OpenIssue = {
  id: string;
  title: string;
  status: string;
  occurred_at?: string;
  facility_name?: string;
};

type UnitInfo = {
  id: string;
  code: string;
  name: string;
};

type PendingReview = {
  id: string;
  report_date: string;
  shift: string;
  status: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getProfile(supabase, user.id);
  const isAdmin = canManageUnit(profile?.role);
  const canReview = canReviewReports(profile?.role);
  const isSuperAdmin = profile?.role === "super_admin";

  // Gunakan tanggal lokal (WIB/sesuai device) bukan UTC
  const today = new Date().toLocaleDateString('en-CA');
  
  // 1. Determine accessible Unit IDs
  let accessibleUnitIds: string[] = [];
  
  if (isSuperAdmin) {
    // Check if this Super Admin is assigned to specific units
    const { data: assignedUnits } = await supabase
      .from("super_admin_unit_access")
      .select("unit_id")
      .eq("user_id", user.id);
      
    if (assignedUnits && assignedUnits.length > 0) {
      accessibleUnitIds = assignedUnits.map(a => a.unit_id);
    } else {
      // If no assignments, assume they can see ALL active units (Global Super Admin)
      // Or you can make this more restrictive if needed.
    }
  } else if (profile?.unit_id) {
    accessibleUnitIds = [profile.unit_id];
  }

  // 2. Base queries
  // Ambil data laporan dasar untuk cek status (Shift Pagi/Malam)
  let reportsQuery = supabase
    .from("daily_reports")
    .select("id, report_date, shift, status")
    .eq("report_date", today);
    
  // Tetap ambil summary untuk angka KPI (Normal/Rusak/Menurun)
  let summariesQuery = supabase
    .from("vw_report_summary")
    .select("*")
    .eq("report_date", today);
    
  let openIssuesQuery = supabase
    .from("vw_open_issues")
    .select("*")
    .order("occurred_at", { ascending: false });

  // 3. Apply Filters
  if (accessibleUnitIds.length > 0) {
    reportsQuery = reportsQuery.in("unit_id", accessibleUnitIds);
    summariesQuery = summariesQuery.in("unit_id", accessibleUnitIds);
    openIssuesQuery = openIssuesQuery.in("unit_id", accessibleUnitIds);
  }

  // Extra data for Super Admin Grid
  let unitsQuery = null;
  if (isSuperAdmin) {
    unitsQuery = supabase.from("units").select("id, code, name").eq("is_active", true).order("code");
    if (accessibleUnitIds.length > 0) {
      unitsQuery = unitsQuery.in("id", accessibleUnitIds);
    }
  }
    
  // Pending reviews for Admin
  let pendingReviewsQuery = null;
  if (canReview) {
    pendingReviewsQuery = supabase.from("daily_reports").select("id, report_date, shift, status").eq("status", "submitted").order("submitted_at", { ascending: false }).limit(5);
    if (accessibleUnitIds.length > 0) {
      pendingReviewsQuery = pendingReviewsQuery.in("unit_id", accessibleUnitIds);
    }
  }

  const [
    { data: dailyReports },
    { data: summaries }, 
    { data: openIssues }, 
    unitsResult,
    pendingReviewsResult
  ] = await Promise.all([
    reportsQuery,
    summariesQuery.returns<ReportSummary[]>(),
    openIssuesQuery.limit(isSuperAdmin ? 20 : 5).returns<OpenIssue[]>(),
    unitsQuery ? unitsQuery.returns<UnitInfo[]>() : Promise.resolve({ data: null }),
    pendingReviewsQuery ? pendingReviewsQuery.returns<PendingReview[]>() : Promise.resolve({ data: null })
  ]);

  const units = unitsResult?.data ?? [];
  const pendingReviews = pendingReviewsResult?.data ?? [];

  const unitQuery = profile?.unit_id && !isSuperAdmin
    ? supabase.from("units").select("code,name").eq("id", profile.unit_id).single<UnitInfo>()
    : null;
  const unitResult = unitQuery ? await unitQuery : null;
  const unit = unitResult?.data ?? null;

  const totals = (summaries ?? []).reduce(
    (acc, report) => ({
      normal: acc.normal + (report.total_normal ?? 0),
      broken: acc.broken + (report.total_rusak ?? 0),
      degraded: acc.degraded + (report.total_menurun ?? 0),
    }),
    { normal: 0, broken: 0, degraded: 0 },
  );
  
  const shiftSummaries = ["pagi", "malam"].map((shift) => ({
    shift,
    report: (dailyReports ?? []).find((report) => report.shift === shift),
  }));

  const dashboardSubTitle = isSuperAdmin
    ? "Monitoring Overview Seluruh Unit"
    : profile?.role === "admin"
      ? `Management Dashboard - ${unit?.code ?? "Unit"}`
      : `Operational Dashboard - ${unit?.code ?? "Unit"}`;

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Facility <span className="text-emerald-500">Readiness System</span></h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mt-1">{dashboardSubTitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-200">{profile?.full_name ?? user.email}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{roleLabel(profile?.role)}</p>
            </div>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit" className="text-slate-400 hover:text-red-400 transition-colors">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xs:inline">Keluar</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6">
        {/* --- KPI Overview --- */}
        <section className="grid gap-4 sm:grid-cols-3">
          <StatusCard 
            title="Sistem Normal" 
            value={totals.normal} 
            icon={<CheckCircle2 className="h-6 w-6" />} 
            color="emerald"
          />
          <StatusCard 
            title="Perlu Perbaikan" 
            value={totals.broken} 
            icon={<Wrench className="h-6 w-6" />} 
            color="amber"
          />
          <StatusCard 
            title="Operasi Menurun" 
            value={totals.degraded} 
            icon={<AlertTriangle className="h-6 w-6" />} 
            color="red"
          />
        </section>

        {!profile?.is_active ? (
          <Card className="border-amber-900/70 bg-amber-950/20 backdrop-blur-sm">
            <CardContent className="p-5 text-sm text-amber-200 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Akun ini belum aktif sepenuhnya. Hubungi admin untuk aktivasi unit.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-12">
          {/* --- Main Content Area (8/12) - Second on mobile, First on desktop --- */}
          <div className="lg:col-span-8 order-last lg:order-first grid gap-6">
            
            {/* 1. Laporan Hari Ini Section */}
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader className="pb-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {isSuperAdmin ? "Progres Laporan Unit" : "Status Laporan Hari Ini"}
                    </CardTitle>
                    <CardDescription>{today}</CardDescription>
                  </div>
                  {canCreateReports(profile?.role) && (
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/50">
                        <Link href="/laporan?tab=draft">
                          <ClipboardList className="mr-1.5 h-4 w-4" /> Draft
                        </Link>
                      </Button>
                      <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/laporan/buat">
                          <ClipboardList className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Buat </span>Laporan
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                {isSuperAdmin ? (
                  /* --- Super Admin: Unit Progress Table --- */
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Unit</th>
                          <th className="px-4 py-3 text-center">Shift Pagi</th>
                          <th className="px-4 py-3 text-center">Shift Malam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {units.map((u) => {
                          const pagi = summaries?.find(s => s.unit_id === u.id && s.shift === 'pagi');
                          const malam = summaries?.find(s => s.unit_id === u.id && s.shift === 'malam');
                          return (
                            <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-bold text-slate-100">{u.code}</p>
                                <p className="text-[10px] text-slate-500">{u.name}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <ShiftStatusLink report={pagi} />
                              </td>
                              <td className="px-4 py-3 text-center">
                                <ShiftStatusLink report={malam} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* --- Regular User: Shift Cards --- */
                  <div className="grid gap-3">
                    {shiftSummaries.map(({ shift, report }) => (
                      <Link
                        key={shift}
                        href={report?.id ? `/laporan/${report.id}` : "/laporan/buat"}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4 transition-all hover:border-emerald-500/50 hover:bg-slate-900"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${report ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                            <Clock3 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold capitalize text-slate-100">Shift {shift}</p>
                            <p className="text-xs text-slate-500">
                              {report ? `Terakhir update: ${formatDateTime(report.report_date!)}` : "Belum ada laporan"}
                            </p>
                          </div>
                        </div>
                        <ShiftBadge status={report?.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Review Laporan (Admin Only) */}
            {canReview && pendingReviews.length > 0 && (
              <Card className="border-emerald-900/30 bg-emerald-950/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    Menunggu Review
                  </CardTitle>
                  <CardDescription>Laporan yang perlu diverifikasi admin.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {pendingReviews.map((rev) => (
                    <Link 
                      key={rev.id} 
                      href={`/laporan/${rev.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors"
                    >
                      <div className="text-sm">
                        <p className="font-semibold text-slate-100">{formatDate(rev.report_date)}</p>
                        <p className="text-xs text-slate-500 capitalize">Shift {rev.shift}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-emerald-400">Review</Button>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 3. Open Issues Section */}
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Non-Rutin & Insiden</CardTitle>
                  <CardDescription>Masalah yang masih memerlukan tindak lanjut.</CardDescription>
                </div>
                {canCreateReports(profile?.role) && (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/insiden/buat">
                      <Camera className="mr-2 h-4 w-4" /> Laporkan
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {openIssues?.length ? (
                  <div className="grid gap-3">
                    {openIssues.map((issue) => (
                      <Link
                        key={issue.id}
                        href={`/insiden/${issue.id}`}
                        className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 transition-all hover:border-amber-500/50 hover:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-100 group-hover:text-amber-400 transition-colors">{issue.title}</p>
                            <p className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                              <span className="font-semibold text-slate-400">{issue.facility_name ?? "Umum"}</span>
                              {issue.occurred_at && `- ${formatDateTime(issue.occurred_at)}`}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            issue.status === 'open' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {issue.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                    <Button asChild variant="ghost" className="w-full text-slate-500 hover:text-slate-200">
                      <Link href="/insiden">Lihat Semua History Non-Rutin</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-slate-800">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500/20 mb-3" />
                    <p className="text-sm text-slate-500">Semua aman. Tidak ada insiden terbuka.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* --- Sidebar (4/12) - First on mobile, Second on desktop --- */}
          <div className="lg:col-span-4 order-first lg:order-last grid gap-6 content-start">
            
            {/* Quick Access Menu */}
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader>
                <CardTitle className="text-base">Akses Cepat</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900">
                  <Link href="/laporan">
                    <ClipboardList className="mr-3 h-4 w-4 text-emerald-400" /> History Laporan
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900">
                  <Link href="/insiden">
                    <Camera className="mr-3 h-4 w-4 text-amber-400" /> History Non-Rutin
                  </Link>
                </Button>
                
                {isAdmin && (
                  <>
                    <div className="my-2 border-t border-slate-800" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 mb-1">Manajemen Unit</p>
                    <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900">
                      <Link href="/manajemen/pengguna">
                        <LogOut className="mr-3 h-4 w-4 text-blue-400 rotate-180" /> Kelola Pengguna
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900">
                      <Link href="/manajemen/fasilitas">
                        <Wrench className="mr-3 h-4 w-4 text-purple-400" /> Kelola Fasilitas
                      </Link>
                    </Button>
                    {isSuperAdmin && (
                      <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900">
                        <Link href="/manajemen/sistem">
                          <Server className="mr-3 h-4 w-4 text-blue-400" /> Manajemen Sistem
                        </Link>
                      </Button>
                    )}
                    {canReview ? (
                      <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900">
                        <Link href="/laporan/review">
                          <CheckCircle2 className="mr-3 h-4 w-4 text-emerald-400" /> Review Laporan
                        </Link>
                      </Button>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Super Admin: Unit Health Grid */}
            {isSuperAdmin && units.length > 0 && (
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader>
                  <CardTitle className="text-base">Kesehatan Unit</CardTitle>
                  <CardDescription>Status real-time per unit.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {units.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-xs">
                        <p className="font-bold text-slate-100">{u.code}</p>
                        <p className="text-slate-500">{u.name}</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}

function ShiftStatusLink({ report }: { report?: ReportSummary }) {
  if (report) {
    return (
      <Link href={`/laporan/${report.id}`} className="inline-flex">
        <ShiftBadge status={report.status} />
      </Link>
    );
  }

  return (
    <div className="opacity-40">
      <ShiftBadge status="none" />
    </div>
  );
}

function ShiftBadge({ status }: { status?: string }) {
  if (status === "submitted" || status === "reviewed") {
    return (
      <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-200">
        Submitted
      </span>
    );
  }

  if (status === "draft") {
    return (
      <span className="rounded-md bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-200">
        Draft
      </span>
    );
  }

  if (status === "none") {
    return (
      <span className="rounded-md bg-slate-800/40 px-2 py-1 text-[10px] font-medium text-slate-500">
        Belum ada
      </span>
    );
  }

  return (
    <span className="rounded-md bg-slate-700/60 px-2 py-1 text-xs font-medium text-slate-300">
      Belum dibuat
    </span>
  );
}

function StatusCard({
  title,
  value,
  icon,
  color = "emerald",
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: "emerald" | "amber" | "red" | "blue";
}) {
  const colorStyles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  return (
    <Card className={`border ${colorStyles[color]}`}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">{title}</p>
          <p className="mt-1 text-3xl font-black">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorStyles[color]} border shadow-lg shadow-black/20`}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
  }).format(new Date(value));
}
