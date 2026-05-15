"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApiList } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DeleteConfirmDialog, type DeleteLink } from "@/components/delete-confirm-dialog";
import { RupiahInput } from "@/components/rupiah-input";

interface Discount {
  discount_id: number;
  name: string;
  code: string;
  type: "nominal" | "percentage";
  value: number;
  min_purchase: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function DiscountsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string; links?: DeleteLink[] } | null>(null);
  const [form, setForm] = useState<{
    name: string; code: string; type: "nominal" | "percentage"; value: string;
    min_purchase: string; max_discount: string; usage_limit: string;
    valid_from: string; valid_until: string; is_active: boolean;
  }>({
    name: "", code: "", type: "percentage", value: "",
    min_purchase: "", max_discount: "", usage_limit: "",
    valid_from: "", valid_until: "", is_active: true,
  });

  const { data, loading, refetch } = useApiList<Discount>("/discounts");

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", type: "percentage", value: "", min_purchase: "", max_discount: "", usage_limit: "", valid_from: "", valid_until: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditing(d);
    setForm({
      name: d.name, code: d.code || "", type: d.type, value: String(d.value),
      min_purchase: d.min_purchase ? String(d.min_purchase) : "",
      max_discount: d.max_discount ? String(d.max_discount) : "",
      usage_limit: d.usage_limit ? String(d.usage_limit) : "",
      valid_from: d.valid_from ? d.valid_from.split("T")[0] : "",
      valid_until: d.valid_until ? d.valid_until.split("T")[0] : "",
      is_active: d.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const body: Record<string, unknown> = {
        name: form.name, code: form.code || undefined, type: form.type, value: Number(form.value), is_active: form.is_active,
        min_purchase: form.min_purchase ? Number(form.min_purchase) : undefined,
        max_discount: form.max_discount ? Number(form.max_discount) : undefined,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : undefined,
        valid_from: form.valid_from || undefined,
        valid_until: form.valid_until || undefined,
      };
      if (editing) { await api.patch(`/discounts/${editing.discount_id}`, body); toast.success("Discount updated"); }
      else { await api.post("/discounts", body); toast.success("Discount created"); }
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/discounts/${deleteTarget.id}`);
      toast.success("Discount deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const columns: Column<Discount>[] = [
    { key: "name", header: "Name", render: (d) => <span className="font-medium">{d.name}</span> },
    { key: "code", header: "Code", render: (d) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{d.code}</code> },
    { key: "type", header: "Type", render: (d) => <Badge variant="outline">{d.type}</Badge> },
    { key: "value", header: "Value", className: "text-right", render: (d) => d.type === "percentage" ? `${d.value}%` : formatRupiah(Number(d.value)) },
    { key: "usage", header: "Usage", className: "text-center", render: (d) => `${d.usage_count}${d.usage_limit ? `/${d.usage_limit}` : ""}` },
    { key: "is_active", header: "Status", render: (d) => <Badge variant="outline" className={d.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{d.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "", className: "text-right",
      render: (d) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(d); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: d.discount_id, label: d.name, links: [{ label: "times used", count: d.usage_count }] }); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Discounts" description="Manage promo codes and discounts">
        <Button onClick={openCreate} className="bg-kj-700 hover:bg-kj-800 text-white"><Plus className="mr-2 h-4 w-4" /> Add Discount</Button>
      </PageHeader>
      <DataTable columns={columns} data={data} loading={loading} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.label}"?`}
        description="This action cannot be undone."
        links={deleteTarget?.links}
        onConfirm={handleDelete}
      />
      <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Discount" : "Add Discount"} onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="AUTO" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => {
                  if (v === "percentage" || v === "nominal") setForm({ ...form, type: v, max_discount: v === "nominal" ? "" : form.max_discount });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="nominal">Nominal</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Value</Label><Input type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Min Purchase (Rp)</Label><RupiahInput value={form.min_purchase} onChange={(v) => setForm({ ...form, min_purchase: v })} /></div>
            {form.type === "percentage" && (
              <div>
                <Label>Max Discount (Rp)</Label>
                <RupiahInput value={form.max_discount} onChange={(v) => setForm({ ...form, max_discount: v })} placeholder="No cap" />
                <p className="mt-1 text-xs text-muted-foreground">Caps the rupiah ceiling for this % promo</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Usage Limit</Label><Input type="number" min="0" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} /></div>
            <div><Label>Valid From</Label><Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></div>
            <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
