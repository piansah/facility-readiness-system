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
  value?: string;
  onValueChange?: (value: string) => void;
};

export function FormSelect({
  name,
  placeholder = "Pilih...",
  options,
  required,
  defaultValue,
  value,
  onValueChange,
}: FormSelectProps) {
  return (
    <Select name={name} required={required} defaultValue={defaultValue} value={value} onValueChange={onValueChange}>
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
