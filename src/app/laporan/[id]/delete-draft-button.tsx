"use client";

import { useState, useRef } from "react";
import { Trash2 } from "lucide-react";
import { deleteDraftAction } from "./actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function DeleteDraftButton({ reportId }: { reportId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleConfirmDelete = () => {
    if (formRef.current) {
      setShowConfirm(false);
      setIsPending(true);
      formRef.current.requestSubmit();
    }
  };

  return (
    <>
      {/* Hidden Shadow Form for Native Deletion (Fixes Stream Error) */}
      <form 
        ref={formRef} 
        action={deleteDraftAction} 
        className="hidden"
      >
        <input type="hidden" name="report_id" value={reportId} />
      </form>

      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => setShowConfirm(true)}
        className="border-red-500/50 text-red-500 hover:bg-red-950/50 hover:text-red-400"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {isPending ? "Menghapus..." : "Hapus Draft"}
      </Button>

      <ConfirmDialog 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmDelete}
        isPending={isPending}
        title="Hapus Draft?"
        description="Draft laporan ini akan dihapus permanen beserta semua data insiden di dalamnya. Tindakan ini tidak bisa dibatalkan."
        confirmText="Ya, Hapus Permanen"
        variant="destructive"
      />
    </>
  );
}
