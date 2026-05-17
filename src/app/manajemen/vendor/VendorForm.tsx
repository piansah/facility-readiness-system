"use client";

import { useState } from "react";
import { Plus, Pencil, Save, X, Loader2, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { createVendor, updateVendor, createContract } from "./actions";

// Modal for Vendor Creation and Update
export function VendorFormModal({
  vendor,
  units,
  currentUserRole,
  onSuccess
}: {
  vendor?: any;
  units: { id: string; code: string; name: string }[];
  currentUserRole: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isEdit = !!vendor;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const unit_id = formData.get("unit_id") as string;
      const pic_name = formData.get("pic_name") as string;
      const pic_phone = formData.get("pic_phone") as string;
      const emergency_phone = formData.get("emergency_phone") as string;
      const email = formData.get("email") as string;

      if (!name) throw new Error("Nama vendor wajib diisi");

      let res;
      if (isEdit) {
        res = await updateVendor(vendor.id, { name, pic_name, pic_phone, emergency_phone, email });
      } else {
        res = await createVendor({ unit_id, name, pic_name, pic_phone, emergency_phone, email });
      }

      if (res.error) throw new Error(res.error);

      toast.success(isEdit ? "Data vendor berhasil diperbarui!" : "Vendor baru berhasil ditambahkan!");
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
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" /> Tambah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[400px] bg-slate-900 border-slate-800 shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            {isEdit ? <Pencil className="h-5 w-5 text-emerald-500" /> : <Plus className="h-5 w-5 text-emerald-500" />}
            {isEdit ? "Edit Data Vendor" : "Tambah Vendor Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentUserRole === "super_admin" && !isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="unit_id" className="text-xs text-slate-300 font-bold">Pilih Unit Bandara <span className="text-red-500">*</span></Label>
              <select
                id="unit_id"
                name="unit_id"
                required
                className="w-full h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
              >
                <option value="">-- Pilih Unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.code} - {u.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-slate-300 font-bold">Nama Perusahaan/Vendor <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={vendor?.name || ""}
              placeholder="Cth: PT. Dirgantara Jaya Teknik"
              className="bg-slate-950 border-slate-800 text-sm h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pic_name" className="text-xs text-slate-300 font-bold">Nama Person In Charge (PIC)</Label>
            <Input
              id="pic_name"
              name="pic_name"
              defaultValue={vendor?.pic_name || ""}
              placeholder="Cth: Budi Santoso"
              className="bg-slate-950 border-slate-800 text-sm h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pic_phone" className="text-xs text-slate-300 font-bold">No. HP PIC</Label>
              <Input
                id="pic_phone"
                name="pic_phone"
                defaultValue={vendor?.pic_phone || ""}
                placeholder="Cth: 0812xxxx"
                className="bg-slate-950 border-slate-800 text-sm h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergency_phone" className="text-xs text-slate-300 font-bold">Kontak Darurat Vendor</Label>
              <Input
                id="emergency_phone"
                name="emergency_phone"
                defaultValue={vendor?.emergency_phone || ""}
                placeholder="Cth: (021) xxxx"
                className="bg-slate-950 border-slate-800 text-sm h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-slate-300 font-bold">Email Vendor</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={vendor?.email || ""}
              placeholder="Cth: support@vendor.com"
              className="bg-slate-950 border-slate-800 text-sm h-11"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20 mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Simpan Vendor</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Modal for Contract Creation (linked to a Vendor)
export function ContractFormModal({
  vendorId,
  onSuccess
}: {
  vendorId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const title = formData.get("title") as string;
      const contract_number = formData.get("contract_number") as string;
      const start_date = formData.get("start_date") as string;
      const end_date = formData.get("end_date") as string;
      const warranty_period_months = formData.get("warranty_period_months") ? parseInt(formData.get("warranty_period_months") as string) : undefined;
      const sla_response_hours = formData.get("sla_response_hours") ? parseInt(formData.get("sla_response_hours") as string) : undefined;

      if (!title) throw new Error("Judul kontrak wajib diisi");

      let document_path = undefined;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${vendorId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('contracts')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        document_path = filePath;
      }

      const res = await createContract({
        vendor_id: vendorId,
        title,
        contract_number,
        start_date,
        end_date,
        warranty_period_months,
        sla_response_hours,
        document_path
      });

      if (res.error) throw new Error(res.error);

      toast.success("Kontrak baru berhasil ditambahkan!");
      setOpen(false);
      setFile(null);
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
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Tambah Kontrak
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[400px] bg-slate-950 border-slate-800 shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-500" />
            Tambah Kontrak Kerja & SLA
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs text-slate-300 font-bold">Judul Pekerjaan/Kontrak <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="Cth: Kontrak Pemeliharaan WTMD 2026"
              className="bg-slate-900 border-slate-800 text-sm h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contract_number" className="text-xs text-slate-300 font-bold">Nomor Kontrak</Label>
            <Input
              id="contract_number"
              name="contract_number"
              placeholder="Cth: KONT/ELBAN/BIJB/009"
              className="bg-slate-900 border-slate-800 text-sm h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date" className="text-xs text-slate-300 font-bold">Tanggal Mulai</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                className="bg-slate-900 border-slate-800 text-sm h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date" className="text-xs text-slate-300 font-bold">Tanggal Selesai</Label>
              <Input
                id="end_date"
                name="end_date"
                type="date"
                className="bg-slate-900 border-slate-800 text-sm h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="warranty_period_months" className="text-xs text-slate-300 font-bold">Masa Garansi (Bulan)</Label>
              <Input
                id="warranty_period_months"
                name="warranty_period_months"
                type="number"
                placeholder="Cth: 12"
                className="bg-slate-900 border-slate-800 text-sm h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sla_response_hours" className="text-xs text-slate-300 font-bold">SLA Respon (Jam)</Label>
              <Input
                id="sla_response_hours"
                name="sla_response_hours"
                type="number"
                placeholder="Cth: 4"
                className="bg-slate-900 border-slate-800 text-sm h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-bold">Dokumen Kontrak (PDF)</Label>
            <div className="border-2 border-dashed border-slate-800 rounded-xl p-5 text-center hover:bg-slate-800/50 transition-colors relative bg-slate-900/50">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="pointer-events-none flex flex-col items-center gap-2 text-slate-400">
                <Upload className="h-6 w-6 text-slate-500" />
                {file ? (
                  <span className="text-emerald-500 font-bold text-xs truncate max-w-full px-2">{file.name}</span>
                ) : (
                  <div className="text-xs">
                    <span className="text-emerald-500 font-bold">Pilih file kontrak</span> atau tarik
                    <p className="text-[9px] mt-1 text-slate-500 uppercase font-bold">PDF (Max 10MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20 mt-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Simpan Kontrak</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
