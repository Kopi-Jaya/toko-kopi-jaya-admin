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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

interface Staff {
  staff_id: number;
  name: string;
  username: string;
  role: string;
  is_active: boolean;
  outlet?: { outlet_id: number; name: string };
}

interface Outlet { outlet_id: number; name: string; }

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-blue-100 text-blue-800",
  cashier: "bg-green-100 text-green-800",
  barista: "bg-orange-100 text-orange-800",
};

export default function StaffPage() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [form, setForm] = useState({ name: "", username: "", password: "", role: "cashier", outlet_id: "", is_active: true });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  const { data, meta, loading, refetch } = useApiList<Staff>("/staff", { page, limit: 20 });

  const loadOutlets = async () => {
    const res = await api.get<Outlet[]>("/outlets");
    setOutlets(res.data);
  };

  const openCreate = async () => {
    setDialogLoading(true);
    try {
      await loadOutlets();
      setEditing(null);
      setForm({ name: "", username: "", password: "", role: "cashier", outlet_id: "", is_active: true });
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load outlets");
    } finally {
      setDialogLoading(false);
    }
  };

  const openEdit = async (s: Staff) => {
    setDialogLoading(true);
    try {
      await loadOutlets();
      setEditing(s);
      setForm({ name: s.name, username: s.username, password: "", role: s.role, outlet_id: s.outlet?.outlet_id ? String(s.outlet.outlet_id) : "", is_active: s.is_active });
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load outlets");
    } finally {
      setDialogLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const body: Record<string, unknown> = {
        name: form.name, username: form.username, role: form.role,
        outlet_id: form.outlet_id ? Number(form.outlet_id) : undefined,
        is_active: form.is_active,
      };
      if (form.password) body.password = form.password;
      if (editing) { await api.patch(`/staff/${editing.staff_id}`, body); toast.success("Staff updated"); }
      else { body.password = form.password; await api.post("/staff", body); toast.success("Staff created"); }
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/staff/${deleteTarget.id}`);
      toast.success("Staff deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const columns: Column<Staff>[] = [
    { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.name}</span> },
    { key: "username", header: "Username" },
    { key: "role", header: "Role", render: (s) => <Badge className={ROLE_COLORS[s.role]}>{s.role}</Badge> },
    { key: "outlet", header: "Outlet", render: (s) => s.outlet?.name || "—" },
    { key: "is_active", header: "Status", render: (s) => <Badge variant="outline" className={s.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{s.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions", header: "", className: "text-right",
      render: (s) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(s); }} disabled={dialogLoading}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: s.staff_id, label: s.name }); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Staff" description="Manage team members">
        <Button onClick={openCreate} disabled={dialogLoading} className="bg-kj-700 hover:bg-kj-800 text-white">
          {dialogLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add Staff
        </Button>
      </PageHeader>
      <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={setPage} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.label}"?`}
        description="This action cannot be undone."
        onConfirm={handleDelete}
      />
      <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Staff" : "Add Staff"} onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></div>
          <div><Label>Password {editing ? "(leave blank to keep)" : ""}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} minLength={8} /></div>
          <div><Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v || "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="barista">Barista</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Outlet</Label>
            <Select value={form.outlet_id} onValueChange={(v) => setForm({ ...form, outlet_id: v || "" })}>
              <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
              <SelectContent>
                {outlets.map((o) => <SelectItem key={o.outlet_id} value={String(o.outlet_id)}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
