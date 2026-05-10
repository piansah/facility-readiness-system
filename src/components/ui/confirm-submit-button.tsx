"use client";

import { useRef, useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type ConfirmSubmitButtonProps = ComponentProps<typeof Button> & {
  message: string;
  title?: string;
};

export function ConfirmSubmitButton({
  children,
  message,
  title = "Konfirmasi Hapus",
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        {...props}
        ref={buttonRef}
        onClick={(event) => {
          onClick?.(event);

          if (event.defaultPrevented) {
            return;
          }

          event.preventDefault();
          setIsOpen(true);
        }}
      >
        {children}
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-950 p-5 shadow-2xl"
          >
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-slate-100">
              {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-300">
              {message}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  buttonRef.current?.form?.requestSubmit(buttonRef.current);
                }}
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
