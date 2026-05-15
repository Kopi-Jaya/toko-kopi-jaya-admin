"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useApiList } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DeleteConfirmDialog, type DeleteLink } from "@/components/delete-confirm-dialog";

interface Category {
  category_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  products_count?: number;
}

export default function CategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "", is_active: true });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string; links?: DeleteLink[] } | null>(null);

  const { data, loading, refetch } = useApiList<Category>("/categories");

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "", is_active: c.is_active });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const body = { name: form.name, description: form.description || undefined, is_active: form.is_active };
      if (editing) {
        await api.patch(`/categories/${editing.category_id}`, body);
        toast.success("Category updated");
      } else {
        await api.post("/categories", body);
        toast.success("Category created");
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
      await api.delete(`/categories/${deleteTarget.id}`);
      toast.success("Category deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const columns: Column<Category>[] = [
    { key: "name", header: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
    { key: "description", header: "Description", render: (c) => c.description || "—" },
    { key: "productCount", header: "Products", className: "text-center", render: (c) => c.products_count ?? "—" },
    {
      key: "is_active", header: "Status",
      render: (c) => <Badge variant="outline" className={c.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{c.is_active ? "Active" : "Inactive"}</Badge>,
    },
    {
      key: "actions", header: "", className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(c); }}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: c.category_id, label: c.name, links: [{ label: "products assigned", count: c.products_count ?? 0 }] }); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Categories" description="Organize your menu">
        <Button onClick={openCreate} className="bg-kj-700 hover:bg-kj-800 text-white"><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
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
      <CrudDialog open={dialogOpen} onOpenChange={setDialogOpen} title={editing ? "Edit Category" : "Add Category"} onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cat_is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="cat_is_active">Active</Label>
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
