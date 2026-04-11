"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiList } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Gift, Loader2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

interface Reward {
  reedem_id: number;
  point_cost: number;
  is_active: boolean;
  stock_limit: number | null;
  redemption_count: number;
  product?: { product_id: number; name: string; img_url: string | null };
}

interface Product {
  product_id: number;
  name: string;
  base_price: number;
}

export default function RewardsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    product_id: "",
    point_cost: "",
    stock_limit: "",
    is_active: true,
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

  const { data, loading, refetch } = useApiList<Reward>("/redeem");

  const openCreate = async () => {
    setDialogLoading(true);
    try {
      const res = await api.get<Product[]>("/products");
      setProducts(res.data);
      setEditing(null);
      setForm({ product_id: "", point_cost: "", stock_limit: "", is_active: true });
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setDialogLoading(false);
    }
  };

  const openEdit = async (r: Reward) => {
    setDialogLoading(true);
    try {
      const res = await api.get<Product[]>("/products");
      setProducts(res.data);
      setEditing(r);
      setForm({
        product_id: String(r.product?.product_id || ""),
        point_cost: String(r.point_cost),
        stock_limit: r.stock_limit != null ? String(r.stock_limit) : "",
        is_active: r.is_active,
      });
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setDialogLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const body = {
        product_id: Number(form.product_id),
        point_cost: Number(form.point_cost),
        stock_limit: form.stock_limit ? Number(form.stock_limit) : null,
        is_active: form.is_active,
      };
      if (editing) {
        await api.patch(`/redeem/admin/${editing.reedem_id}`, body);
        toast.success("Reward updated");
      } else {
        await api.post("/redeem/admin", body);
        toast.success("Reward created");
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
      await api.delete(`/redeem/admin/${deleteTarget.id}`);
      toast.success("Reward deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const columns: Column<Reward>[] = [
    {
      key: "product", header: "Reward",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 text-gold-500">
            <Gift className="h-5 w-5" />
          </div>
          <span className="font-medium">{r.product?.name || "Unknown"}</span>
        </div>
      ),
    },
    { key: "point_cost", header: "Points Required", className: "text-right", render: (r) => <span className="text-gold-500 font-semibold">{r.point_cost?.toLocaleString()} pts</span> },
    { key: "stock", header: "Stock", className: "text-center", render: (r) => r.stock_limit ? `${r.stock_limit - r.redemption_count} left` : "Unlimited" },
    { key: "redemption_count", header: "Redeemed", className: "text-center", render: (r) => r.redemption_count },
    { key: "is_active", header: "Status", render: (r) => <Badge variant="outline" className={r.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{r.is_active ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }} disabled={dialogLoading}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: r.reedem_id, label: r.product?.name || "reward" }); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Rewards" description="Loyalty reward catalog for point redemption">
        <Button onClick={openCreate} disabled={dialogLoading} className="bg-kj-700 hover:bg-kj-800 text-white">
          {dialogLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add Reward
        </Button>
      </PageHeader>

      <DataTable columns={columns} data={data} loading={loading} />
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
        title={editing ? "Edit Reward" : "Add Reward"}
        onSubmit={handleSubmit}
      >
        <div className="space-y-3">
          <div>
            <Label>Product</Label>
            <Select
              value={form.product_id}
              onValueChange={(v) => setForm({ ...form, product_id: v || "" })}
              items={products.map((p) => ({ value: String(p.product_id), label: p.name }))}
            >
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.product_id} value={String(p.product_id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Point Cost</Label>
            <Input type="number" min="0" value={form.point_cost} onChange={(e) => setForm({ ...form, point_cost: e.target.value })} required />
          </div>
          <div>
            <Label>Stock Limit (leave empty for unlimited)</Label>
            <Input type="number" min="0" value={form.stock_limit} onChange={(e) => setForm({ ...form, stock_limit: e.target.value })} placeholder="Unlimited" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: !!checked })}
            />
            <Label>Active</Label>
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
