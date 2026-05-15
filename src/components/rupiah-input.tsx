"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";

interface RupiahInputProps {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

function toDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

export function RupiahInput({ value, onChange, placeholder, required, className }: RupiahInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    onChange(digits);
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
      <Input
        ref={inputRef}
        value={toDisplay(value)}
        onChange={handleChange}
        placeholder={placeholder ?? "0"}
        required={required}
        className={`pl-9 ${className ?? ""}`}
        inputMode="numeric"
      />
    </div>
  );
}
