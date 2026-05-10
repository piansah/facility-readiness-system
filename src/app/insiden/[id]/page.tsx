"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { ArrowLeft, Calendar, MapPin, Clock, User, FileText, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type IncidentDetail = {
  id: string;
  title: string;
  description: string;
  action_taken: string | null;
  incident_time: string;
  status: string;
  created_at: string;
  daily_reports: {
    report_date: string;
    shift: string;
  };
  facilities: {
    name: string;
    location_detail: string | null;
  } | null;
  reported_by_user: {
    full_name: string;
  };
  incident_photos: {
    id: string;
    storage_path: string;
    caption: string | null;
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
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from("incidents")
        .select(`
          *,
          daily_reports (report_date, shift),
          facilities (name, location_detail),
          reported_by_user:users!reported_by (full_name),
          incident_photos (id, storage_path, caption)
        `)
        .eq("id", id)
        .single();

      if (data) setIncident(data as IncidentDetail);
      setLoading(false);
    }
    loadData();
  }, [id, supabase]);

  if (loading) return <div className="min-h-dvh bg-slate-950 flex items-center justify-center text-slate-400">Memuat detail...</div>;
  if (!incident) return <div className="min-h-dvh bg-slate-950 flex items-center justify-center text-slate-400">Laporan tidak ditemukan.</div>;

  const statusColor = incident.status === "resolved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20";

  return (
    <main className="min-h-dvh bg-slate-950 pb-10">
      <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:py-4">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/insiden">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div className="flex-1">
             <div className="flex items-center gap-2 mb-0.5">
               <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 leading-none">Detail Laporan Non-Rutin</p>
               <Badge variant="outline" className={`text-[9px] uppercase h-4 px-1.5 ${statusColor}`}>
                 {incident.status}
               </Badge>
             </div>
             <h1 className="text-lg sm:text-xl font-semibold text-slate-100 leading-tight line-clamp-1">{incident.title}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6 grid gap-4 sm:gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <p className="text-sm text-slate-100 font-medium">
                  {incident.facilities?.name ?? "Tidak Spesifik"}
                </p>
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

          {incident.incident_photos.length > 0 && (
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