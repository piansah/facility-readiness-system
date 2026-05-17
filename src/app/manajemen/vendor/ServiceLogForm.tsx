"use client";

import { useState, useEffect } from "react";
import { Wrench, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createServiceLog, getUnitIncidents } from "./actions";

export function ServiceLogFormModal({
  vendorId,
  vendorName,
  onSuccess
}: {
  vendorId: string;
  vendorName: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      const fetchIncidents = async () => {
        const data = await getUnitIncidents();
        setIncidents(data);
      };
      fetchIncidents();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const incident_id = formData.get("incident_id") as string;
      const called_at = formData.get("called_at") as string;
      const responded_at = formData.get("responded_at") as string;
      const completed_at = formData.get("completed_at") as string;
      const costRaw = formData.get("cost") as string;
      const cost = costRaw ? parseFloat(costRaw.replace(/[^0-9]/g, '')) : 0;
      const service_details = formData.get("service_details") as string;

      if (!incident_id) throw new Error("Pilih insiden yang ditangani");
      if (!called_at) throw new Error("Tanggal pemanggilan wajib diisi");
      if (!service_details) throw new Error("Detail perbaikan wajib diisi");

      const res = await createServiceLog({
        vendor_id: vendorId,
        incident_id,
        called_at: new Date(called_at).toISOString(),
        responded_at: responded_at ? new Date(responded_at).toISOString() : undefined,
        completed_at: completed_at ? new Date(completed_at).toISOString() : undefined,
        cost,
        service_details
      });

      if (res.error) throw new Error(res.error);

      toast.success("Log servis eksternal berhasil dicatat!");
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-slate-800 bg-slate-900/50 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30">
          <Wrench className="mr-1.5 h-3.5 w-3.5" /> Catat Log Servis
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[400px] bg-slate-950 border-slate-800 shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-emerald-500" />
            Log Servis Eksternal: {vendorName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="incident_id" className="text-xs text-slate-300 font-bold">Pilih Laporan Gangguan / Insiden <span className="text-red-500">*</span></Label>
            <select
              id="incident_id"
              name="incident_id"
              required
              className="w-full h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
            >
              <option value="">-- Pilih Insiden Terbuka --</option>
              {incidents.map((inc) => (
                <option key={inc.id} value={inc.id}>{inc.title} ({new Date(inc.incident_time).toLocaleDateString("id-ID")})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="called_at" className="text-xs text-slate-300 font-bold">Waktu Vendor Dipanggil <span className="text-red-500">*</span></Label>
            <Input
              id="called_at"
              name="called_at"
              type="datetime-local"
              required
              className="bg-slate-900 border-slate-800 text-sm h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="responded_at" className="text-xs text-slate-300 font-bold">Waktu Vendor Merespon</Label>
              <Input
                id="responded_at"
                name="responded_at"
                type="datetime-local"
                className="bg-slate-900 border-slate-800 text-sm h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="completed_at" className="text-xs text-slate-300 font-bold">Waktu Selesai Servis</Label>
              <Input
                id="completed_at"
                name="completed_at"
                type="datetime-local"
                className="bg-slate-900 border-slate-800 text-sm h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cost" className="text-xs text-slate-300 font-bold">Biaya Perbaikan (Rupiah)</Label>
            <Input
              id="cost"
              name="cost"
              type="number"
              placeholder="Cth: 1500000"
              className="bg-slate-900 border-slate-800 text-sm h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="service_details" className="text-xs text-slate-300 font-bold">Detail Pekerjaan & Perbaikan <span className="text-red-500">*</span></Label>
            <textarea
              id="service_details"
              name="service_details"
              required
              placeholder="Cth: Melakukan penggantian kompresor Chiller unit 2 yang mengalami error grounding kelistrikan..."
              className="flex min-h-[100px] w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20 mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Simpan Log Servis</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
