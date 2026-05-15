"use client";

import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScope } from "@/lib/scope";

const ALL_VALUE = "all";

/// Header drop-down that lets a super_admin pick which outlet they're
/// currently viewing. Renders nothing for outlet-scoped users — they're
/// locked to their assigned outlet.
export function OutletScopePicker() {
  const {
    canSwitchOutlet,
    currentOutletId,
    availableOutlets,
    outletsLoading,
    setCurrentOutletId,
  } = useScope();

  if (!canSwitchOutlet) return null;

  const value =
    currentOutletId === null ? ALL_VALUE : String(currentOutletId);

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value}
        onValueChange={(v) => {
          if (!v || v === ALL_VALUE) {
            setCurrentOutletId(null);
            return;
          }
          const parsed = Number.parseInt(v, 10);
          setCurrentOutletId(Number.isFinite(parsed) ? parsed : null);
        }}
      >
        <SelectTrigger className="w-[220px]">
          <span className="flex-1 truncate text-left text-sm">
            {outletsLoading
              ? "Loading outlets…"
              : currentOutletId === null
                ? "All outlets (super-admin)"
                : (availableOutlets.find((o) => o.outlet_id === currentOutletId)?.name ?? "Select outlet")}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>All outlets (super-admin)</SelectItem>
          {availableOutlets.map((o) => (
            <SelectItem key={o.outlet_id} value={String(o.outlet_id)}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
