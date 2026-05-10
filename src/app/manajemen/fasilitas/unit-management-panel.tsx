"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUnit, updateUnit } from "./actions";

type Unit = {
  id: string;
  code: string;
  name: string;
  is_active?: boolean;
};

export function UnitManagementPanel({ units }: { units: Unit[] }) {
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  return (
    <div className="grid gap-5">
      <form action={createUnit} className="grid gap-3 rounded-md border border-slate-800 bg-slate-950 p-3">
        <div className="flex items-center gap-2 text-slate-100">
          <Plus className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold">Tambah Unit</h3>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="unit_code">Kode unit</Label>
          <Input id="unit_code" name="unit_code" placeholder="ELIT" required maxLength={12} />
          <p className="text-[11px] text-slate-500">Kode wajib unik dan tidak bisa diubah setelah dibuat.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="unit_name">Nama unit</Label>
          <Input id="unit_name" name="unit_name" placeholder="Electrical Lighting" required />
        </div>
        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
          Simpan Unit
        </Button>
      </form>

      <div className="grid gap-2">
        <div className="flex items-center gap-2 text-slate-100">
          <Building2 className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold">Edit Unit</h3>
        </div>
        {units.map((unit) => (
          <div key={unit.id} className="rounded-md border border-slate-800 bg-slate-950 p-3">
            {editingUnitId === unit.id ? (
              <form action={updateUnit} className="grid gap-3">
                <input type="hidden" name="unit_id" value={unit.id} />
                <input type="hidden" name="unit_is_active" value={String(unit.is_active ?? true)} />
                <div className="grid gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kode unit</p>
                  <p className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300">
                    {unit.code}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`unit_name_${unit.id}`}>Nama unit</Label>
                  <Input id={`unit_name_${unit.id}`} name="unit_name" defaultValue={unit.name} required />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditingUnitId(null)} className="flex-1">
                    Batal
                  </Button>
                  <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    Simpan
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-100">{unit.code}</p>
                  <p className="truncate text-xs text-slate-500">{unit.name}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingUnitId(unit.id)}>
                  Edit
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
