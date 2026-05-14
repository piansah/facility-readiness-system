"use client";

import { useState } from "react";
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
  const [isActive, setIsActive] = useState(facility.is_active);

  return (
    <div className="flex items-center gap-1">
      <FacilityQRModal facility={facility} />
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="h-8 px-3 text-slate-400">
        Edit
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-950 p-5 text-left shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Edit Fasilitas</h2>
                <p className="text-sm text-slate-400">{facility.name}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                Tutup
              </Button>
            </div>
            <form action={updateFacility} className="grid gap-4">
              <input type="hidden" name="id" value={facility.id} />
              <input type="hidden" name="is_active" value={String(isActive)} />
              <div className="grid gap-2">
                <Label htmlFor={`facility_name_${facility.id}`}>Nama fasilitas</Label>
                <Input id={`facility_name_${facility.id}`} name="name" defaultValue={facility.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`facility_category_${facility.id}`}>Kategori</Label>
                <select
                  id={`facility_category_${facility.id}`}
                  name="category_id"
                  defaultValue={facility.category_id}
                  className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
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
                <Label htmlFor={`facility_location_${facility.id}`}>Lokasi/detail</Label>
                <Input
                  id={`facility_location_${facility.id}`}
                  name="location_detail"
                  defaultValue={facility.location_detail ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`facility_sort_${facility.id}`}>Urutan</Label>
                <Input id={`facility_sort_${facility.id}`} name="sort_order" type="number" defaultValue={facility.sort_order ?? 0} />
              </div>
              <label className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
                Fasilitas aktif
              </label>
              <div className="flex justify-between gap-3 border-t border-slate-800 pt-4">
                <ConfirmSubmitButton
                  type="submit"
                  formAction={deleteFacility}
                  variant="outline"
                  message={`Hapus fasilitas ${facility.name}?`}
                >
                  Hapus
                </ConfirmSubmitButton>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
