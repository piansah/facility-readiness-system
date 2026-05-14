"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, FileText, QrCode as QrIcon, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteFacility, updateFacility } from "./actions";
import { FacilityQRModal } from "./facility-qr-modal";

type Category = {
  id: string;
  name: string;
  icon: string | null;
};

type Facility = {
  id: string;
  name: string;
  location_detail: string | null;
  category_id: string;
  sort_order: number | null;
  is_active: boolean;
};

export function FacilityRowActions({ facility, categories }: { facility: Facility; categories: Category[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isActive, setIsActive] = useState(facility.is_active);

  return (
    <div className="flex items-center justify-end gap-1 relative">
      {/* Trigger Dropdown */}
      <div className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`h-8 w-8 p-0 ${isMenuOpen ? 'bg-slate-800 text-slate-100' : 'text-slate-400'}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {/* Custom Dropdown Menu */}
        {isMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="absolute right-0 top-9 z-40 w-48 rounded-lg border border-slate-800 bg-slate-950 p-1 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-150">
              <Link 
                href={`/fasilitas/${facility.id}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-slate-100 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                Lihat Detail History
              </Link>
              
              <div className="my-1 border-t border-slate-900" />
              
              <button
                onClick={() => {
                  setIsQrOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-slate-100 transition-colors text-left"
              >
                <QrIcon className="h-3.5 w-3.5 text-emerald-400" />
                Tampilkan QR Code
              </button>

              <button
                onClick={() => {
                  setIsOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900 hover:text-slate-100 transition-colors text-left"
              >
                <Pencil className="h-3.5 w-3.5 text-amber-400" />
                Edit Fasilitas
              </button>

              <div className="my-1 border-t border-slate-900" />

              <form action={deleteFacility} className="contents" onSubmit={() => setIsMenuOpen(false)}>
                <input type="hidden" name="id" value={facility.id} />
                <ConfirmSubmitButton
                  type="submit"
                  variant="ghost"
                  message={`Hapus fasilitas ${facility.name}?`}
                  className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors justify-start"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Fasilitas
                </ConfirmSubmitButton>
              </form>
            </div>
          </>
        )}
      </div>

      {/* QR Modal Controlled */}
      <FacilityQRModal 
        facility={facility} 
        open={isQrOpen} 
        onOpenChange={setIsQrOpen} 
      />

      {/* Edit Modal */}
      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-6 text-left shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Edit Fasilitas</h2>
                <p className="text-sm text-slate-400">Sesuaikan konfigurasi aset ini.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="rounded-full h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form action={updateFacility} className="grid gap-5">
              <input type="hidden" name="id" value={facility.id} />
              <input type="hidden" name="is_active" value={String(isActive)} />
              
              <div className="grid gap-2">
                <Label htmlFor={`facility_name_${facility.id}`} className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Fasilitas</Label>
                <Input id={`facility_name_${facility.id}`} name="name" defaultValue={facility.name} required className="bg-slate-900 border-slate-800" />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor={`facility_category_${facility.id}`} className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategori</Label>
                <select
                  id={`facility_category_${facility.id}`}
                  name="category_id"
                  defaultValue={facility.category_id}
                  className="h-11 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500 transition-all"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.icon ? `${category.icon} ` : ""}
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor={`facility_location_${facility.id}`} className="text-xs font-bold uppercase tracking-wider text-slate-500">Lokasi / Detail</Label>
                <Input
                  id={`facility_location_${facility.id}`}
                  name="location_detail"
                  defaultValue={facility.location_detail ?? ""}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-200 cursor-pointer hover:bg-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-5 w-5 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                />
                <div className="flex flex-col">
                  <span className="font-semibold">Fasilitas Aktif</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-tight">Muncul di laporan harian petugas</span>
                </div>
              </label>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-6 mt-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="text-slate-400">
                  Batal
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 px-8 shadow-lg shadow-emerald-900/20">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
