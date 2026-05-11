   import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";
import { canCreateReports } from "@/lib/auth/roles";
import { saveDailyReport } from "@/app/laporan/buat/actions";
import { DraftManager } from "@/components/draft-manager";
import { ConfirmSubmitButtons } from "@/components/confirm-submit-buttons";
import { StaffSelector } from "@/components/staff-selector";

type FacilityRow = {
  id: string;
  name: string;
  location_detail: string | null;
  facility_categories: {
    name: string;
    icon: string | null;
    sort_order: number;
  } | null;
  log?: {
    status: string;
    notes: string | null;
  };
};

type FacilityLog = {
  facility_id: string;
  status: string;
  notes: string | null;
};

type StaffSnapshot = {
  id?: string;
};

type CategoryGroup = {
  name: string;
  icon: string | null;
  facilities: FacilityRow[];
};

export default async function EditReportPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params;
  const searchProps = await searchParams;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/laporan/${id}/edit`);
  }

  const { profile } = await getProfile(supabase, user.id);

  if (!profile?.is_active || !canCreateReports(profile.role)) {
    redirect("/dashboard?error=forbidden");
  }

  // 1. Fetch the existing report
  const { data: report, error: reportError } = await supabase
    .from("daily_reports")
    .select(`
      *,
      facility_status_logs (
        facility_id,
        status,
        notes
      )
    `)
    .eq("id", id)
    .single();

  if (reportError || !report) {
    notFound();
  }

  // Only allow editing if it's a draft or submitted (maybe just draft)
  if (report.status !== "draft" && report.status !== "submitted") {
    redirect(`/laporan/${id}?error=cannot_edit`);
  }

  // Prevent editing reports from other units
  if (report.unit_id !== profile.unit_id) {
    redirect("/dashboard?error=forbidden");
  }

  // 2. Fetch all facilities for this unit
  const { data: facilitiesData } = await supabase
    .from("facilities")
    .select(`
      id,
      name,
      location_detail,
      facility_categories (
        name,
        icon,
        sort_order
      )
    `)
    .eq("unit_id", report.unit_id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<FacilityRow[]>();

  // 3. Fetch staff options
  const { data: staffOptions } = await supabase
    .from("users")
    .select("id,full_name,role")
    .eq("unit_id", report.unit_id)
    .eq("is_active", true)
    .in("role", ["admin", "petugas"])
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  // 4. Merge logs into facilities
  const facilities = facilitiesData?.map(f => {
    const log = (report.facility_status_logs as FacilityLog[] | undefined)?.find((l) => l.facility_id === f.id);
    return { ...f, log };
  }) ?? [];

  const groups = groupFacilities(facilities);

  const currentStaffIds = ((report.current_shift_staff as StaffSnapshot[] | undefined) ?? [])
    .map((s) => s.id)
    .filter((id): id is string => Boolean(id));
  const nextStaffIds = ((report.next_shift_staff as StaffSnapshot[] | undefined) ?? [])
    .map((s) => s.id)
    .filter((id): id is string => Boolean(id));

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex h-8 w-8 p-0" aria-label="Kembali">
            <Link href={`/laporan/${id}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-semibold text-slate-100">Edit Laporan (Draft)</h1>
            <p className="text-xs text-slate-400">Update status kesiapan fasilitas.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl p-4">
        <DraftManager formId="edit-report-form" storageKey={`edit-report-${id}`} />

        <form id="edit-report-form" action={saveDailyReport} className="grid gap-6 pb-20">
          <input type="hidden" name="report_id" value={report.id} />
          
          <Card>
            <CardHeader>
              <CardTitle>Informasi Shift</CardTitle>
              <CardDescription>Status fasilitas akan disimpan ke database sesuai unit dan role user.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="report_date">Tanggal</Label>
                <div className="relative">
                  <input
                    type="date"
                    id="report_date"
                    name="report_date"
                    required
                    readOnly
                    className="h-11 w-full rounded-md border border-slate-700 bg-slate-900/50 px-3 text-sm text-slate-400 outline-none"
                    defaultValue={report.report_date}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shift">Shift</Label>
                <select
                  id="shift"
                  name="shift"
                  className="h-11 rounded-md border border-slate-700 bg-slate-900/50 px-3 text-sm text-slate-400 outline-none"
                  defaultValue={report.shift}
                >
                  <option value={report.shift}>{report.shift === "pagi" ? "Pagi" : "Malam"}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Petugas Serah Terima Shift</CardTitle>
              <CardDescription>
                Centang admin/petugas yang bertugas agar muncul di detail dan export PDF.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StaffSelector 
                staff={staffOptions ?? []} 
                initialCurrentIds={currentStaffIds}
                initialNextIds={nextStaffIds}
                currentDateLabel={formatDateShort(report.report_date)}
              />
            </CardContent>
          </Card>

          {searchProps.error ? (
            <Card className="border-red-900/70 bg-red-950/40">
              <CardContent className="p-5 text-sm text-red-200">
                Gagal menyimpan laporan: {searchProps.error}
              </CardContent>
            </Card>
          ) : null}

          {groups.length ? (
            groups.map((group, index) => (
              <Card key={`${group.name}-${index}`}>
                <CardHeader>
                  <CardTitle>
                    {index + 1}. {group.icon ? `${group.icon} ` : ""}
                    {group.name}
                  </CardTitle>
                  <CardDescription>{group.facilities.length} fasilitas aktif</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {group.facilities.map((facility, facilityIndex) => (
                    <div
                      key={facility.id}
                      className="grid gap-3 rounded-md border border-slate-800 bg-slate-900 p-3"
                    >
                      <div>
                        <p className="font-medium text-slate-100">
                          {facilityIndex + 1}. {facility.name}
                        </p>
                        {facility.location_detail ? (
                          <p className="mt-1 text-sm text-slate-400">{facility.location_detail}</p>
                        ) : null}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input type="hidden" name="facility_id" value={facility.id} />
                        <StatusOption facilityId={facility.id} value="normal" label="Normal" current={facility.log?.status} />
                        <StatusOption facilityId={facility.id} value="rusak" label="Rusak" current={facility.log?.status} />
                        <StatusOption facilityId={facility.id} value="operasi_menurun" label="Menurun" current={facility.log?.status} />
                      </div>
                      <Input name={`note_${facility.id}`} placeholder="Catatan opsional" defaultValue={facility.log?.notes ?? ""} />
                    </div>
                  ))}
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

          <ConfirmSubmitButtons isEdit={true} />
        </form>
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

function StatusOption({ facilityId, value, label, current }: { facilityId: string; value: string; label: string; current?: string }) {
  const isDefault = current ? current === value : value === "normal";
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-700 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-400">
      <input type="radio" name={`status_${facilityId}`} value={value} defaultChecked={isDefault} className="sr-only" />
      <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current">
        <span className="h-2 w-2 rounded-full bg-current opacity-0 transition-opacity [.sr-only:checked~span>&]:opacity-100" />
      </span>
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
