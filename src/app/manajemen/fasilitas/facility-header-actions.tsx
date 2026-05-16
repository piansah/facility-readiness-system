"use client";

import { useState } from "react";
import { Plus, Box, FolderPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddAssetForm, AddCategoryForm } from "./facility-add-forms";

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

export function FacilityHeaderActions({
  units,
  categories,
  selectedUnitId,
  isSuperAdmin,
}: {
  units: Unit[];
  categories: Category[];
  selectedUnitId: string;
  isSuperAdmin: boolean;
}) {
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const handleAssetClick = () => {
    setShowChoiceModal(false);
    setShowAssetModal(true);
  };

  const handleCategoryClick = () => {
    setShowChoiceModal(false);
    setShowCategoryModal(true);
  };

  return (
    <>
      <Button 
        onClick={() => setShowChoiceModal(true)}
        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full shadow-lg shadow-emerald-900/20 transition-all active:scale-95 flex items-center gap-2"
      >
        <Plus className="h-5 w-5" />
        <span className="hidden sm:inline">Tambah</span>
      </Button>

      {/* Choice Modal (Bottom Sheet style on mobile if possible, but centered for now) */}
      <Dialog open={showChoiceModal} onOpenChange={setShowChoiceModal}>
        <DialogContent className="max-w-sm border-slate-800 bg-slate-900/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-center">Tambah Baru</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              onClick={handleAssetClick}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-slate-800 bg-slate-800/50 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group"
            >
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Box className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-slate-200">Tambah Aset</span>
            </button>

            <button
              onClick={handleCategoryClick}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border border-slate-800 bg-slate-800/50 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group"
            >
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <FolderPlus className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-slate-200">Kategori</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Asset Modal */}
      <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
        <DialogContent className="max-w-md border-slate-800 bg-slate-900/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Tambah Aset Baru</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <AddAssetForm
              units={units}
              categories={categories}
              defaultUnitId={selectedUnitId}
              canChooseUnit={isSuperAdmin}
              onSuccess={() => setShowAssetModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-md border-slate-800 bg-slate-900/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Tambah Kategori</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <AddCategoryForm
              units={units}
              defaultUnitId={selectedUnitId}
              canChooseUnit={isSuperAdmin}
              onSuccess={() => setShowCategoryModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
