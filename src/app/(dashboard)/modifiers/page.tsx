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

interface Modifier {
  modifier_id: number;
  name: string;
  type: "add" | "remove";
  extra_price: number;
  is_active: boolean;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function ModifiersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Modifier | null>(null);
  const [form, setForm] = useState<{ name: string; type: "add" | "remove"; extra_price: string; is_active: boolean }>({ name: "", type: "add", extra_price: "0", is_active: true });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);

  const { data, loading, refetch } = useApiList<Modifier>("/modifiers");

  const openCreate = () => { setEditing(null); setForm({ name: "", type: "add", extra_price: "0", is_active: true }); setDialogOpen(true); };
  const openEdit = (m: Modifier) => { setEditing(m); setForm({ name: m.name, type: m.type, extra_price: String(m.extra_price), is_active: m.is_active }); setDialogOpen(true); };

  const handleSubmit = async () => {
    try {
      const body = { name: form.name, type: form.type, extra_price: Number(form.extra_price), is_active: form.is_active };
      if (editing) { await api.patch(`/modifiers/${editing.modifier_id}`, body); toast.success("Modifier updated"); }
      else { await api.post("/modifiers", body); toast.success("Modifier created"); }
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/modifiers/${deleteTarget.id}`);
      toast.success("Modifier deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const columns: Column<Modifier>[] = [
    { key: "name", header: "Name", render: (m) => <span className="font-medium">{m.name}</span> },
    { key: "type", header: "Type", render: (m) => <Badge variant="outline">{m.type}</Badge> },
    { key: "extra_price", header: "Price", className: "text-right", render: (m) => formatRupiah(Number(m.extra_price)) },
    { key: "is_active", header: "Status", render: (m) => <Badge variant="outline" className={m.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{m.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "", className: "text-right",
      render: (m) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(m); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: m.modifier_id, label: m.name }); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Modifiers" description="Manage add-ons and customizations">
        <Button onClick={openCreate} className="bg-kj-700 hover:bg-kj-800 text-white"><Plus className="mr-2 h-4 w-4" /> Add Modifier</Button>
      </PageHeader>
      <DataTable columns={columns} data={data} loading={loading} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.label}"?`}
        description="This action cannot be undone."
        onConfirm={handleDelete}
      />
      <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Modifier" : "Add Modifier"} onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><Label>Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => {
                if (v === "add" || v === "remove") setForm({ ...form, type: v });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="add">Add</SelectItem><SelectItem value="remove">Remove</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Extra Price (Rp)</Label><Input type="number" min="0" value={form.extra_price} onChange={(e) => setForm({ ...form, extra_price: e.target.value })} /></div>
        </div>
      </CrudDialog>
    </div>
  );
}
