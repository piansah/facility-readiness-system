"use client";

import { useState } from "react";

type StaffOption = {
  id: string;
  full_name: string;
  role: string;
};

export function StaffSelector({ 
  staff, 
  initialCurrentIds = [], 
  initialNextIds = [],
  currentDateLabel
}: { 
  staff: StaffOption[];
  initialCurrentIds?: string[];
  initialNextIds?: string[];
  currentDateLabel: string;
}) {
  const [currentSelected, setCurrentSelected] = useState<string[]>(initialCurrentIds);
  const [nextSelected, setNextSelected] = useState<string[]>(initialNextIds);

  const toggleCurrent = (id: string) => {
    setCurrentSelected(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      // Unselect from next if selected here
      setNextSelected(next => next.filter(i => i !== id));
      return [...prev, id];
    });
  };

  const toggleNext = (id: string) => {
    setNextSelected(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      // Unselect from current if selected here
      setCurrentSelected(curr => curr.filter(i => i !== id));
      return [...prev, id];
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="grid gap-2 rounded-md border border-slate-800 bg-slate-900 p-2.5 sm:p-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Petugas Shift Ini</h2>
          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400">{currentDateLabel} - pilih sesuai shift</p>
        </div>
        <div className="grid gap-1.5">
          {staff.map((person) => {
            const isChecked = currentSelected.includes(person.id);
            
            return (
              <label
                key={`current-${person.id}`}
                className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                  isChecked
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700"
                }`}
              >
                <span>
                  {person.full_name}
                  <span className="ml-2 text-[10px] uppercase text-slate-500">{person.role}</span>
                </span>
                <input
                  type="checkbox"
                  name="current_staff_id"
                  value={person.id}
                  checked={isChecked}
                  onChange={() => toggleCurrent(person.id)}
                  className="h-4 w-4 accent-emerald-500 cursor-pointer"
                />
              </label>
            );
          })}
        </div>
      </section>

      <section className="grid gap-2 rounded-md border border-slate-800 bg-slate-900 p-2.5 sm:p-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Petugas Shift Berikutnya</h2>
          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400">Pilih petugas/admin yang akan menerima shift berikutnya</p>
        </div>
        <div className="grid gap-1.5">
          {staff.map((person) => {
            const isChecked = nextSelected.includes(person.id);

            return (
              <label
                key={`next-${person.id}`}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                  isChecked
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700"
                }`}
              >
                <span>
                  {person.full_name}
                  <span className="ml-2 text-[10px] uppercase text-slate-500">{person.role}</span>
                </span>
                <input
                  type="checkbox"
                  name="next_staff_id"
                  value={person.id}
                  checked={isChecked}
                  onChange={() => toggleNext(person.id)}
                  className="h-4 w-4 cursor-pointer accent-emerald-500"
                />
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
