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

interface ServiceCharge {
  service_charge_id: number;
  name: string;
  type: "nominal" | "percentage";
  value: number;
  is_active: boolean;
}

export default function ServiceChargesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCharge | null>(null);
  const [form, setForm] = useState<{ name: string; type: "nominal" | "percentage"; value: string; is_active: boolean }>({ name: "", type: "percentage", value: "", is_active: true });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);

  const { data, loading, refetch } = useApiList<ServiceCharge>("/service-charges");

  const openCreate = () => { setEditing(null); setForm({ name: "", type: "percentage", value: "", is_active: true }); setDialogOpen(true); };
  const openEdit = (sc: ServiceCharge) => { setEditing(sc); setForm({ name: sc.name, type: sc.type, value: String(sc.value), is_active: sc.is_active }); setDialogOpen(true); };

  const handleSubmit = async () => {
    try {
      const body = { name: form.name, type: form.type, value: Number(form.value), is_active: form.is_active };
      if (editing) { await api.patch(`/service-charges/${editing.service_charge_id}`, body); toast.success("Service charge updated"); }
      else { await api.post("/service-charges", body); toast.success("Service charge created"); }
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/service-charges/${deleteTarget.id}`);
      toast.success("Service charge deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const columns: Column<ServiceCharge>[] = [
    { key: "name", header: "Name", render: (sc) => <span className="font-medium">{sc.name}</span> },
    { key: "type", header: "Type", render: (sc) => <Badge variant="outline">{sc.type}</Badge> },
    { key: "value", header: "Value", className: "text-right", render: (sc) => sc.type === "percentage" ? `${sc.value}%` : `Rp ${Number(sc.value).toLocaleString()}` },
    { key: "is_active", header: "Status", render: (sc) => <Badge variant="outline" className={sc.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{sc.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "", className: "text-right",
      render: (sc) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(sc); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: sc.service_charge_id, label: sc.name }); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Service Charges" description="Configure service charge rates">
        <Button onClick={openCreate} className="bg-kj-700 hover:bg-kj-800 text-white"><Plus className="mr-2 h-4 w-4" /> Add Service Charge</Button>
      </PageHeader>
      <DataTable columns={columns} data={data} loading={loading} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.label}"?`}
        description="This action cannot be undone."
        onConfirm={handleDelete}
      />
      <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Service Charge" : "Add Service Charge"} onSubmit={handleSubmit}>
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
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="sc_is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="sc_is_active">Active</Label>
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
