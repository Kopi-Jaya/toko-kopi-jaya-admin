"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Minus, Trash2, Loader2, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import QRCode from "qrcode";

interface Outlet {
  outlet_id: number;
  name: string;
}

interface Product {
  product_id: number;
  name: string;
  base_price: number;
  is_available: boolean;
  category?: { name: string };
}

interface Modifier {
  modifier_id: number;
  name: string;
  price_adjustment: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  modifiers: Modifier[];
}

interface CreatedOrder {
  order_id: number;
  pickup_code: string;
  status: string;
  total_final: number;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function CreateOrderPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [outletId, setOutletId] = useState("");
  const [orderType, setOrderType] = useState("dine-in");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<Outlet[]>("/outlets"),
      api.get<Product[]>("/products"),
      api.get<Modifier[]>("/modifiers"),
    ]).then(([o, p, m]) => {
      setOutlets(o.data);
      setProducts(p.data.filter((pr) => pr.is_available));
      setModifiers(m.data);
    }).catch((err) => {
      console.error("Failed to load order data:", err);
      toast.error("Failed to load products and outlets");
    }).finally(() => {
      setInitialLoading(false);
    });
  }, []);

  const renderQR = useCallback(() => {
    if (qrCanvasRef.current && createdOrder?.pickup_code) {
      QRCode.toCanvas(qrCanvasRef.current, createdOrder.pickup_code, {
        width: 160,
        margin: 2,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      });
    }
  }, [createdOrder?.pickup_code]);

  useEffect(() => {
    renderQR();
  }, [renderQR]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.product_id === product.product_id && c.modifiers.length === 0);
      if (existing) {
        return prev.map((c) =>
          c === existing ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1, modifiers: [] }];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const item = prev[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
      return prev.map((c, i) => (i === index ? { ...c, quantity: newQty } : c));
    });
  };

  const toggleModifier = (cartIndex: number, mod: Modifier) => {
    setCart((prev) =>
      prev.map((c, i) => {
        if (i !== cartIndex) return c;
        const has = c.modifiers.find((m) => m.modifier_id === mod.modifier_id);
        return {
          ...c,
          modifiers: has
            ? c.modifiers.filter((m) => m.modifier_id !== mod.modifier_id)
            : [...c.modifiers, mod],
        };
      })
    );
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = cart.reduce((sum, item) => {
    const modTotal = item.modifiers.reduce((ms, m) => ms + Number(m.price_adjustment), 0);
    return sum + (Number(item.product.base_price) + modTotal) * item.quantity;
  }, 0);

  const handleSubmit = async () => {
    if (!outletId) { toast.error("Please select an outlet"); return; }
    if (cart.length === 0) { toast.error("Cart is empty"); return; }

    setSubmitting(true);
    try {
      const body = {
        outlet_id: Number(outletId),
        order_type: orderType,
        source: "Admin Dashboard",
        items: cart.map((c) => ({
          product_id: c.product.product_id,
          quantity: c.quantity,
          modifiers: c.modifiers.map((m) => m.modifier_id),
        })),
      };
      const res = await api.post<CreatedOrder>("/orders", body);
      toast.success("Order created successfully!");
      setCreatedOrder(res.data);
      setCart([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  if (createdOrder) {
    return (
      <div>
        <PageHeader title="Order Created" description="Your order has been placed successfully" />
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <ShoppingCart className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-4xl font-mono font-bold tracking-widest text-kj-700">
                {createdOrder.pickup_code}
              </h2>
              <canvas ref={qrCanvasRef} />
              <Badge className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1">
                {createdOrder.status?.replace(/_/g, " ").toUpperCase() || "PENDING"}
              </Badge>
              <p className="text-lg font-semibold">{formatRupiah(Number(createdOrder.total_final))}</p>
              <Button
                onClick={() => { setCreatedOrder(null); setOutletId(""); setOrderType("dine-in"); }}
                className="bg-kj-700 hover:bg-kj-800 text-white mt-2"
              >
                Create Another Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div>
        <PageHeader title="New Order" description="Create a new order from the admin dashboard" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="New Order" description="Create a new order from the admin dashboard" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Product selector */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Settings */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Outlet</Label>
                  <Select
                    value={outletId}
                    onValueChange={(v) => setOutletId(v || "")}
                    items={outlets.map((o) => ({ value: String(o.outlet_id), label: o.name }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                    <SelectContent>
                      {outlets.map((o) => (
                        <SelectItem key={o.outlet_id} value={String(o.outlet_id)}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Order Type</Label>
                  <Select value={orderType} onValueChange={(v) => setOrderType(v || "dine-in")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dine-in">Dine In</SelectItem>
                      <SelectItem value="takeaway">Takeaway</SelectItem>
                      <SelectItem value="click-collect">Click & Collect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {products.map((p) => (
                  <button
                    key={p.product_id}
                    onClick={() => addToCart(p)}
                    className="flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                  >
                    <span className="font-medium text-sm">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.category?.name}</span>
                    <span className="mt-1 text-sm font-semibold text-kj-700">{formatRupiah(Number(p.base_price))}</span>
                  </button>
                ))}
                {products.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-8">No products available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Cart */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No items added yet</p>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.product.name}</span>
                      <Button size="sm" variant="ghost" className="text-destructive h-6 w-6 p-0" onClick={() => removeFromCart(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(idx, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm w-8 text-center">{item.quantity}</span>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(idx, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="ml-auto text-sm font-medium">
                        {formatRupiah((Number(item.product.base_price) + item.modifiers.reduce((s, m) => s + Number(m.price_adjustment), 0)) * item.quantity)}
                      </span>
                    </div>
                    {/* Modifier toggles */}
                    {modifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {modifiers.map((mod) => {
                          const active = item.modifiers.some((m) => m.modifier_id === mod.modifier_id);
                          return (
                            <button
                              key={mod.modifier_id}
                              onClick={() => toggleModifier(idx, mod)}
                              className={`rounded-full px-2 py-0.5 text-xs border transition-colors ${active ? "bg-kj-700 text-white border-kj-700" : "bg-white text-muted-foreground hover:border-kj-300"}`}
                            >
                              {mod.name} {mod.price_adjustment > 0 ? `+${formatRupiah(Number(mod.price_adjustment))}` : ""}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}

              {cart.length > 0 && (
                <>
                  <div className="flex justify-between font-semibold text-base border-t pt-3">
                    <span>Subtotal</span>
                    <span>{formatRupiah(subtotal)}</span>
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full bg-kj-700 hover:bg-kj-800 text-white h-11"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                    Place Order
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
