"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = {
  value: string;
  label: string;
};

type FormSelectProps = {
  name: string;
  placeholder?: string;
  options: Option[];
  required?: boolean;
  defaultValue?: string;
};

export function FormSelect({
  name,
  placeholder = "Pilih...",
  options,
  required,
  defaultValue,
}: FormSelectProps) {
  return (
    <Select name={name} required={required} defaultValue={defaultValue}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
