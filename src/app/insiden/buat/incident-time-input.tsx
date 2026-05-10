"use client";

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

export function IncidentTimeInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    if (inputRef.current && !inputRef.current.value) {
      inputRef.current.value = local;
    }
  }, []);

  return (
    <Input
      ref={inputRef}
      id="incident_time"
      name="incident_time"
      type="datetime-local"
      required
    />
  );
}
