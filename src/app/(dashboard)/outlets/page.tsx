"use client";

import { useRef, useState } from "react";
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
import { Plus, Pencil, Trash2, MapPin, Loader2, ImagePlus } from "lucide-react";
import { DeleteConfirmDialog, type DeleteLink } from "@/components/delete-confirm-dialog";
import { MapPicker } from "@/components/map-picker";

interface Outlet {
  outlet_id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  logo_url: string | null;
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, refetch } = useApiList<Outlet>("/outlets");

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", address: "", phone: "", latitude: "", longitude: "", status: "active" });
    setLogoFile(null);
    setLogoPreview(null);
    setDialogOpen(true);
  };
  const openEdit = (o: Outlet) => {
    setEditing(o);
    setForm({ name: o.name, address: o.address || "", phone: o.phone || "", latitude: o.latitude ? String(o.latitude) : "", longitude: o.longitude ? String(o.longitude) : "", status: o.status });
    setLogoFile(null);
    setLogoPreview(o.logo_url ?? null);
    setDialogOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    try {
      const body = {
        name: form.name, address: form.address || undefined, phone: form.phone || undefined,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        status: form.status,
      };
      let outletId: number;
      if (editing) {
        await api.patch(`/outlets/${editing.outlet_id}`, body);
        outletId = editing.outlet_id;
        toast.success("Outlet updated");
      } else {
        const res = await api.post<Outlet>("/outlets", body);
        outletId = res.data.outlet_id;
        toast.success("Outlet created");
      }
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        await api.post(`/outlets/${outletId}/logo`, fd);
      }
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
    {
      key: "name", header: "Outlet",
      render: (o) => (
        <div className="flex items-center gap-3 min-w-0">
          {o.logo_url ? (
            <img src={o.logo_url} alt={o.name} className="h-9 w-9 shrink-0 rounded-lg object-cover border" />
          ) : (
            <div className="h-9 w-9 shrink-0 rounded-lg bg-kj-50 border flex items-center justify-center">
              <MapPin className="h-4 w-4 text-kj-500" />
            </div>
          )}
          <span className="font-medium truncate">{o.name}</span>
        </div>
      ),
    },
    {
      key: "address", header: "Address", className: "max-w-[280px]",
      render: (o) => (
        <span className="block truncate text-sm text-muted-foreground" title={o.address || undefined}>
          {o.address || "—"}
        </span>
      ),
    },
    {
      key: "phone", header: "Phone",
      render: (o) => <span className="text-sm">{o.phone || "—"}</span>,
    },
    {
      key: "status", header: "Status",
      render: (o) => <Badge variant="outline" className={STATUS_COLORS[o.status]}>{o.status}</Badge>,
    },
    {
      key: "actions", header: "", className: "text-right w-20",
      render: (o) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(o); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={deleteLoading}
            onClick={async (e) => {
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
            }}>
            {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
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
          <div>
            <Label>Logo</Label>
            <div className="flex items-center gap-3 mt-1">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover border" />
              ) : (
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
                  <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                  {logoPreview ? "Change Logo" : "Upload Logo"}
                </Button>
                {logoPreview && logoFile && (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => { setLogoFile(null); setLogoPreview(editing?.logo_url ?? null); }}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
          </div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
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
          <div>
            <Label>Location</Label>
            <p className="text-xs text-muted-foreground mb-2">Search or click on the map to set the outlet location</p>
            <MapPicker
              lat={form.latitude}
              lng={form.longitude}
              onChange={(lat, lng, address) => setForm((f) => ({
                ...f,
                latitude: lat,
                longitude: lng,
                address: address ?? f.address,
              }))}
            />
          </div>
          <div><Label>Address <span className="text-muted-foreground text-xs">(auto-filled from map, or type manually)</span></Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
