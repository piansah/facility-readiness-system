"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

export function IncidentTimeInput({ 
  defaultValue, 
  name = "incident_time",
  noDefault = false
}: { 
  defaultValue?: string, 
  name?: string,
  noDefault?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (defaultValue && inputRef.current) {
      // Pastikan formatnya sesuai datetime-local (YYYY-MM-DDTHH:mm)
      try {
        const date = new Date(defaultValue.replace(" ", "T"));
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        inputRef.current.value = local;
      } catch (e) {
        inputRef.current.value = defaultValue;
      }
      return;
    }

    if (noDefault) return;

    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    if (inputRef.current && !inputRef.current.value) {
      inputRef.current.value = local;
    }
  }, [defaultValue]);

  return (
    <Input
      ref={inputRef}
      id={name}
      name={name}
      type="datetime-local"
      required
    />
  );
}
