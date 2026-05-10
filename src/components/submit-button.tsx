"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type SubmitButtonProps = ButtonProps & {
  pendingText: string;
};

export function SubmitButton({ children, pendingText, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
