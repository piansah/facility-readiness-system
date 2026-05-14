import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Clock3, History, Camera, MapPin, Box } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth/profile";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FacilityHistoryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/fasilitas/${id}`);
  }

  const { profile } = await getProfile(supabase, user.id);
  if (!profile?.is_active) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  // 1. Fetch Facility Details
  const { data: facility } = await admin
    .from("facilities")
    .select(`
      *,
      facility_categories (
        name,
        icon
      )
    `)
    .eq("id", id)
    .single();

  if (!facility) {
    notFound();
  }

  // 2. Fetch Latest Status (from Daily Reports)
  const { data: latestLog } = await admin
    .from("facility_status_logs")
    .select(`
      status,
      notes,
      created_at,
      daily_reports (
        report_date,
        shift
      )
    `)
    .eq("facility_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Fetch Incident History
  const { data: incidents } = await admin
    .from("incidents")
    .select(`
      id,
      title,
      description,
      status,
      result_status,
      incident_time,
      handler_type
    `)
    .eq("facility_id", id)
    .order("incident_time", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Digital Asset Identity</p>
            <h1 className="text-lg font-bold text-slate-100 truncate">{facility.name}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 grid gap-6">
        {/* --- Facility Card --- */}
        <Card className="border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="h-1 bg-emerald-500 w-full" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <Box className="h-4 w-4" />
                  <span className="text-sm">{facility.facility_categories?.name}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-400">
                  <MapPin className="h-4 w-4 shrink-0 mt-1" />
                  <span className="text-sm">{facility.location_detail || "Lokasi tidak spesifik"}</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">
                {facility.facility_categories?.icon || "📦"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Latest Status --- */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Kondisi Terkini</h2>
          <Card className={`border-l-4 ${
            latestLog?.status === 'normal' ? 'border-l-emerald-500' : 
            latestLog?.status === 'rusak' ? 'border-l-red-500' : 'border-l-amber-500'
          } bg-slate-900/20`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full animate-pulse ${
                    latestLog?.status === 'normal' ? 'bg-emerald-500' : 
                    latestLog?.status === 'rusak' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <p className="font-bold text-slate-100 capitalize">
                    {latestLog ? statusLabel(latestLog.status) : "Belum Ada Data"}
                  </p>
                </div>
                {latestLog?.daily_reports && (
                  <p className="text-xs text-slate-500 mt-1">
                    Update: {formatDate(
                      Array.isArray(latestLog.daily_reports) 
                        ? latestLog.daily_reports[0]?.report_date 
                        : (latestLog.daily_reports as any)?.report_date
                    )} (Shift {
                      Array.isArray(latestLog.daily_reports) 
                        ? latestLog.daily_reports[0]?.shift 
                        : (latestLog.daily_reports as any)?.shift
                    })
                  </p>
                )}
              </div>
              {latestLog?.status === 'normal' ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-500/20" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-amber-500/20" />
              )}
            </CardContent>
          </Card>
        </section>

        {/* --- Action --- */}
        <Button asChild className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-base font-bold shadow-lg shadow-amber-900/20">
          <Link href={`/insiden/buat?facility_id=${facility.id}`}>
            <Camera className="mr-2 h-5 w-5" /> Laporkan Kerusakan / Non-Rutin
          </Link>
        </Button>

        {/* --- History --- */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1 flex items-center gap-2">
            <History className="h-3 w-3" /> Riwayat Kejadian (Non-Rutin)
          </h2>
          {incidents && incidents.length > 0 ? (
            <div className="grid gap-3">
              {incidents.map((inc) => (
                <Link key={inc.id} href={`/insiden/${inc.id}`}>
                  <Card className="border-slate-800 bg-slate-900/40 hover:bg-slate-900 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-slate-100 text-sm">{inc.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                          inc.result_status === 'success' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                        }`}>
                          {inc.result_status === 'success' ? 'Selesai' : 'Proses'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">{inc.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3 w-3" /> {formatDateTime(inc.incident_time)}
                        </span>
                        <span>•</span>
                        <span className="uppercase">{inc.handler_type}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 rounded-xl border border-dashed border-slate-800">
              <p className="text-sm text-slate-600">Belum ada riwayat insiden untuk aset ini.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function statusLabel(status: string) {
  if (status === "normal") return "Kondisi Normal";
  if (status === "rusak") return "Rusak / Tidak Operasional";
  if (status === "operasi_menurun") return "Operasi Menurun";
  return status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
