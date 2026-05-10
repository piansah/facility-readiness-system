"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, UserPlus, Shield, Check } from "lucide-react";
import { createUser, updateUser } from "./actions";

type Unit = {
  id: string;
  code: string;
  name: string;
};

type EditableUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  unit_id: string | null;
  super_admin_unit_access?: { unit_id: string }[];
};

export function UserFormModal({ units }: { units: Unit[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState("petugas");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    // Append multi-unit access if super_admin
    if (role === "super_admin") {
      selectedUnits.forEach(uid => formData.append("assigned_units", uid));
    }

    const result = await createUser(formData);

    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      // Reset form
      setSelectedUnits([]);
      setRole("petugas");
    }
  }

  const toggleUnit = (id: string) => {
    setSelectedUnits(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
        <UserPlus className="mr-2 h-4 w-4" /> Tambah User
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <Card className="my-6 w-full max-w-lg border-slate-800 bg-slate-950 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
              <Shield className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl">Tambah Pengguna Baru</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-slate-500">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid gap-5">
            {error && (
              <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Nama Lengkap</Label>
                <Input id="full_name" name="full_name" placeholder="John Doe" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="john@bijb.co.id" required />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password Sementara</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select 
                id="role" 
                name="role" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <option value="petugas">Petugas (Operasional)</option>
                <option value="admin">Admin (Reviewer Unit)</option>
                <option value="super_admin">Super Admin (Manager)</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {role !== "super_admin" ? (
              <div className="grid gap-2">
                <Label htmlFor="unit_id">Unit Kerja</Label>
                <select 
                  id="unit_id" 
                  name="unit_id" 
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option value="">Pilih Unit...</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.code} - {u.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Akses Unit (Pilih Beberapa)</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-md border border-slate-800 bg-slate-900/50 p-3">
                  {units.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUnit(u.id)}
                      className={`flex items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${
                        selectedUnits.includes(u.id) 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span>{u.code}</span>
                      {selectedUnits.includes(u.id) && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 italic">Kosongkan jika ingin memberi akses Global (Semua Unit).</p>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 px-8" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function UserEditModal({ user, units }: { user: EditableUser; units: Unit[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState(user.role);
  const [selectedUnits, setSelectedUnits] = useState<string[]>(
    user.super_admin_unit_access?.map((access) => access.unit_id) ?? [],
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    selectedUnits.forEach((unitId) => formData.append("assigned_units", unitId));

    const result = await updateUser(formData);

    if (result?.error) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    setIsOpen(false);
    setIsPending(false);
  }

  const toggleUnit = (id: string) => {
    setSelectedUnits((current) => (current.includes(id) ? current.filter((unitId) => unitId !== id) : [...current, id]));
  };

  if (!isOpen) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="h-8 px-3 text-slate-400">
        Edit
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <Card className="my-6 w-full max-w-lg border-slate-800 bg-slate-950 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <CardTitle className="text-xl">Edit Pengguna</CardTitle>
            <p className="mt-1 text-sm text-slate-400">{user.email}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-slate-500">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <input type="hidden" name="user_id" value={user.id} />
            {error ? (
              <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-400">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor={`full_name_${user.id}`}>Nama Lengkap</Label>
                <Input id={`full_name_${user.id}`} name="full_name" defaultValue={user.full_name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`email_${user.id}`}>Email</Label>
                <Input id={`email_${user.id}`} name="email" type="email" defaultValue={user.email} required />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`role_${user.id}`}>Role</Label>
              <select
                id={`role_${user.id}`}
                name="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <option value="petugas">Petugas</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            {role !== "super_admin" ? (
              <div className="grid gap-2">
                <Label htmlFor={`unit_id_${user.id}`}>Unit Kerja</Label>
                <select
                  id={`unit_id_${user.id}`}
                  name="unit_id"
                  defaultValue={user.unit_id ?? ""}
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option value="">Lintas Unit / Belum Dipilih</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.code} - {unit.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Akses Unit</Label>
                <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-slate-800 bg-slate-900/50 p-3">
                  {units.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => toggleUnit(unit.id)}
                      className={`flex items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${
                        selectedUnits.includes(unit.id)
                          ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                          : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <span>{unit.code}</span>
                      {selectedUnits.includes(unit.id) ? <Check className="h-3 w-3" /> : null}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">Kosong berarti akses global ke semua unit.</p>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-5">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
