import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { canCreateReports, roleLabel } from "@/lib/auth/roles";
import { saveDailyReport } from "./actions";
import { DraftManager } from "@/components/draft-manager";
import { ConfirmSubmitButtons } from "@/components/confirm-submit-buttons";
import { StaffSelector } from "@/components/staff-selector";

type FacilityRow = {
// ... (rest of types)
  id: string;
  name: string;
  location_detail: string | null;
  facility_categories: {
    name: string;
    icon: string | null;
    sort_order: number;
  } | null;
};

type CategoryGroup = {
  name: string;
  icon: string | null;
  facilities: FacilityRow[];
};

type StaffOption = {
  id: string;
  full_name: string;
  role: string;
};

type LatestReportSnapshot = {
  id: string;
  report_date: string;
  shift: string;
  facility_status_logs: {
    facility_id: string;
    status: string;
    notes: string | null;
  }[];
};

type CreateReportPageProps = {
  searchParams: Promise<{ 
    error?: string;
    date?: string;
    shift?: string;
    facility_id?: string;
  }>;
};

export default async function CreateReportPage({ searchParams }: CreateReportPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/laporan/buat");
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active || !canCreateReports(profile.role)) {
    redirect("/dashboard?error=forbidden");
  }

  // Gunakan tanggal lokal (WIB/sesuai device) bukan UTC
  const today = new Date().toLocaleDateString('en-CA');
  const initialDate = params.date || today;
  const initialShift = params.shift || "pagi";

  // Fetch all necessary data in parallel
  const [
    { data: facilities, error }, 
    { data: staffOptions }, 
    { data: latestReports },
    { data: shiftConfigs },
    { data: rosters }
  ] = await Promise.all([
    supabase
      .from("facilities")
      .select(`id, name, location_detail, facility_categories (name, icon, sort_order)`)
      .eq("unit_id", profile.unit_id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .returns<FacilityRow[]>(),
    supabase
      .from("users")
      .select("id,full_name,role")
      .eq("unit_id", profile.unit_id)
      .eq("is_active", true)
      .in("role", ["admin", "petugas"])
      .order("role", { ascending: true })
      .order("full_name", { ascending: true })
      .returns<StaffOption[]>(),
    supabase
      .from("daily_reports")
      .select(`id, report_date, shift, facility_status_logs (facility_id, status, notes)`)
      .eq("unit_id", profile.unit_id)
      .in("status", ["submitted", "reviewed"])
      .order("report_date", { ascending: false })
      .order("submitted_at", { ascending: false })
      .limit(1)
      .returns<LatestReportSnapshot[]>(),
    supabase
      .from("shift_configs")
      .select("id, code")
      .eq("unit_id", profile.unit_id),
    supabase
      .from("duty_rosters")
      .select("user_id, shift_config_id, duty_date")
      .eq("unit_id", profile.unit_id)
      .gte("duty_date", initialDate)
      .lte("duty_date", new Date(new Date(initialDate).getTime() + 86400000).toLocaleDateString('en-CA')) // Include tomorrow for handover
  ]);

  const groups = groupFacilities(facilities ?? []);
  const latestReport = latestReports?.[0] ?? null;
  const latestStatusByFacility = new Map(
    latestReport?.facility_status_logs.map((log) => [
      log.facility_id,
      {
        status: log.status,
        notes: log.notes,
      },
    ]) ?? [],
  );

  // Mapping shift to config IDs
  const pagiConfig = shiftConfigs?.find(c => c.code === 'APBA');
  const malamConfig = shiftConfigs?.find(c => c.code === 'APBB');
  
  const currentConfigId = initialShift === 'pagi' ? pagiConfig?.id : malamConfig?.id;
  
  // Logic for next shift: Pagi -> Malam (Today), Malam -> Pagi (Tomorrow)
  const nextDate = initialShift === 'pagi' ? initialDate : new Date(new Date(initialDate).getTime() + 86400000).toLocaleDateString('en-CA');
  const nextConfigId = initialShift === 'pagi' ? malamConfig?.id : pagiConfig?.id;

  // Filter roster for current and next staff
  const currentStaffIds = rosters
    ?.filter(r => r.duty_date === initialDate && r.shift_config_id === currentConfigId)
    .map(r => r.user_id) || [];
    
  const nextStaffIds = rosters
    ?.filter(r => r.duty_date === nextDate && r.shift_config_id === nextConfigId)
    .map(r => r.user_id) || [];

  // Fallback to current user if roster is empty
  const initialCurrentIds = currentStaffIds.length > 0 ? currentStaffIds : [user.id];
  const initialNextIds = nextStaffIds;

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex" aria-label="Kembali ke dashboard">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Laporan Harian
            </p>
            <h1 className="text-xl font-semibold text-slate-100">Buat Laporan Kesiapan</h1>
            <p className="mt-1 text-sm text-slate-400">
              {profile.full_name} - {roleLabel(profile.role)}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5">
        <DraftManager formId="report-form" storageKey="daily-report-draft" userId={user.id} />

        <form id="report-form" action={saveDailyReport} className="grid gap-6">
          {/* Top Section: Shift Info & Handover Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Informasi Shift</CardTitle>
                  <CardDescription>Status fasilitas sesuai unit dan role.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="report_date">Tanggal</Label>
                    <Input 
                      id="report_date" 
                      name="report_date" 
                      type="date" 
                      defaultValue={initialDate} 
                      data-no-draft="true"
                      className="bg-slate-900/50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="shift">Shift</Label>
                    <select
                      id="shift"
                      name="shift"
                      className="h-11 rounded-md border border-slate-800 bg-slate-900/50 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      defaultValue={initialShift}
                    >
                      <option value="pagi">Pagi</option>
                      <option value="malam">Malam</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-8">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Petugas Serah Terima Shift</CardTitle>
                  <CardDescription>
                    Centang admin/petugas yang bertugas shift ini dan berikutnya.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StaffSelector 
                    staff={staffOptions ?? []} 
                    initialCurrentIds={initialCurrentIds}
                    initialNextIds={initialNextIds}
                    currentDateLabel={formatDateShort(initialDate)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

        {latestReport ? (
          <Card className="border-emerald-900/40 bg-emerald-950/10">
            <CardContent className="p-4 text-sm text-emerald-100">
              Status fasilitas otomatis mengikuti laporan terakhir: {formatDateShort(latestReport.report_date)} - shift{" "}
              {latestReport.shift}. Ubah hanya bagian yang kondisinya berubah.
            </CardContent>
          </Card>
        ) : null}

        {params.error ? (
          <Card className="border-red-900/70 bg-red-950/40">
            <CardContent className="p-5 text-sm text-red-200">
              Gagal menyimpan laporan: {params.error}
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-red-900/70 bg-red-950/40">
            <CardContent className="p-5 text-sm text-red-200">
              Gagal mengambil data fasilitas: {error.message}
            </CardContent>
          </Card>
        ) : null}

        {groups.length ? (
          groups.map((group, index) => (
            <Card key={`${group.name}-${index}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {group.icon ? <span>{group.icon}</span> : null}
                  <span>{group.name}</span>
                </CardTitle>
                <CardDescription>{group.facilities.length} fasilitas aktif</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {group.facilities.map((facility, facilityIndex) => {
                  const isHighlighted = params.facility_id === facility.id;
                  return (
                    <div
                      key={facility.id}
                      id={`facility-card-${facility.id}`}
                      className={`grid gap-3 rounded-md border p-3 transition-all duration-500 ${
                        isHighlighted 
                          ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20 scale-[1.02] shadow-lg shadow-amber-500/10 animate-pulse" 
                          : "border-slate-800 bg-slate-900"
                      }`}
                    >
                    <div>
                      <p className="font-medium text-slate-100 flex items-center gap-2">
                        {group.icon ? <span className="text-slate-400">{group.icon}</span> : null}
                        <span>{facility.name}</span>
                      </p>
                      {facility.location_detail ? (
                        <p className="mt-1 text-sm text-slate-400">{facility.location_detail}</p>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input type="hidden" name="facility_id" value={facility.id} />
                      <StatusOption
                        facilityId={facility.id}
                        value="normal"
                        label="Normal"
                        current={latestStatusByFacility.get(facility.id)?.status}
                      />
                      <StatusOption
                        facilityId={facility.id}
                        value="rusak"
                        label="Rusak"
                        current={latestStatusByFacility.get(facility.id)?.status}
                      />
                      <StatusOption
                        facilityId={facility.id}
                        value="operasi_menurun"
                        label="Menurun"
                        current={latestStatusByFacility.get(facility.id)?.status}
                      />
                    </div>
                    <Input
                      name={`note_${facility.id}`}
                      placeholder="Catatan opsional"
                      defaultValue={latestStatusByFacility.get(facility.id)?.notes ?? ""}
                    />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-slate-400">
              Belum ada fasilitas aktif yang bisa ditampilkan.
            </CardContent>
          </Card>
        )}

        <ConfirmSubmitButtons isEdit={false} />
      </form>

      {/* Auto-scroll to highlighted facility if exists */}
      {params.facility_id && (
        <script dangerouslySetInnerHTML={{
          __html: `
            setTimeout(() => {
              const el = document.getElementById('facility-card-${params.facility_id}');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 500);
          `
        }} />
      )}
    </div>
  </main>
  );
}

function groupFacilities(facilities: FacilityRow[]) {
  const groups = new Map<string, CategoryGroup>();

  for (const facility of facilities) {
    const categoryName = facility.facility_categories?.name ?? "Lainnya";
    const current = groups.get(categoryName);

    if (current) {
      current.facilities.push(facility);
    } else {
      groups.set(categoryName, {
        name: categoryName,
        icon: facility.facility_categories?.icon ?? null,
        facilities: [facility],
      });
    }
  }

  return Array.from(groups.values());
}

function StatusOption({
  facilityId,
  value,
  label,
  current,
}: {
  facilityId: string;
  value: string;
  label: string;
  current?: string;
}) {
  const selectedValue = current ?? "normal";

  return (
    <label className="flex min-h-10 items-center justify-center rounded-md border border-slate-700 bg-slate-950 px-2 text-center text-xs font-medium text-slate-200 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-500/15 has-[:checked]:text-emerald-200">
      <input
        type="radio"
        name={`status_${facilityId}`}
        value={value}
        defaultChecked={value === selectedValue}
        className="sr-only"
      />
      {label}
    </label>
  );
}

function formatDateShort(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
