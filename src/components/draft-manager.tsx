"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

type DraftValue = string | string[];
type DraftData = Record<string, DraftValue>;

type DraftManagerProps = {
  formId: string;
  storageKey: string;
};

export function DraftManager({ formId, storageKey }: DraftManagerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      setShowBanner(Boolean(localStorage.getItem(storageKey)));
      setIsOnline(navigator.onLine);
    });

    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const saveDraft = () => {
      localStorage.setItem(storageKey, JSON.stringify(readFormData(form)));
      // Do not show banner when user is actively editing
    };

    const clearSavedDraft = () => {
      localStorage.removeItem(storageKey);
      setShowBanner(false);
    };

    const syncOnlineState = () => setIsOnline(navigator.onLine);

    form.addEventListener("input", saveDraft);
    form.addEventListener("change", saveDraft);
    form.addEventListener("submit", clearSavedDraft);
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);

    return () => {
      form.removeEventListener("input", saveDraft);
      form.removeEventListener("change", saveDraft);
      form.removeEventListener("submit", clearSavedDraft);
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, [formId, storageKey]);

  const restoreDraft = () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      return;
    }

    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const data = JSON.parse(saved) as DraftData;
    restoreFormData(form, data);
    setShowBanner(false);
  };

  const clearDraft = () => {
    localStorage.removeItem(storageKey);
    setShowBanner(false);
  };

  if (!showBanner && isOnline) {
    return null;
  }

  return (
    <Card className="mb-4 border-blue-900/50 bg-blue-950/20 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400" aria-hidden="true" />
          <p className="text-sm text-blue-100">
            {showBanner
              ? "Draft lokal ditemukan dari sesi sebelumnya."
              : "Koneksi offline. Perubahan akan tersimpan sebagai draft lokal di perangkat ini."}
          </p>
        </div>
        {showBanner ? (
          <div className="flex w-full gap-2 sm:w-auto">
            <Button type="button" variant="outline" size="sm" onClick={restoreDraft} className="flex-1 sm:flex-none">
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Pulihkan
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearDraft}
              className="flex-1 text-blue-400 hover:text-red-400 sm:flex-none"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Abaikan
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function readFormData(form: HTMLFormElement) {
  const data: DraftData = {};
  const formData = new FormData(form);

  formData.forEach((value, key) => {
    if (value instanceof File) {
      return;
    }

    const currentValue = data[key];

    if (currentValue === undefined) {
      data[key] = value;
      return;
    }

    data[key] = Array.isArray(currentValue) ? [...currentValue, value] : [currentValue, value];
  });

  return data;
}

function restoreFormData(form: HTMLFormElement, data: DraftData) {
  Object.entries(data).forEach(([key, value]) => {
    const element = form.elements.namedItem(key);

    if (!element) {
      return;
    }

    if (element instanceof RadioNodeList) {
      Array.from(element).forEach((node) => {
        if (node instanceof HTMLInputElement && (node.type === "radio" || node.type === "checkbox")) {
          node.checked = Array.isArray(value) ? value.includes(node.value) : node.value === value;
        }
      });
      return;
    }

    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox" || element.type === "radio") {
        element.checked = Array.isArray(value) ? value.includes(element.value) : element.value === value;
      } else {
        element.value = Array.isArray(value) ? value[0] : value;
      }
      return;
    }

    if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
      element.value = Array.isArray(value) ? value[0] : value;
    }
  });
}
