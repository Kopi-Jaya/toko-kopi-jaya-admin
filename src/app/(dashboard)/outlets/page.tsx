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
import { Plus, Pencil, Trash2, MapPin, Loader2 } from "lucide-react";
import { DeleteConfirmDialog, type DeleteLink } from "@/components/delete-confirm-dialog";

interface Outlet {
  outlet_id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  inactive: "bg-red-50 text-red-700",
  maintenance: "bg-yellow-50 text-yellow-700",
};

export default function OutletsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", latitude: "", longitude: "", status: "active" });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string; links?: DeleteLink[] } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data, loading, refetch } = useApiList<Outlet>("/outlets");

  const openCreate = () => { setEditing(null); setForm({ name: "", address: "", phone: "", latitude: "", longitude: "", status: "active" }); setDialogOpen(true); };
  const openEdit = (o: Outlet) => {
    setEditing(o);
    setForm({ name: o.name, address: o.address || "", phone: o.phone || "", latitude: o.latitude ? String(o.latitude) : "", longitude: o.longitude ? String(o.longitude) : "", status: o.status });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const body = {
        name: form.name, address: form.address || undefined, phone: form.phone || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        status: form.status,
      };
      if (editing) { await api.patch(`/outlets/${editing.outlet_id}`, body); toast.success("Outlet updated"); }
      else { await api.post("/outlets", body); toast.success("Outlet created"); }
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/outlets/${deleteTarget.id}`);
      toast.success("Outlet deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const columns: Column<Outlet>[] = [
    { key: "name", header: "Outlet", render: (o) => (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-kj-500" />
        <span className="font-medium">{o.name}</span>
      </div>
    )},
    { key: "address", header: "Address", render: (o) => o.address || "—" },
    { key: "phone", header: "Phone", render: (o) => o.phone || "—" },
    { key: "status", header: "Status", render: (o) => <Badge variant="outline" className={STATUS_COLORS[o.status]}>{o.status}</Badge> },
    {
      key: "actions", header: "", className: "text-right",
      render: (o) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(o); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={deleteLoading} onClick={async (e) => {
            e.stopPropagation();
            setDeleteLoading(true);
            try {
              const res = await api.get<{ staff_count?: number; orders_count?: number }>(`/outlets/${o.outlet_id}`);
              setDeleteTarget({ id: o.outlet_id, label: o.name, links: [
                { label: "staff members", count: res.data.staff_count ?? 0 },
                { label: "orders", count: res.data.orders_count ?? 0 },
              ]});
            } catch {
              setDeleteTarget({ id: o.outlet_id, label: o.name });
            } finally {
              setDeleteLoading(false);
            }
          }}>{deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Outlets" description="Manage store locations">
        <Button onClick={openCreate} className="bg-kj-700 hover:bg-kj-800 text-white"><Plus className="mr-2 h-4 w-4" /> Add Outlet</Button>
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
      <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Outlet" : "Add Outlet"} onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Latitude</Label><Input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
            <div><Label>Longitude</Label><Input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v || "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
