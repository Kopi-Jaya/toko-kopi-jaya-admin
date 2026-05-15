"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useApiList } from "@/hooks/use-api";
import { useScope } from "@/lib/scope";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Image from "next/image";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { DeleteConfirmDialog, type DeleteLink } from "@/components/delete-confirm-dialog";
import { toProxyImageUrl } from "@/lib/image-url";
import { RupiahInput } from "@/components/rupiah-input";

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

interface OutletProduct {
  outlet_product_id: number;
  product_id: number;
  price_override: number | null;
  effective_price: number;
  is_available: boolean;
  product: Product;
}

interface Category {
  category_id: number;
  name: string;
}

interface Outlet {
  outlet_id: number;
  name: string;
}

interface ProductRow {
  product_id: number;
  name: string;
  display_price: number;
  base_price: number;
  price_override: number | null;
  earning_points: number;
  is_available: boolean;
  img_url: string | null;
  description: string | null;
  category?: { category_id: number; name: string };
  outlet_names?: string[];
  outlet_product_id?: number;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function ProductsPage() {
  const { currentOutletId, availableOutlets, canSwitchOutlet } = useScope();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [outletProducts, setOutletProducts] = useState<OutletProduct[]>([]);
  const [outletAssignments, setOutletAssignments] = useState<Record<number, string[]>>({});
  const [outletAssignmentsLoaded, setOutletAssignmentsLoaded] = useState(false);

  const [form, setForm] = useState({
    name: "", category_id: "", base_price: "", earning_points: "0",
    description: "", img_url: "", is_available: true,
    price_override: "", form_outlet_id: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string; links?: DeleteLink[] } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Global products list (used when all outlets or when we need to build rows)
  const { data: globalProducts, meta, loading: globalLoading, refetch: refetchGlobal } = useApiList<Product>("/products", {
    page, limit: 20, params: { search: search || undefined },
  });

  // Fetch outlet-scoped products when an outlet is selected
  const fetchOutletProducts = useCallback(async () => {
    if (currentOutletId === null) return;
    try {
      const res = await api.get<OutletProduct[]>(`/outlets/${currentOutletId}/products`);
      setOutletProducts(res.data);
    } catch {
      toast.error("Failed to load outlet products");
    }
  }, [currentOutletId]);

  // Fetch product→outlet assignments for "All outlets" Outlet column
  const fetchOutletAssignments = useCallback(async () => {
    if (currentOutletId !== null) return;
    try {
      const res = await api.get<{ product_id: number; outlet_names: string[] }[]>("/analytics/product-outlets");
      const map: Record<number, string[]> = {};
      for (const r of res.data) map[r.product_id] = r.outlet_names;
      setOutletAssignments(map);
      setOutletAssignmentsLoaded(true);
    } catch {
      // non-fatal — outlet column just stays empty
    }
  }, [currentOutletId]);

  useEffect(() => {
    if (currentOutletId !== null) {
      fetchOutletProducts();
    } else {
      setOutletProducts([]);
      setOutletAssignmentsLoaded(false);
      fetchOutletAssignments();
    }
  }, [currentOutletId, fetchOutletProducts, fetchOutletAssignments]);

  const refetch = () => {
    refetchGlobal();
    if (currentOutletId !== null) fetchOutletProducts();
    else fetchOutletAssignments();
  };

  // Build the display rows based on current scope
  const rows: ProductRow[] = currentOutletId !== null
    ? outletProducts.map((op) => ({
        product_id: op.product.product_id,
        name: op.product.name,
        display_price: op.effective_price,
        base_price: op.product.base_price,
        price_override: op.price_override,
        earning_points: op.product.earning_points,
        is_available: op.is_available,
        img_url: op.product.img_url,
        description: op.product.description ?? null,
        category: op.product.category,
        outlet_product_id: op.outlet_product_id,
      }))
    : globalProducts.map((p) => ({
        product_id: p.product_id,
        name: p.name,
        display_price: p.base_price,
        base_price: p.base_price,
        price_override: null,
        earning_points: p.earning_points,
        is_available: p.is_available,
        img_url: p.img_url,
        description: p.description,
        category: p.category,
        outlet_names: outletAssignments[p.product_id] ?? [],
      }));

  const loading = currentOutletId !== null ? false : globalLoading;

  const openCreate = async () => {
    setDialogLoading(true);
    try {
      const res = await api.get<Category[]>("/categories");
      setCategories(res.data);
      setEditing(null);
      setForm({ name: "", category_id: "", base_price: "", earning_points: "0", description: "", img_url: "", is_available: true, price_override: "", form_outlet_id: "" });
      setPendingImage(null);
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setDialogLoading(false);
    }
  };

  const openEdit = async (row: ProductRow) => {
    setDialogLoading(true);
    try {
      const res = await api.get<Category[]>("/categories");
      setCategories(res.data);
      setEditing(row);
      setForm({
        name: row.name,
        category_id: String(row.category?.category_id || ""),
        base_price: String(row.base_price),
        earning_points: String(row.earning_points),
        description: row.description || "",
        img_url: row.img_url || "",
        is_available: row.is_available,
        price_override: row.price_override != null ? String(row.price_override) : "",
        form_outlet_id: "",
      });
      setPendingImage(null);
      setDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setDialogLoading(false);
    }
  };

  const handleFilePick = (file: File | null) => {
    if (!file) { setPendingImage(null); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be 5 MB or smaller"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Only JPEG, PNG, or WebP images"); return; }
    setPendingImage(file);
  };

  const handleSubmit = async () => {
    try {
      const globalBody = {
        name: form.name,
        category_id: Number(form.category_id),
        base_price: Number(form.base_price),
        earning_points: Number(form.earning_points),
        description: form.description || undefined,
        img_url: pendingImage ? undefined : form.img_url || undefined,
        is_available: form.is_available,
      };

      let productId: number;
      if (editing) {
        const res = await api.patch<Product>(`/products/${editing.product_id}`, globalBody);
        productId = res.data.product_id;
      } else {
        const res = await api.post<Product>("/products", globalBody);
        productId = res.data.product_id;
      }

      if (pendingImage) {
        const fd = new FormData();
        fd.append("file", pendingImage);
        await api.upload<Product>(`/products/${productId}/image`, fd);
      }

      // Outlet-specific update: price_override + per-outlet is_available
      const outletId = currentOutletId ?? (form.form_outlet_id ? Number(form.form_outlet_id) : null);
      if (outletId) {
        const overrideBody = {
          price_override: form.price_override ? Number(form.price_override) : null,
          is_available: form.is_available,
        };
        if (editing && editing.outlet_product_id) {
          await api.patch(`/outlets/${outletId}/products/${productId}`, overrideBody);
        } else {
          await api.post(`/outlets/${outletId}/products/${productId}`, overrideBody);
        }
      }

      toast.success(editing ? "Product updated" : "Product created");
      setPendingImage(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (currentOutletId !== null) {
        // Remove from outlet only
        await api.delete(`/outlets/${currentOutletId}/products/${deleteTarget.id}`);
        toast.success("Product removed from this outlet");
      } else {
        await api.delete(`/products/${deleteTarget.id}`);
        toast.success("Product deleted");
      }
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const isOutletMode = currentOutletId !== null;

  const columns: Column<ProductRow>[] = [
    {
      key: "name",
      header: "Product",
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.img_url ? (
            <Image src={toProxyImageUrl(p.img_url) ?? p.img_url!} alt={p.name} className="h-10 w-10 rounded-lg object-cover" width={40} height={40} unoptimized />
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
      key: "display_price",
      header: "Price",
      className: "text-right",
      render: (p) => (
        <div className="text-right">
          <span>{formatRupiah(Number(p.display_price))}</span>
          {p.price_override != null && (
            <p className="text-xs text-muted-foreground line-through">{formatRupiah(Number(p.base_price))}</p>
          )}
        </div>
      ),
    },
    {
      key: "earning_points",
      header: "Points",
      className: "text-center",
      render: (p) => <span className="text-gold-500 font-medium">{p.earning_points} pts</span>,
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
    ...(isOutletMode ? [] : [{
      key: "outlets" as keyof ProductRow,
      header: "Outlets",
      render: (p: ProductRow) => {
        const names = p.outlet_names ?? [];
        if (!outletAssignmentsLoaded) return <span className="text-muted-foreground text-xs">—</span>;
        if (names.length === 0) return <span className="text-muted-foreground text-xs">Not assigned</span>;
        return <span className="text-xs">{names.join(", ")}</span>;
      },
    }]),
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(p); }} disabled={dialogLoading}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={deleteLoading} onClick={async (e) => {
            e.stopPropagation();
            setDeleteLoading(true);
            try {
              const res = await api.get<{ order_items_count?: number }>(`/products/${p.product_id}`);
              setDeleteTarget({ id: p.product_id, label: p.name, links: [{ label: "order items", count: res.data.order_items_count ?? 0 }] });
            } catch {
              setDeleteTarget({ id: p.product_id, label: p.name });
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
      <PageHeader title="Products" description={isOutletMode ? "Menu for this outlet" : "Global product catalog"}>
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

      <DataTable columns={columns} data={rows} loading={loading} meta={isOutletMode ? undefined : meta} onPageChange={setPage} />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={isOutletMode ? `Remove "${deleteTarget?.label}" from this outlet?` : `Delete "${deleteTarget?.label}"?`}
        description={isOutletMode ? "The product stays in the global catalog — only removed from this outlet's menu." : "This action cannot be undone."}
        links={deleteTarget?.links}
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
              <SelectTrigger className="w-full">
                {form.category_id
                  ? <span>{categories.find(c => String(c.category_id) === form.category_id)?.name}</span>
                  : <span className="text-muted-foreground">Select category</span>}
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.category_id} value={String(c.category_id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* When "All outlets" and creating new: require outlet selection */}
          {!isOutletMode && !editing && canSwitchOutlet && (
            <div>
              <Label>Assign to Outlet <span className="text-destructive">*</span></Label>
              <Select value={form.form_outlet_id} onValueChange={(v) => setForm({ ...form, form_outlet_id: v || "" })}>
                <SelectTrigger className="w-full">
                  <span className="text-sm">
                    {form.form_outlet_id
                      ? (availableOutlets as Outlet[]).find((o) => String(o.outlet_id) === form.form_outlet_id)?.name ?? form.form_outlet_id
                      : <span className="text-muted-foreground">Select outlet</span>}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(availableOutlets as Outlet[]).map((o) => (
                    <SelectItem key={o.outlet_id} value={String(o.outlet_id)}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Base Price</Label>
              <RupiahInput value={form.base_price} onChange={(v) => setForm({ ...form, base_price: v })} required />
            </div>
            <div>
              <Label>Earning Points</Label>
              <Input type="number" min="0" value={form.earning_points} onChange={(e) => setForm({ ...form, earning_points: e.target.value })} />
            </div>
          </div>

          {/* Price override: only shown when outlet is selected */}
          {isOutletMode && (
            <div>
              <Label>Price Override <span className="text-muted-foreground text-xs">(leave empty to use base price)</span></Label>
              <RupiahInput value={form.price_override} onChange={(v) => setForm({ ...form, price_override: v })} placeholder="Same as base price" />
            </div>
          )}

          <div>
            <Label>Image</Label>
            <div className="flex items-start gap-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {pendingImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(pendingImage)} alt="preview" className="h-full w-full object-cover" />
                ) : form.img_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={toProxyImageUrl(form.img_url) ?? form.img_url} alt="current" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">No image</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {pendingImage ? "Change file" : form.img_url ? "Replace image" : "Choose file"}
                </Button>
                {pendingImage && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{pendingImage.name}</span>
                    <button type="button" className="text-destructive hover:underline" onClick={() => { setPendingImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 5 MB.</p>
              </div>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_available"
              checked={form.is_available}
              onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_available">{isOutletMode ? "Available at this outlet" : "Available for ordering"}</Label>
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
