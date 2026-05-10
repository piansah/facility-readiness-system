"use client";

import { useState } from "react";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cleanUpOldPhotos } from "./actions";

export function StorageCleanupForm() {
  const [isCleaning, setIsCleaning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCleanup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!confirm("Peringatan: Tindakan ini akan menghapus permanen foto-foto lama dari database dan storage. Anda yakin?")) {
      return;
    }

    const formData = new FormData(e.currentTarget);
    const months = parseInt(formData.get("months") as string, 10);
    
    setIsCleaning(true);
    setResult(null);
    
    try {
      const res = await cleanUpOldPhotos(months);
      setResult({ success: res.success, message: res.message });
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Terjadi kesalahan." });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <form onSubmit={handleCleanup} className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select 
          name="months" 
          className="h-10 w-full sm:w-auto rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
        >
          <option value="3">Hapus foto lebih tua dari 3 bulan</option>
          <option value="6">Hapus foto lebih tua dari 6 bulan</option>
          <option value="12">Hapus foto lebih tua dari 1 tahun</option>
        </select>
        
        <Button 
          type="submit" 
          variant="destructive" 
          className="w-full sm:w-auto"
          disabled={isCleaning}
        >
          {isCleaning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          {isCleaning ? "Membersihkan..." : "Bersihkan Sekarang"}
        </Button>
      </div>
      
      {result && (
        <div className={`flex items-start gap-2 rounded-md p-3 text-sm ${result.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/50' : 'bg-red-950/40 text-red-300 border border-red-900/50'}`}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{result.message}</p>
        </div>
      )}
    </form>
  );
}
