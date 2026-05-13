"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { updateIncident, deleteIncident } from "../../buat/actions";
import { IncidentTimeInput } from "../../buat/incident-time-input";
import { ImageCompressorInput } from "@/components/image-compressor-input";
import { SubmitButton } from "@/components/submit-button";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

type IncidentData = {
  id: string;
  daily_report_id: string;
  facility_id: string | null;
  title: string;
  description: string;
  action_taken: string | null;
  incident_time: string;
  status: string;
  result_status: string | null;
  handler_type: string | null;
};

type FacilityOption = {
  id: string;
  name: string;
  location_detail: string | null;
};

export default function EditIncidentPage({ params, searchParams }: PageProps) {
  const { id } = use(params);
  const { error: searchError } = use(searchParams);
  const [incident, setIncident] = useState<IncidentData | null>(null);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = `/login?next=/insiden/${id}/edit`;
        return;
      }

      const [{ data: incidentData }, { data: facilityData }] = await Promise.all([
        supabase.from("incidents").select("*").eq("id", id).single(),
        supabase.from("facilities").select("id,name,location_detail").eq("is_active", true).order("name", { ascending: true })
      ]);

      if (incidentData) setIncident(incidentData as IncidentData);
      if (facilityData) setFacilities(facilityData as FacilityOption[]);
      setLoading(false);
    }
    loadData();
  }, [id, supabase]);

  if (loading) return <div className="min-h-dvh bg-slate-950 flex items-center justify-center text-slate-400">Memuat data edit...</div>;
  if (!incident) return <div className="min-h-dvh bg-slate-950 flex items-center justify-center text-slate-400">Data tidak ditemukan.</div>;

  return (
    <main className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:py-4">
          <Button asChild variant="ghost" size="sm" aria-label="Kembali ke detail" className="hidden sm:inline-flex">
            <Link href={`/insiden/${id}`}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0">
              <span style={{ fontFamily: "'Poppins', sans-serif" }} className="text-sm font-extrabold text-slate-950 tracking-tighter">F</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 leading-none">Edit Laporan</p>
              <h1 style={{ fontFamily: "'Poppins', sans-serif" }} className="text-lg font-bold text-slate-100 tracking-tight mt-0.5 leading-none">Edit Non-Rutin</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6 grid gap-4 sm:gap-6">
        {searchError && (
          <Card className="border-red-900/70 bg-red-950/40">
            <CardContent className="p-4 text-sm text-red-200">
              Gagal memperbarui: {searchError}
            </CardContent>
          </Card>
        )}

        <form action={updateIncident} className="grid gap-6">
          <input type="hidden" name="incident_id" value={id} />

          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Informasi Dasar</CardTitle>
              <CardDescription>Sesuaikan detail laporan yang ingin diubah.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="grid min-w-0 gap-2">
                  <Label>Status Hasil</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/50 p-3 text-[10px] font-medium text-slate-300 transition-all hover:bg-slate-900 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-400 cursor-pointer">
                      <input type="radio" name="result_status" value="success" className="sr-only" defaultChecked={incident.result_status === 'success'} />
                      Berhasil
                    </label>
                    <label className="flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/50 p-3 text-[10px] font-medium text-slate-300 transition-all hover:bg-slate-900 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/10 has-[:checked]:text-amber-400 cursor-pointer">
                      <input type="radio" name="result_status" value="pending" className="sr-only" defaultChecked={incident.result_status === 'pending' || !incident.result_status} />
                      Lanjut
                    </label>
                    <label className="flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/50 p-3 text-[10px] font-medium text-slate-300 transition-all hover:bg-slate-900 has-[:checked]:border-red-500 has-[:checked]:bg-red-500/10 has-[:checked]:text-red-400 cursor-pointer">
                      <input type="radio" name="result_status" value="failed" className="sr-only" defaultChecked={incident.result_status === 'failed'} />
                      Gagal
                    </label>
                  </div>
                </div>

                <div className="grid min-w-0 gap-2">
                  <Label>Penanggung Jawab</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/50 p-3 text-[10px] font-medium text-slate-300 transition-all hover:bg-slate-900 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-400 cursor-pointer">
                      <input type="radio" name="handler_type" value="internal" className="sr-only" defaultChecked={incident.handler_type === 'internal' || !incident.handler_type} />
                      Internal
                    </label>
                    <label className="flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/50 p-3 text-[10px] font-medium text-slate-300 transition-all hover:bg-slate-900 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/10 has-[:checked]:text-blue-400 cursor-pointer">
                      <input type="radio" name="handler_type" value="vendor" className="sr-only" defaultChecked={incident.handler_type === 'vendor'} />
                      Vendor
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="facility_id">Fasilitas & Lokasi</Label>
                <select
                  id="facility_id"
                  name="facility_id"
                  defaultValue={incident.facility_id || ""}
                  className="h-11 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Tidak Spesifik</option>
                  {facilities?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.location_detail ? `(${f.location_detail})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="incident_time">Waktu Kejadian</Label>
                <IncidentTimeInput defaultValue={incident.incident_time} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title">Judul Laporan</Label>
                <Input id="title" name="title" defaultValue={incident.title} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Deskripsi Lengkap</Label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={incident.description}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="action_taken">Tindakan Diambil</Label>
                <textarea
                  id="action_taken"
                  name="action_taken"
                  rows={3}
                  defaultValue={incident.action_taken || ""}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">Tambah Foto Baru</CardTitle>
              <CardDescription>Foto lama akan tetap ada. Pilih foto baru jika ingin menambahkan dokumentasi.</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageCompressorInput name="photos" />
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <SubmitButton pendingText="Menyimpan..." className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-12">
              <Save className="h-4 w-4 mr-2" />
              Simpan Perubahan
            </SubmitButton>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800">
          <form action={deleteIncident} onSubmit={(e) => {
            if (!confirm("Yakin ingin menghapus laporan ini secara permanen?")) {
              e.preventDefault();
            }
          }}>
            <input type="hidden" name="incident_id" value={id} />
            <Button type="submit" variant="ghost" className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 h-12 border border-red-500/20">
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Laporan Secara Permanen
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
