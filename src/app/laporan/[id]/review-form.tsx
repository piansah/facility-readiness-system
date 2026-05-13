"use client";

import { useState, useRef, useTransition } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/text-area";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { reviewDailyReport } from "./actions";

type ReviewFormProps = {
  reportId: string;
  currentStatus: string;
};

export function ReviewForm({ reportId, currentStatus }: ReviewFormProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<"reviewed" | "rejected" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Both buttons are disabled once a review decision already exists (reviewed/rejected)
  // OR while a submission is in-flight
  const alreadyDecided = currentStatus === "reviewed" || currentStatus === "rejected";
  const isSubmitting = isPending && pendingStatus !== null;
  const buttonsDisabled = isSubmitting;

  const onButtonClick = (status: "reviewed" | "rejected") => {
    if (buttonsDisabled) return;
    setPendingStatus(status);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (!formRef.current || !pendingStatus) return;

    setShowConfirm(false);

    startTransition(async () => {
      const formData = new FormData(formRef.current!);
      // Remove any stale status field before adding the fresh one
      formData.delete("status");
      formData.set("status", pendingStatus);
      await reviewDailyReport(formData);
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setShowConfirm(false);
    setPendingStatus(null);
  };

  return (
    <>
      <form ref={formRef} className="grid gap-4">
        <input type="hidden" name="report_id" value={reportId} />
        <div className="grid gap-2">
          <Label htmlFor="review_notes">Catatan Review (Opsional)</Label>
          <Textarea
            id="review_notes"
            name="review_notes"
            placeholder="Contoh: Laporan sudah lengkap, atau Perbaiki bagian fasilitas X..."
            className="bg-slate-900 border-slate-700 text-slate-100"
            disabled={isSubmitting || alreadyDecided}
          />
        </div>

        {alreadyDecided && (
          <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2">
            ⚠️ Laporan ini sudah memiliki keputusan review. Tombol di bawah dinonaktifkan untuk mencegah perubahan tidak disengaja.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={() => onButtonClick("reviewed")}
            disabled={buttonsDisabled || alreadyDecided}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && pendingStatus === "reviewed" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {currentStatus === "reviewed" ? "Tetap Setujui" : "Setujui Laporan"}
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={() => onButtonClick("rejected")}
            disabled={buttonsDisabled || alreadyDecided}
            className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && pendingStatus === "rejected" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            {currentStatus === "rejected" ? "Tetap Tolak" : "Tolak Laporan"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={handleClose}
        onConfirm={handleConfirm}
        isPending={isSubmitting}
        title={pendingStatus === "reviewed" ? "Setujui Laporan?" : "Tolak Laporan?"}
        description={
          pendingStatus === "reviewed"
            ? "Laporan akan ditandai sebagai disetujui. Tindakan ini akan memperbarui status laporan."
            : "Laporan akan ditandai sebagai ditolak. Petugas perlu memperbaiki dan mengirim ulang laporan."
        }
        confirmText={pendingStatus === "reviewed" ? "Ya, Setujui" : "Ya, Tolak"}
        variant={pendingStatus === "reviewed" ? "emerald" : "destructive"}
      />
    </>
  );
}
