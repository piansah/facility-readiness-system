import React, { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Wrench, AlertTriangle, LogOut, BarChart3, ClipboardList, Clock3, Camera, Server, Calendar, Users, BookOpen, User } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { getProfile } from "@/lib/auth/profile";
import { canCreateReports, canCreateIncidents, canReviewReports, canAccessManagement, roleLabel } from "@/lib/auth/roles";
import { RefreshOnDateChange } from "@/components/dashboard/refresh-on-date-change";
import { AddUnitDialog } from "./AddUnitDialog";
import { EditUnitDialog } from "./EditUnitDialog";
import { QRScanner } from "@/components/qr-scanner";

type ReportSummary = {
  id?: string;
  report_date?: string;
  submitted_at?: string;
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


export default function DashboardPage() {
  return (
    <main className="min-h-dvh bg-slate-950">
      <RefreshOnDateChange />
      <Suspense fallback={<div className="p-6 space-y-4"><div className="h-24 bg-slate-900/50 rounded-2xl animate-pulse" /></div>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile } = await getProfile(supabase, user.id);
  const isAdmin = canAccessManagement(profile?.role); // true untuk super_admin dan admin
  const canReview = canReviewReports(profile?.role);  // true hanya untuk admin
  const isSuperAdmin = profile?.role === "super_admin";

  const unitDisplayName = isSuperAdmin ? "Administrator Pusat" : (profile as any)?.units?.name || "Unit Tidak Diketahui";

  // Jendela Operasional: Tentukan tanggal dan shift yang relevan
  const now = new Date();
  const jakartaParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  }).formatToParts(now);

  const year = jakartaParts.find(p => p.type === 'year')?.value;
  const month = jakartaParts.find(p => p.type === 'month')?.value;
  const day = jakartaParts.find(p => p.type === 'day')?.value;
  const currentHour = parseInt(jakartaParts.find(p => p.type === 'hour')?.value || '0');

  const today = `${year}-${month}-${day}`;
  const formattedToday = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
  }).format(now);
  const todayDate = new Date(`${today}T00:00:00`);
  const yesterday = new Date(todayDate.getTime() - 86400000).toLocaleDateString('en-CA');
  const tomorrow = new Date(todayDate.getTime() + 86400000).toLocaleDateString('en-CA');

  let activeShifts: { date: string; shift: string; label: string; deadline: string; deadlineDate: string }[] = [];

  if (currentHour >= 8 && currentHour < 20) {
    activeShifts = [
      { date: yesterday, shift: 'malam', label: 'Malam', deadline: '08:00 tadi', deadlineDate: `${today}T08:00:00` },
      { date: today, shift: 'pagi', label: 'Pagi', deadline: '20:00 nanti', deadlineDate: `${today}T20:00:00` }
    ];
  } else if (currentHour >= 20) {
    activeShifts = [
      { date: today, shift: 'pagi', label: 'Pagi', deadline: '20:00 tadi', deadlineDate: `${today}T20:00:00` },
      { date: today, shift: 'malam', label: 'Malam', deadline: '08:00 besok', deadlineDate: `${tomorrow}T08:00:00` }
    ];
  } else {
    activeShifts = [
      { date: yesterday, shift: 'pagi', label: 'Pagi', deadline: '20:00 kemarin', deadlineDate: `${yesterday}T20:00:00` },
      { date: yesterday, shift: 'malam', label: 'Malam', deadline: '08:00 nanti', deadlineDate: `${today}T08:00:00` }
    ];
  }

  const targetDates = Array.from(new Set(activeShifts.map(s => s.date)));
  let accessibleUnitIds: string[] = [];

  if (isSuperAdmin) {
    const { data: assignedUnits } = await supabase
      .from("super_admin_unit_access")
      .select("unit_id")
      .eq("user_id", user.id);

    if (assignedUnits && assignedUnits.length > 0) {
      accessibleUnitIds = assignedUnits.map(a => a.unit_id);
    }
  } else if (profile?.unit_id) {
    accessibleUnitIds = [profile.unit_id];
  }

  let reportsQuery = supabase
    .from("daily_reports")
    .select("id, report_date, submitted_at, shift, status")
    .in("report_date", targetDates);

  let summariesQuery = supabase
    .from("vw_report_summary")
    .select("*")
    .eq("report_date", today);

  let openIssuesQuery = supabase
    .from("vw_open_issues")
    .select("*")
    .order("occurred_at", { ascending: false });

  if (accessibleUnitIds.length > 0) {
    reportsQuery = reportsQuery.in("unit_id", accessibleUnitIds);
    summariesQuery = summariesQuery.in("unit_id", accessibleUnitIds);
    openIssuesQuery = openIssuesQuery.in("unit_id", accessibleUnitIds);
  }

  let unitsQuery = null;
  if (isSuperAdmin) {
    unitsQuery = supabase.from("units").select("id, code, name").eq("is_active", true).order("code");
    if (accessibleUnitIds.length > 0) {
      unitsQuery = unitsQuery.in("id", accessibleUnitIds);
    }
  }

  let pendingReviewsQuery = null;
  if (canReview) {
    pendingReviewsQuery = supabase.from("daily_reports").select("id, report_date, submitted_at, shift, status").eq("status", "submitted").order("submitted_at", { ascending: false }).limit(5);
    if (accessibleUnitIds.length > 0) {
      pendingReviewsQuery = pendingReviewsQuery.in("unit_id", accessibleUnitIds);
    }
  }

  const [
    { data: dailyReports },
    { data: summaries },
    { data: openIssues },
    unitsResult,
    pendingReviewsResult,
    profilesResult,
    facilitiesResult
  ] = await Promise.all([
    reportsQuery,
    summariesQuery.returns<ReportSummary[]>(),
    openIssuesQuery.limit(isSuperAdmin ? 20 : 5).returns<OpenIssue[]>(),
    unitsQuery ? unitsQuery.returns<UnitInfo[]>() : Promise.resolve({ data: null }),
    pendingReviewsQuery ? pendingReviewsQuery.returns<PendingReview[]>() : Promise.resolve({ data: null }),
    isSuperAdmin ? supabase.from("users").select("unit_id") : Promise.resolve({ data: [] }),
    isSuperAdmin ? supabase.from("facilities").select("unit_id") : Promise.resolve({ data: [] })
  ]);

  const allProfiles = isSuperAdmin ? (profilesResult?.data ?? []) : [];
  const allFacilities = isSuperAdmin ? (facilitiesResult?.data ?? []) : [];
  const totalUsers = allProfiles.length;
  const totalFacilities = allFacilities.length;
  const units = unitsResult?.data ?? [];
  const pendingReviews = pendingReviewsResult?.data ?? [];

  const unitStats = units.map(u => ({
    ...u,
    personnelCount: allProfiles.filter((p) => (p as { unit_id: string }).unit_id === u.id).length,
    facilityCount: allFacilities.filter((f) => (f as { unit_id: string }).unit_id === u.id).length
  }));

  const totals = (summaries ?? []).reduce(
    (acc, report) => ({
      normal: acc.normal + (report.total_normal ?? 0),
      broken: acc.broken + (report.total_rusak ?? 0),
      degraded: acc.degraded + (report.total_menurun ?? 0),
    }),
    { normal: 0, broken: 0, degraded: 0 },
  );

  const nowJakarta = new Date(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).format(now));

  const shiftSummaries = activeShifts.map((cfg) => {
    const report = (dailyReports ?? []).find((r) => r.report_date === cfg.date && r.shift === cfg.shift);
    const deadlineTime = new Date(cfg.deadlineDate).getTime();
    const isOverdue = (!report || report.status === 'draft') && nowJakarta.getTime() > deadlineTime;
    return { ...cfg, report, isOverdue };
  });

  const dashboardSubTitle = isSuperAdmin
    ? "Monitoring Overview Seluruh Unit"
    : profile?.role === "admin"
      ? `Management Dashboard`
      : `Operational Dashboard`;

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Facility <span className="text-emerald-500">Readiness System</span></h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500 mt-1">{unitDisplayName}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl lg:grid-cols-12 gap-6 px-4 py-6">
        {/* --- Super Admin Welcome Banner --- */}
        {isSuperAdmin && (
          <section className="lg:col-span-12 relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-100">Selamat Datang, {profile?.full_name?.split(' ')[0]}</h2>
                <p className="mt-2 text-slate-400 max-w-md">Panel kendali pusat untuk pengelolaan sumber daya personil dan fasilitas di seluruh unit operasional.</p>
              </div>
              <div className="flex gap-4">
                <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-4 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Personil</p>
                  <p className="text-2xl font-black text-emerald-400">{totalUsers}</p>
                </div>
                <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-4 backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Fasilitas</p>
                  <p className="text-2xl font-black text-blue-400">{totalFacilities}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* --- KPI Overview --- */}
        {!isSuperAdmin && (
          <section className="lg:col-span-12 grid grid-cols-3 gap-2 sm:gap-6">
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
        )}

        {/* --- Mobile & Tablet Quick Access (Below KPI, hidden on large desktop) --- */}
        <section className="lg:hidden lg:col-span-12">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Monitoring & History</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 pb-4">
              {!isSuperAdmin && (
                <>
                  <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                    <Link href="/laporan">
                      <ClipboardList className="mr-3 h-5 w-5 text-emerald-400" /> History Laporan
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                    <Link href="/insiden">
                      <Camera className="mr-3 h-5 w-5 text-amber-400" /> History Non-Rutin
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                    <Link href="/manajemen/statistik">
                      <BarChart3 className="mr-3 h-5 w-5 text-emerald-400" /> Analitik & Statistik
                    </Link>
                  </Button>
                </>
              )}

              {isAdmin && (
                <>
                  {!isSuperAdmin && (
                    <>
                      <div className="my-2 border-t border-slate-800" />
                      <p className="text-sm font-bold uppercase tracking-wider text-white px-1 mb-2">Management Unit</p>
                    </>
                  )}
                  <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                    <Link href="/manajemen/pengguna">
                      <LogOut className="mr-3 h-5 w-5 text-blue-400 rotate-180" /> Kelola Pengguna
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                    <Link href="/manajemen/fasilitas">
                      <Wrench className="mr-3 h-5 w-5 text-purple-400" /> Kelola Fasilitas
                    </Link>
                  </Button>
                  {isSuperAdmin && (
                    <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                      <Link href="/manajemen/sistem">
                        <Server className="mr-3 h-5 w-5 text-blue-400" /> Manajemen Sistem
                      </Link>
                    </Button>
                  )}

                </>
              )}
            </CardContent>
          </Card>
        </section>


        {!profile?.is_active ? (
          <Card className="border-amber-900/70 bg-amber-950/20 backdrop-blur-sm">
            <CardContent className="p-5 text-sm text-amber-200 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Akun ini belum aktif sepenuhnya. Hubungi admin untuk aktivasi unit.
            </CardContent>
          </Card>
        ) : null}

        <div className="lg:col-span-8 grid gap-6">
          {isSuperAdmin && (
            <section className="grid gap-6">
              <Card className="border-slate-800 bg-slate-900/40 shadow-xl overflow-hidden">
                <div className="bg-slate-800/20 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Ringkasan Sumber Daya Unit</CardTitle>
                    <CardDescription>Distribusi personil dan fasilitas per unit kerja.</CardDescription>
                  </div>
                  <AddUnitDialog />
                </div>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-6 py-4">Unit</th>
                          <th className="px-6 py-4 text-center">Personil</th>
                          <th className="px-6 py-4 text-center">Fasilitas</th>
                          <th className="px-6 py-4 text-right pr-6">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {unitStats.map((stat) => (
                          <tr key={stat.id} className="hover:bg-slate-800/30 transition-colors group">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-100">{stat.code}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{stat.name}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                                {stat.personnelCount} Orang
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-500/20">
                                {stat.facilityCount} Aset
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right pr-6">
                              <div className="flex items-center justify-end gap-2">
                                <EditUnitDialog unit={{ id: stat.id, code: stat.code, name: stat.name }} />
                                <Button variant="ghost" size="sm" className="text-slate-500 group-hover:text-emerald-400 group-hover:bg-emerald-500/5 h-8" asChild>
                                  <Link href={`/manajemen/fasilitas?unit=${stat.id}`}>Detail</Link>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* 1. Laporan Hari Ini Section */}
          <div className="grid gap-4">

            {!isSuperAdmin && (
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">Status Laporan Hari Ini</CardTitle>
                      <CardDescription>{formattedToday}</CardDescription>
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
                  <div className="grid gap-3">
                    {shiftSummaries.map((item) => {
                      const href = item.report?.id
                        ? `/laporan/${item.report.id}`
                        : (isAdmin ? "/laporan/belum-ada" : `/laporan/buat?date=${item.date}&shift=${item.shift}`);

                      return (
                        <Link
                          key={`${item.date}-${item.shift}`}
                          href={href}
                          className="group flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:p-4 transition-all hover:border-emerald-500/50 hover:bg-slate-900"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${item.report ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                              <Clock3 className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-tight">Shift {item.label}</p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {item.report
                                  ? item.report.submitted_at
                                    ? `Update: ${formatDateTime(item.report.submitted_at)}`
                                    : `Tanggal: ${formatDate(item.report.report_date!)}`
                                  : `Batas Submit: ${item.deadline}`}
                              </p>
                            </div>
                          </div>
                          <ShiftBadge status={item.report?.status} isOverdue={item.isOverdue} />
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

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
            {!isSuperAdmin && (
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">Non-Rutin & Insiden</CardTitle>
                    <CardDescription>Masalah yang masih memerlukan tindak lanjut.</CardDescription>
                  </div>
                  {canCreateIncidents(profile?.role) && (
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
                            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${issue.status === 'open' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
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
            )}
          </div>
        </div>

        {/* --- Desktop Sidebar (4/12) --- */}
        <div className="hidden lg:grid lg:col-span-4 gap-6 content-start">
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Monitoring & Laporan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {!isSuperAdmin && (
                <>
                  <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                    <Link href="/laporan">
                      <ClipboardList className="mr-3 h-5 w-5 text-emerald-400" /> History Laporan
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                    <Link href="/insiden">
                      <Camera className="mr-3 h-5 w-5 text-amber-400" /> History Non-Rutin
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                    <Link href="/manajemen/statistik">
                      <BarChart3 className="mr-3 h-5 w-5 text-emerald-400" /> Analitik & Statistik
                    </Link>
                  </Button>
                </>
              )}

              {isAdmin && (
                <>
                  {!isSuperAdmin && (
                    <>
                      <div className="my-2 border-t border-slate-800" />
                      <p className="text-sm font-bold uppercase tracking-wider text-white px-1 mb-2">Management Unit</p>
                    </>
                  )}
                  <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                    <Link href="/manajemen/pengguna">
                      <LogOut className="mr-3 h-5 w-5 text-blue-400 rotate-180" /> Kelola Pengguna
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                    <Link href="/manajemen/fasilitas">
                      <Wrench className="mr-3 h-5 w-5 text-purple-400" /> Kelola Fasilitas
                    </Link>
                  </Button>
                  {isSuperAdmin && (
                    <Button asChild variant="outline" className="justify-start border-slate-800 bg-slate-950 hover:bg-slate-900 h-11 px-3 text-white">
                      <Link href="/manajemen/sistem">
                        <Server className="mr-3 h-5 w-5 text-blue-400" /> Manajemen Sistem
                      </Link>
                    </Button>
                  )}

                </>
              )}
            </CardContent>
          </Card>
        </div>



      </div>
    </>
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

function ShiftBadge({ status, isOverdue }: { status?: string, isOverdue?: boolean }) {
  if (status === "submitted" || status === "reviewed") {
    return (
      <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] sm:text-xs font-medium text-emerald-200">
        Selesai
      </span>
    );
  }

  if (status === "draft") {
    return (
      <span className={`rounded-md px-2 py-1 text-[10px] sm:text-xs font-medium ${isOverdue ? 'bg-red-500/15 text-red-400' : 'bg-sky-500/15 text-sky-200'}`}>
        {isOverdue ? 'Draft (Terlambat)' : 'Draft'}
      </span>
    );
  }

  if (status === "none") {
    return (
      <span className="rounded-md bg-slate-800/40 px-2 py-1 text-[9px] sm:text-[10px] font-medium text-slate-500">
        Kosong
      </span>
    );
  }

  return (
    <span className={`rounded-md px-2 py-1 text-[10px] sm:text-xs font-medium ${isOverdue ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-700/60 text-slate-300'}`}>
      {isOverdue ? 'Terlambat' : 'Belum'}
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
    <Card className={`border ${colorStyles[color]} overflow-hidden`}>
      <CardContent className="flex items-center justify-between p-2 sm:p-5">
        <div className="min-w-0">
          <p className="hidden sm:block text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{title}</p>
          <p className="text-xl sm:text-3xl font-black">{value}</p>
        </div>
        <div className={`flex h-7 w-7 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${colorStyles[color]} border shadow-lg shadow-black/20`}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-3.5 w-3.5 sm:h-6 sm:w-6" })}
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
