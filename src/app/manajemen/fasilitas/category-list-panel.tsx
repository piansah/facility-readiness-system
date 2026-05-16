"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Pencil, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteFacilityCategory, updateFacilityCategory } from "./actions";

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

type Category = {
  id: string;
  name: string;
  icon: string | null;
  unit_id: string;
};

export function CategoryListPanel({
  categories,
  selectedUnitId,
}: {
  categories: Category[];
  selectedUnitId: string;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const unitCategories = categories.filter((c) => c.unit_id === selectedUnitId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Daftar Kategori</h3>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{unitCategories.length}</span>
      </div>

      <div className="grid gap-2">
        {unitCategories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/50 bg-slate-900/50 px-3 py-2.5 transition-colors hover:bg-slate-900"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-base">
                {category.icon || "📌"}
              </span>
              <span className="truncate text-sm font-medium text-slate-200">
                {category.name}
              </span>
            </div>

            <div className="relative" ref={openMenuId === category.id ? menuRef : undefined}>
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(openMenuId === category.id ? null : category.id);
                  setConfirmDeleteId(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {openMenuId === category.id && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setOpenMenuId(null); setConfirmDeleteId(null); }} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => handleEditOpen(category)}
                      className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit Kategori
                    </button>

                    {confirmDeleteId === category.id ? (
                      <form action={deleteFacilityCategory}>
                        <input type="hidden" name="category_id" value={category.id} />
                        <button
                          type="submit"
                          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Ya, Hapus
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(category.id)}
                        className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
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
        {unitCategories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-dashed border-slate-800 text-center">
            <p className="text-xs text-slate-500 italic">Belum ada kategori untuk unit ini.</p>
          </div>
        )}
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
