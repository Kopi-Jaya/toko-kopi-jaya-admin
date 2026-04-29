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
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

interface Tax {
  tax_id: number;
  name: string;
  type: "nominal" | "percentage";
  value: number;
  is_active: boolean;
}

export default function TaxPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tax | null>(null);
  const [form, setForm] = useState<{ name: string; type: "nominal" | "percentage"; value: string; is_active: boolean }>({ name: "", type: "percentage", value: "", is_active: true });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);

  const { data, loading, refetch } = useApiList<Tax>("/taxes");

  const openCreate = () => { setEditing(null); setForm({ name: "", type: "percentage", value: "", is_active: true }); setDialogOpen(true); };
  const openEdit = (t: Tax) => { setEditing(t); setForm({ name: t.name, type: t.type, value: String(t.value), is_active: t.is_active }); setDialogOpen(true); };

  const handleSubmit = async () => {
    try {
      const body = { name: form.name, type: form.type, value: Number(form.value), is_active: form.is_active };
      if (editing) { await api.patch(`/taxes/${editing.tax_id}`, body); toast.success("Tax updated"); }
      else { await api.post("/taxes", body); toast.success("Tax created"); }
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/taxes/${deleteTarget.id}`);
      toast.success("Tax deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const columns: Column<Tax>[] = [
    { key: "name", header: "Name", render: (t) => <span className="font-medium">{t.name}</span> },
    { key: "type", header: "Type", render: (t) => <Badge variant="outline">{t.type}</Badge> },
    { key: "value", header: "Value", className: "text-right", render: (t) => t.type === "percentage" ? `${t.value}%` : `Rp ${Number(t.value).toLocaleString()}` },
    { key: "is_active", header: "Status", render: (t) => <Badge variant="outline" className={t.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{t.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "", className: "text-right",
      render: (t) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(t); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: t.tax_id, label: t.name }); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Tax" description="Configure tax rates">
        <Button onClick={openCreate} className="bg-kj-700 hover:bg-kj-800 text-white"><Plus className="mr-2 h-4 w-4" /> Add Tax</Button>
      </PageHeader>
      <DataTable columns={columns} data={data} loading={loading} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.label}"?`}
        description="This action cannot be undone."
        onConfirm={handleDelete}
      />
      <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Tax" : "Add Tax"} onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => {
                  if (v === "percentage" || v === "nominal") setForm({ ...form, type: v });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="nominal">Nominal</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Value</Label><Input type="number" min="0" step="any" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></div>
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
