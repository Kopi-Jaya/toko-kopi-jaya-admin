"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApiList } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

interface Product {
  product_id: number;
  name: string;
  base_price: number;
  earning_points: number;
  is_available: boolean;
  img_url: string | null;
  description: string | null;
  category?: { category_id: number; name: string };
}

interface Category {
  category_id: number;
  name: string;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
    name: "", category_id: "", base_price: "", earning_points: "0",
    description: "", img_url: "", is_available: true,
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  const { data, meta, loading, refetch } = useApiList<Product>("/products", {
    page, limit: 20, params: { search: search || undefined },
  });

  const openCreate = async () => {
    setDialogLoading(true);
    try {
      const res = await api.get<Category[]>("/categories");
      setCategories(res.data);
      setEditing(null);
      setForm({ name: "", category_id: "", base_price: "", earning_points: "0", description: "", img_url: "", is_available: true });
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setDialogLoading(false);
    }
  };

  const openEdit = async (p: Product) => {
    setDialogLoading(true);
    try {
      const res = await api.get<Category[]>("/categories");
      setCategories(res.data);
      setEditing(p);
      setForm({
        name: p.name, category_id: String(p.category?.category_id || ""),
        base_price: String(p.base_price), earning_points: String(p.earning_points),
        description: p.description || "", img_url: p.img_url || "", is_available: p.is_available,
      });
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setDialogLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const body = {
        name: form.name,
        category_id: Number(form.category_id),
        base_price: Number(form.base_price),
        earning_points: Number(form.earning_points),
        description: form.description || undefined,
        img_url: form.img_url || undefined,
        is_available: form.is_available,
      };
      if (editing) {
        await api.patch(`/products/${editing.product_id}`, body);
        toast.success("Product updated");
      } else {
        await api.post("/products", body);
        toast.success("Product created");
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
      await api.delete(`/products/${deleteTarget.id}`);
      toast.success("Product deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product",
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.img_url ? (
            <img src={p.img_url} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-kj-50 text-kj-700 text-xs font-medium">
              {p.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.category?.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: "base_price",
      header: "Price",
      className: "text-right",
      render: (p) => formatRupiah(Number(p.base_price)),
    },
    {
      key: "earning_points",
      header: "Points",
      className: "text-center",
      render: (p) => (
        <span className="text-gold-500 font-medium">{p.earning_points} pts</span>
      ),
    },
    {
      key: "is_available",
      header: "Status",
      render: (p) => (
        <Badge variant="outline" className={p.is_available ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
          {p.is_available ? "Available" : "Unavailable"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(p); }} disabled={dialogLoading}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: p.product_id, label: p.name }); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Products" description="Manage your menu items">
        <Button onClick={openCreate} disabled={dialogLoading} className="bg-kj-700 hover:bg-kj-800 text-white">
          {dialogLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add Product
        </Button>
      </PageHeader>

      <div className="mb-4">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
      </div>

      <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={setPage} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.label}"?`}
        description="This action cannot be undone."
        onConfirm={handleDelete}
      />

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Product" : "Add Product"}
        onSubmit={handleSubmit}
      >
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v || "" })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.category_id} value={String(c.category_id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price (Rp)</Label>
              <Input type="number" min="0" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} required />
            </div>
            <div>
              <Label>Earning Points</Label>
              <Input type="number" min="0" value={form.earning_points} onChange={(e) => setForm({ ...form, earning_points: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Image URL</Label>
            <Input value={form.img_url} onChange={(e) => setForm({ ...form, img_url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
