"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { ArrowLeft, Calendar, MapPin, Clock, User, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type IncidentDetail = {
  id: string;
  title: string;
  description: string;
  action_taken: string | null;
  incident_time: string;
  resolved_at: string | null;
  status: string;
  result_status: string | null;
  handler_type: string | null;
  created_at: string;
  type?: 'incident' | 'facility';
  daily_reports: {
    report_date: string;
    shift: string;
  };
  facilities: {
    name: string;
    location_detail: string | null;
    warranty_until?: string | null;
  } | null;
  reported_by_user: {
    full_name: string;
  };
  incident_photos?: {
    id: string;
    storage_path: string;
    caption: string | null;
  }[];
  follow_ups?: {
    id: string;
    action_taken: string;
    follow_up_time: string;
    status_update: string;
    handler_type: string;
    created_at: string;
    reported_by_user: { full_name: string } | null;
    daily_reports: { report_date: string; shift: string } | null;
    photos?: { id: string; storage_path: string; caption: string | null }[];
  }[];
};

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<string>("pending");
  const [handlerType, setHandlerType] = useState<string>("internal");
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      // 1. Try to find in incidents
      const { data: incidentData } = await supabase
        .from("incidents")
        .select(`
          *,
          daily_reports (report_date, shift),
          facilities (name, location_detail, warranty_until),
          reported_by_user:users!reported_by (full_name),
          incident_photos (id, storage_path, caption, follow_up_id),
          incident_follow_ups (
            id, action_taken, follow_up_time, status_update, handler_type, created_at,
            reported_by_user:users!reported_by (full_name),
            daily_reports (report_date, shift)
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (incidentData) {
        const raw = incidentData as any;
        
        // Group photos: ones without follow_up_id belong to the main incident
        const allPhotos = Array.isArray(raw.incident_photos) ? raw.incident_photos : [];
        const mainPhotos = allPhotos.filter((p: any) => !p.follow_up_id);
        
        // Process follow-ups
        let parsedFollowUps = [];
        if (Array.isArray(raw.incident_follow_ups)) {
          parsedFollowUps = raw.incident_follow_ups.map((fu: any) => ({
            ...fu,
            reported_by_user: Array.isArray(fu.reported_by_user) ? fu.reported_by_user[0] : fu.reported_by_user,
            daily_reports: Array.isArray(fu.daily_reports) ? fu.daily_reports[0] : fu.daily_reports,
            photos: allPhotos.filter((p: any) => p.follow_up_id === fu.id)
          })).sort((a: any, b: any) => new Date(a.follow_up_time).getTime() - new Date(b.follow_up_time).getTime());
        }

        const normalized: IncidentDetail = { 
          ...raw, 
          type: 'incident' as const,
          daily_reports: Array.isArray(raw.daily_reports) ? raw.daily_reports[0] : raw.daily_reports,
          facilities: Array.isArray(raw.facilities) ? raw.facilities[0] : raw.facilities,
          reported_by_user: Array.isArray(raw.reported_by_user) ? raw.reported_by_user[0] : raw.reported_by_user,
          incident_photos: mainPhotos,
          follow_ups: parsedFollowUps
        } as IncidentDetail;
        
        setIncident(normalized);
        setResultStatus(raw.result_status ?? "pending");
        setHandlerType(raw.handler_type ?? "internal");
        setLoading(false);
        return;
      }

      // 2. Fallback: Try to find in facility_status_logs (for "RUSAK" items)
      const { data: logData } = await supabase
        .from("facility_status_logs")
        .select(`
          id,
          status,
          notes,
          checked_at,
          daily_reports (report_date, shift),
          facilities (name, location_detail, warranty_until),
          reported_by_user:users!checked_by (full_name)
        `)
        .eq("id", id)
        .maybeSingle();

      if (logData) {
        const rawLog = logData as any;
        const dr = Array.isArray(rawLog.daily_reports) ? rawLog.daily_reports[0] : rawLog.daily_reports;
        const fac = Array.isArray(rawLog.facilities) ? rawLog.facilities[0] : rawLog.facilities;
        const reporter = Array.isArray(rawLog.reported_by_user) ? rawLog.reported_by_user[0] : rawLog.reported_by_user;

        setIncident({
          id: rawLog.id,
          title: `Status Fasilitas: ${fac?.name}`,
          description: rawLog.notes || "Tidak ada catatan tambahan.",
          action_taken: null,
          incident_time: rawLog.checked_at,
          status: rawLog.status,
          result_status: null,
          handler_type: null,
          created_at: rawLog.checked_at,
          type: 'facility',
          daily_reports: dr,
          facilities: fac,
          reported_by_user: reporter,
          incident_photos: []
        } as unknown as IncidentDetail);
      }
      
      setLoading(false);
    }
    loadData();
  }, [id, supabase]);

  if (loading) return <div className="min-h-dvh bg-slate-950 flex items-center justify-center text-slate-400">Memuat detail...</div>;
  if (!incident) return <div className="min-h-dvh bg-slate-950 flex items-center justify-center text-slate-400">Laporan tidak ditemukan.</div>;

  return (
    <main className="min-h-dvh bg-slate-950 pb-10">
      <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:py-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/insiden">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div className="flex-1 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 leading-none mb-1">
                {incident.type === 'facility' ? 'Detail Temuan Fasilitas' : 'Detail Laporan Non-Rutin'}
              </p>
              <div className="flex flex-col gap-2 mt-1">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-100 leading-tight line-clamp-1">{incident.title}</h1>
              </div>
            </div>
            {incident.status !== 'resolved' && incident.type === 'incident' && (
              <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                <Link href={`/insiden/${incident.id}/tindak-lanjut`}>
                  Tindak Lanjut
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6 grid gap-4 sm:gap-6">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-3 sm:p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-bold tracking-tight">Waktu Kejadian</p>
                <p className="text-sm text-slate-100 font-medium">{formatDateTime(incident.incident_time)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Shift {incident.daily_reports.shift} • {formatDateShort(incident.daily_reports.report_date)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-3 sm:p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-bold tracking-tight">Fasilitas & Lokasi</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-slate-100 font-medium">
                    {incident.facilities?.name ?? "Tidak Spesifik"}
                  </p>
                  {incident.facilities?.warranty_until && new Date(incident.facilities.warranty_until.split('T')[0]) >= new Date(new Date().toISOString().split('T')[0]) && (
                    <span className="rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-extrabold uppercase px-2 py-0.5 border border-emerald-500/20 animate-pulse">
                      🛡️ Under Warranty
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {incident.facilities?.location_detail ?? "Seluruh Area"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-3 sm:p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-bold tracking-tight">Dilaporkan Oleh</p>
                <p className="text-sm text-slate-100 font-medium">{incident.reported_by_user.full_name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Petugas Unit</p>
              </div>
            </CardContent>
          </Card>

          {incident.type === 'incident' && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-3 sm:p-4 flex items-start gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  incident.result_status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                  incident.result_status === 'failed' ? 'bg-red-500/10 text-red-400' :
                  'bg-amber-500/10 text-amber-400'
                }`}>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-tight">Status & Penanganan</p>
                  <p className={`text-sm font-medium ${
                    incident.result_status === 'success' ? 'text-emerald-400' :
                    incident.result_status === 'failed' ? 'text-red-400' :
                    'text-amber-400'
                  }`}>
                    {incident.result_status === 'success' ? 'Berhasil' : 
                     incident.result_status === 'failed' ? 'Gagal' : 'Proses'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Oleh: {incident.handler_type === 'vendor' ? 'Vendor' : 'Internal'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-4">
          <section className="grid gap-2">
            <div className="flex items-center gap-2 px-1">
              <FileText className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-200">Deskripsi Kejadian</h2>
            </div>
            <Card className="border-slate-800 bg-slate-900/30">
              <CardContent className="p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {incident.description}
              </CardContent>
            </Card>
          </section>

          {incident.action_taken && (
            <section className="grid gap-2">
              <div className="flex items-center gap-2 px-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-slate-200">Tindakan Diambil</h2>
              </div>
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4 text-sm text-emerald-100/80 leading-relaxed whitespace-pre-wrap">
                  {incident.action_taken}
                </CardContent>
              </Card>
            </section>
          )}

          {incident.incident_photos && incident.incident_photos.length > 0 && (
            <section className="grid gap-3">
              <div className="flex items-center gap-2 px-1">
                <Clock className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-200">Dokumentasi Lapangan</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {incident.incident_photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                    <img
                      src={getStorageUrl(photo.storage_path)}
                      alt={photo.caption || incident.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Timeline Tindak Lanjut */}
        {incident.follow_ups && incident.follow_ups.length > 0 && (
          <div className="mt-8 space-y-6">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2">Riwayat Tindak Lanjut</h3>
            <div className="relative pl-4 sm:pl-6 border-l-2 border-slate-800 space-y-8">
              {incident.follow_ups.map((fu, idx) => (
                <div key={fu.id} className="relative">
                  <div className={`absolute -left-[21px] sm:-left-[29px] top-1 h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-slate-950 ${
                    fu.status_update === 'success' ? 'bg-emerald-500' : 
                    fu.status_update === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <Card className="bg-slate-900/40 border-slate-800">
                    <CardHeader className="p-3 sm:p-4 pb-0 flex flex-row items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-300 mb-1">
                          Shift {fu.daily_reports?.shift} • {formatDateShort(fu.daily_reports?.report_date ?? "")}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatDateTime(fu.follow_up_time)} • Oleh {fu.reported_by_user?.full_name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded bg-slate-800 ${
                          fu.status_update === 'success' ? 'text-emerald-400' : 
                          fu.status_update === 'failed' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {fu.status_update === 'success' ? 'Berhasil' : fu.status_update === 'failed' ? 'Gagal' : 'Proses'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-3">
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap mb-4">
                        {fu.action_taken}
                      </p>
                      {fu.photos && fu.photos.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          {fu.photos.map(p => (
                            <img key={p.id} src={getStorageUrl(p.storage_path)} alt={p.caption || "Foto"} className="rounded-lg object-cover aspect-video border border-slate-800 w-full" />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value.replace(" ", "T")));
}

function formatDateShort(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getStorageUrl(path: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cleanPath = path.replace(/^\/+/, "");

  if (cleanPath.startsWith("incident-photos/")) {
    return `${supabaseUrl}/storage/v1/object/public/${cleanPath}`;
  }
  return `${supabaseUrl}/storage/v1/object/public/incident-photos/${cleanPath}`;
}