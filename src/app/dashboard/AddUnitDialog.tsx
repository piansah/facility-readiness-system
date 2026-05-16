"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addUnit } from "./actions";
import { useRouter } from "next/navigation";

export function AddUnitDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await addUnit(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button 
        size="sm" 
        className="bg-emerald-600 hover:bg-emerald-700"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" /> Tambah
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-bold">Tambah Unit Baru</DialogTitle>
              <p className="text-sm text-slate-400">
                Masukkan detail unit kerja baru untuk ditambahkan ke sistem.
              </p>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="code" className="text-slate-300">Kode Unit</Label>
              <Input
                id="code"
                name="code"
                placeholder="Contoh: AVSEC, ELBAN"
                className="bg-slate-950 border-slate-800 focus:border-emerald-500"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-slate-300">Nama Lengkap Unit</Label>
              <Input
                id="name"
                name="name"
                placeholder="Contoh: Aviation Security"
                className="bg-slate-950 border-slate-800 focus:border-emerald-500"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-slate-100"
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Unit"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
