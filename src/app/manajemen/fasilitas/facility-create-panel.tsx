"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { FolderPlus, Plus, MoreVertical, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/form-select";
import { createFacility, createFacilityCategory, deleteFacilityCategory, updateFacilityCategory } from "./actions";

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const facilityCategories = useMemo(
    () => categories.filter((category) => category.unit_id === facilityUnitId),
    [categories, facilityUnitId],
  );

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setConfirmDeleteId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEditOpen = (cat: Category) => {
    setEditCategory(cat);
    setEditName(cat.name);
    setEditIcon(cat.icon || "📌");
    setOpenMenuId(null);
  };

  return (
    <div className="grid gap-6">
      <form action={createFacility} className="grid gap-4">
        {canChooseUnit ? (
          <div className="grid gap-2">
            <Label htmlFor="unit_id">Unit</Label>
            <FormSelect
              name="unit_id"
              value={facilityUnitId}
              onValueChange={setFacilityUnitId}
              options={units.map(u => ({ value: u.id, label: `${u.code} - ${u.name}` }))}
              required
            />
          </div>
        ) : (
          <input type="hidden" name="unit_id" value={facilityUnitId} />
        )}
        <div className="grid gap-2">
          <Label htmlFor="category_id">Kategori</Label>
          <FormSelect
            name="category_id"
            placeholder="Pilih kategori..."
            options={facilityCategories.map(c => ({
              value: c.id,
              label: c.icon ? `${c.icon} ${c.name}` : c.name
            }))}
            required
          />
          {facilityCategories.length === 0 ? (
            <p className="text-xs text-amber-300">Tambahkan kategori untuk unit ini terlebih dahulu.</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name">Nama aset</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location_detail">Tempat/lokasi</Label>
          <Input id="location_detail" name="location_detail" />
        </div>
        <Button type="submit" disabled={facilityCategories.length === 0}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Aset
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
              <FormSelect
                name="category_unit_id"
                value={categoryUnitId}
                onValueChange={setCategoryUnitId}
                options={units.map(u => ({ value: u.id, label: `${u.code} - ${u.name}` }))}
                required
              />
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

        {/* Category List with ⋯ Menu */}
        <div className="mt-4 grid gap-2">
          <p className="text-sm font-medium text-slate-200">Kategori unit ini</p>
          <div className="grid gap-2 max-h-[250px] overflow-y-auto pr-1">
          {categories
            .filter((category) => category.unit_id === categoryUnitId)
            .map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 relative"
              >
                <span className="min-w-0 truncate text-sm text-slate-200">
                  {category.icon ? `${category.icon} ` : ""}
                  {category.name}
                </span>

                {/* Three-dot menu — hidden on mobile */}
                <div className="relative" ref={openMenuId === category.id ? menuRef : undefined}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuId(openMenuId === category.id ? null : category.id);
                      setConfirmDeleteId(null);
                    }}
                    className="h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all hidden sm:flex"
                    title="Aksi"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Dropdown */}
                  {openMenuId === category.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => { setOpenMenuId(null); setConfirmDeleteId(null); }} />
                      <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-slate-700 bg-slate-900/95 backdrop-blur-sm shadow-2xl p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleEditOpen(category)}
                          className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit Kategori
                        </button>

                        {/* Delete with inline confirm */}
                        {confirmDeleteId === category.id ? (
                          <form action={deleteFacilityCategory}>
                            <input type="hidden" name="category_id" value={category.id} />
                            <button
                              type="submit"
                              className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Ya, Hapus
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(category.id)}
                            className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus Kategori
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={!!editCategory} onOpenChange={(open) => { if (!open) setEditCategory(null); }}>
        <DialogContent className="max-w-sm border-slate-800 bg-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Edit Kategori</DialogTitle>
          </DialogHeader>
          <form action={updateFacilityCategory} className="grid gap-4" onSubmit={() => setEditCategory(null)}>
            <input type="hidden" name="category_id" value={editCategory?.id ?? ""} />
            <div className="grid gap-2">
              <Label htmlFor="edit_category_name">Nama</Label>
              <Input
                id="edit_category_name"
                name="category_name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Ikon</Label>
              <div className="grid grid-cols-5 gap-2">
                {iconOptions.map((icon) => (
                  <button
                    key={icon.value}
                    type="button"
                    onClick={() => setEditIcon(icon.value)}
                    title={icon.label}
                    className={`flex h-10 items-center justify-center rounded-md border text-sm transition-colors ${
                      editIcon === icon.value
                        ? "border-emerald-500 bg-emerald-500/15"
                        : "border-slate-700 bg-slate-900 hover:border-slate-500"
                    }`}
                  >
                    {icon.value}
                  </button>
                ))}
              </div>
              <Input
                name="category_icon"
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                maxLength={8}
                placeholder="Misal: 📡"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Check className="h-4 w-4" />
                Simpan
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditCategory(null)} className="text-slate-400">
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
