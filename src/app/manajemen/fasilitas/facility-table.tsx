"use client";

import { useState, useMemo } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FacilityRowActions } from "./facility-row-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Facility = {
  id: string;
  name: string;
  location_detail: string | null;
  category_id: string;
  sort_order: number | null;
  is_active: boolean;
  facility_categories: {
    name: string;
  } | null;
};

type Category = {
  id: string;
  name: string;
};

type FacilityTableProps = {
  facilities: Facility[];
  categories: Category[];
};

export function FacilityTable({ facilities, categories }: FacilityTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");

  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      // Filter by category
      if (selectedCategoryId !== "ALL" && f.category_id !== selectedCategoryId) {
        return false;
      }
      
      // Filter by search query (name or location)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = f.name.toLowerCase().includes(query);
        const matchLocation = f.location_detail?.toLowerCase().includes(query);
        const matchCategory = f.facility_categories?.name.toLowerCase().includes(query);
        if (!matchName && !matchLocation && !matchCategory) {
          return false;
        }
      }
      
      return true;
    });
  }, [facilities, searchQuery, selectedCategoryId]);

  return (
    <div className="flex flex-col">
      {/* Search and Filter Controls */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Cari nama aset, lokasi, atau kategori..." 
            className="pl-9 bg-slate-950 border-slate-800 h-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="w-full sm:w-64">
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-slate-200">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <SelectValue placeholder="Semua Kategori" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
              <SelectItem value="ALL" className="font-bold">Semua Kategori</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Nama Aset</th>
              <th className="px-6 py-4">Kategori</th>
              <th className="px-6 py-4">Tempat/Lokasi</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredFacilities.map((f) => (
              <tr key={f.id} className="hover:bg-slate-900/30 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-200">
                  {f.name}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-400">{f.facility_categories?.name}</span>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 italic">
                  {f.location_detail || "-"}
                </td>
                <td className="px-6 py-4 text-right">
                  <FacilityRowActions facility={f as any} categories={categories as any} />
                </td>
              </tr>
            ))}
            {filteredFacilities.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                  {facilities.length === 0 
                    ? "Belum ada fasilitas terdaftar di unit ini." 
                    : "Tidak ada aset yang sesuai dengan pencarian/filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
