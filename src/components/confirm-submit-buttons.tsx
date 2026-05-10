"use client";

import { useState } from "react";
import { Loader2, Save, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";

export function ConfirmSubmitButtons({ 
  isEdit = false,
}: { 
  isEdit?: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<"draft" | "submitted" | null>(null);

  const getFormAndIntentInput = (btn: HTMLElement) => {
    const form = btn.closest("form") as HTMLFormElement;
    if (!form) return { form: null, intentInput: null };
    
    let intentInput = form.querySelector('input[name="intent"]') as HTMLInputElement;
    if (!intentInput) {
      intentInput = document.createElement("input");
      intentInput.type = "hidden";
      intentInput.name = "intent";
      form.appendChild(intentInput);
    }
    return { form, intentInput };
  };

  const handleDraftClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { form, intentInput } = getFormAndIntentInput(e.currentTarget);
    if (form && intentInput) {
      if (!form.reportValidity()) {
        return;
      }

      intentInput.value = "draft";
      setPendingIntent("draft");
      form.requestSubmit();
    }
  };

  const handleFinalConfirm = () => {
    // We need to find the form relative to where the component is rendered
    // Since the dialog is outside, we'll look for the sticky footer first
    const stickyFooter = document.querySelector(`[data-form-footer]`);
    if (!stickyFooter) return;

    const { form, intentInput } = getFormAndIntentInput(stickyFooter as HTMLElement);
    if (form && intentInput) {
      if (!form.reportValidity()) {
        setShowConfirm(false);
        return;
      }

      intentInput.value = "submitted";
      setShowConfirm(false);
      setPendingIntent("submitted");
      form.requestSubmit();
    }
  };

  return (
    <>
      <div data-form-footer className="sticky bottom-0 -mx-4 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur z-50">
        <div className="mx-auto max-w-4xl grid grid-cols-2 gap-3">
          <Button 
            type="button" 
            onClick={handleDraftClick}
            variant="outline"
            disabled={pendingIntent !== null}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            {pendingIntent === "draft" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {pendingIntent === "draft" ? "Menyimpan..." : isEdit ? "Update Draft" : "Simpan Draft"}
          </Button>
          
          <Button 
            type="button" 
            disabled={pendingIntent !== null}
            onClick={() => setShowConfirm(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
          >
            {pendingIntent === "submitted" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <SendHorizonal className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {pendingIntent === "submitted" ? "Mengirim..." : "Submit Laporan"}
          </Button>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleFinalConfirm}
        isPending={pendingIntent === "submitted"}
        title="Kirim Laporan?"
        description="Laporan yang sudah dikirim tidak dapat diubah kembali. Pastikan semua data sudah benar."
        confirmText="Ya, Kirim Sekarang"
        variant="emerald"
      />
    </>
  );
}
