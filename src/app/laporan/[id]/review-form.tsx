"use client";

import { useState, useRef } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/text-area";
import { reviewDailyReport } from "./actions";

type ReviewFormProps = {
  reportId: string;
  currentStatus: string;
};

export function ReviewForm({ reportId, currentStatus }: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    // This is called by the form's action, but we'll use a manual trigger to handle confirmation
  };

  const handleConfirm = () => {
    if (formRef.current && pendingStatus) {
      setIsSubmitting(true);
      setShowConfirm(false);
      
      // Create a hidden input for the status if it's not already there
      const statusInput = document.createElement("input");
      statusInput.type = "hidden";
      statusInput.name = "status";
      statusInput.value = pendingStatus;
      formRef.current.appendChild(statusInput);
      
      formRef.current.requestSubmit();
    }
  };

  const onButtonClick = (status: string) => {
    setPendingStatus(status);
    setShowConfirm(true);
  };

  const isReviewed = currentStatus === "reviewed";
  const isRejected = currentStatus === "rejected";

  return (
    <div className="grid gap-4">
      <form ref={formRef} action={reviewDailyReport} className="grid gap-4">
        <input type="hidden" name="report_id" value={reportId} />
        <div className="grid gap-2">
          <Label htmlFor="review_notes">Catatan Review (Opsional)</Label>
          <Textarea
            id="review_notes"
            name="review_notes"
            placeholder="Contoh: Laporan sudah lengkap, atau Perbaiki bagian fasilitas X..."
            className="bg-slate-900 border-slate-700 text-slate-100"
            disabled={isSubmitting}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={() => onButtonClick("reviewed")}
            disabled={isSubmitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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
            disabled={isSubmitting}
            className="flex-1"
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

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100">
              Konfirmasi {pendingStatus === "reviewed" ? "Persetujuan" : "Penolakan"}
            </h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin {pendingStatus === "reviewed" ? "menyetujui" : "menolak"} laporan ini? 
              Tindakan ini akan memperbarui status laporan.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-100"
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={pendingStatus === "reviewed" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Lanjutkan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
