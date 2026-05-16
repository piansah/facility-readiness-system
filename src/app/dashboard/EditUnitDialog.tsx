"use client";

import { useState } from "react";
import { Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUnit } from "./actions";
import { useRouter } from "next/navigation";

type EditUnitDialogProps = {
  unit: {
    id: string;
    code: string;
    name: string;
  };
};

export function EditUnitDialog({ unit }: EditUnitDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await updateUnit(unit.id, formData);

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
        variant="ghost" 
        size="sm" 
        className="text-slate-500 hover:text-blue-400 hover:bg-blue-500/5 h-8 w-8 p-0"
        onClick={() => setOpen(true)}
      >
        <Edit2 className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-bold">Edit Unit</DialogTitle>
              <p className="text-sm text-slate-400">
                Perbarui informasi untuk unit kerja <span className="text-blue-400 font-bold">{unit.code}</span>.
              </p>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {error && (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                  {error}
                </div>
              )}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-code" className="text-slate-300">Kode Unit</Label>
                  <span className="text-[10px] text-slate-500 font-medium italic">Tidak dapat diubah</span>
                </div>
                <Input
                  id="edit-code"
                  name="code"
                  defaultValue={unit.code}
                  readOnly
                  className="bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-name" className="text-slate-300">Nama Lengkap Unit</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={unit.name}
                  className="bg-slate-950 border-slate-800 focus:border-blue-500"
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
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
