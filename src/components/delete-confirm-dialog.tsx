"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

export interface DeleteLink {
  label: string;
  count: number;
}

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  links?: DeleteLink[];
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = "Delete item?",
  description = "This action cannot be undone.",
  links,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  const activeLinks = links?.filter((l) => l.count > 0) ?? [];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {activeLinks.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-amber-800 mb-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Linked records
            </div>
            <ul className="space-y-0.5 text-amber-700 pl-6 list-disc">
              {activeLinks.map((l) => (
                <li key={l.label}>
                  {l.count} {l.label}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-amber-700">
              This item will be hidden. Linked records are not deleted.
            </p>
          </div>
        )}

        {activeLinks.length === 0 && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
