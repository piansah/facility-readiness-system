"use client";

import { useMemo, useState } from "react";
import { FolderPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFacility, createFacilityCategory, deleteFacilityCategory } from "./actions";

const iconOptions = [
  { value: "⚡", label: "Listrik" },
  { value: "💡", label: "Lampu" },
  { value: "❄️", label: "AC" },
  { value: "💧", label: "Air" },
  { value: "🔥", label: "Proteksi kebakaran" },
  { value: "🧯", label: "APAR" },
  { value: "📷", label: "CCTV" },
  { value: "🌐", label: "Jaringan" },
  { value: "🖥️", label: "Komputer" },
  { value: "🚪", label: "Akses" },
  { value: "🧹", label: "Kebersihan" },
  { value: "🛗", label: "Lift" },
  { value: "🛠️", label: "Peralatan" },
  { value: "🏢", label: "Gedung" },
  { value: "📌", label: "Lainnya" },
];

type Unit = {
  id: string;
  code: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  icon: string | null;
  unit_id: string;
};

type FacilityCreatePanelProps = {
  units: Unit[];
  categories: Category[];
  defaultUnitId: string;
  canChooseUnit: boolean;
};

export function FacilityCreatePanel({
  units,
  categories,
  defaultUnitId,
  canChooseUnit,
}: FacilityCreatePanelProps) {
  const [facilityUnitId, setFacilityUnitId] = useState(defaultUnitId);
  const [categoryUnitId, setCategoryUnitId] = useState(defaultUnitId);
  const [categoryIcon, setCategoryIcon] = useState(iconOptions[0].value);
  const facilityCategories = useMemo(
    () => categories.filter((category) => category.unit_id === facilityUnitId),
    [categories, facilityUnitId],
  );

  return (
    <div className="grid gap-6">
      <form action={createFacility} className="grid gap-4">
        {canChooseUnit ? (
          <div className="grid gap-2">
            <Label htmlFor="unit_id">Unit</Label>
            <select
              id="unit_id"
              name="unit_id"
              value={facilityUnitId}
              onChange={(event) => setFacilityUnitId(event.target.value)}
              required
              className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
            >
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.code} - {unit.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="unit_id" value={facilityUnitId} />
        )}
        <div className="grid gap-2">
          <Label htmlFor="category_id">Kategori</Label>
          <select
            id="category_id"
            name="category_id"
            required
            className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
          >
            {facilityCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon ? `${category.icon} ` : ""}
                {category.name}
              </option>
            ))}
          </select>
          {facilityCategories.length === 0 ? (
            <p className="text-xs text-amber-300">Tambahkan kategori untuk unit ini terlebih dahulu.</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name">Nama fasilitas</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location_detail">Lokasi/detail</Label>
          <Input id="location_detail" name="location_detail" />
        </div>
        <Button type="submit" disabled={facilityCategories.length === 0}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Fasilitas
        </Button>
      </form>

      <div className="border-t border-slate-800 pt-5">
        <form action={createFacilityCategory} className="grid gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Tambah Kategori</h3>
            <p className="mt-1 text-sm text-slate-400">Kategori baru langsung tersedia untuk unit yang dipilih.</p>
          </div>
          {canChooseUnit ? (
            <div className="grid gap-2">
              <Label htmlFor="category_unit_id">Unit kategori</Label>
              <select
                id="category_unit_id"
                name="category_unit_id"
                value={categoryUnitId}
                onChange={(event) => setCategoryUnitId(event.target.value)}
                required
                className="h-11 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-emerald-500"
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} - {unit.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="category_unit_id" value={categoryUnitId} />
          )}
          <div className="grid gap-2">
            <Label htmlFor="category_name">Nama kategori</Label>
            <Input id="category_name" name="category_name" required />
          </div>
          <div className="grid gap-2">
            <Label>Kode ikon</Label>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
              {iconOptions.map((icon) => (
                <button
                  key={icon.value}
                  type="button"
                  onClick={() => setCategoryIcon(icon.value)}
                  title={icon.label}
                  aria-label={icon.label}
                  className={`flex h-11 items-center justify-center rounded-md border text-sm font-bold transition-colors ${
                    categoryIcon === icon.value
                      ? "border-emerald-500 bg-emerald-500/15 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
                  }`}
                >
                  {icon.value}
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category_icon">Kode manual</Label>
              <Input
                id="category_icon"
                name="category_icon"
                value={categoryIcon}
                onChange={(event) => setCategoryIcon(event.target.value)}
                maxLength={8}
                placeholder="Misal: 📡"
              />
            </div>
          </div>
          <Button type="submit" variant="outline">
            <FolderPlus className="h-4 w-4" aria-hidden="true" />
            Tambah Kategori
          </Button>
        </form>

        <div className="mt-4 grid gap-2">
          <p className="text-sm font-medium text-slate-200">Kategori unit ini</p>
          {categories
            .filter((category) => category.unit_id === categoryUnitId)
            .map((category) => (
              <form
                key={category.id}
                action={deleteFacilityCategory}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900 px-3 py-2"
              >
                <input type="hidden" name="category_id" value={category.id} />
                <span className="min-w-0 truncate text-sm text-slate-200">
                  {category.icon ? `${category.icon} ` : ""}
                  {category.name}
                </span>
                <ConfirmSubmitButton
                  type="submit"
                  variant="outline"
                  size="sm"
                  message={`Hapus kategori ${category.name}?`}
                >
                  Hapus
                </ConfirmSubmitButton>
              </form>
            ))}
        </div>
      </div>
    </div>
  );
}
