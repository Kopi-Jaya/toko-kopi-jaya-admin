"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ScanLine, CheckCircle2, XCircle } from "lucide-react";
import QRCode from "qrcode";

interface OrderDetail {
  order_id: number;
  pickup_code: string;
  source: string;
  order_type: string;
  status: string;
  subtotal: number;
  total_final: number;
  created_at: string;
  member?: { name: string };
  customer?: { name: string };
  outlet?: { name: string };
  order_items: Array<{
    order_item_id: number;
    product: { name: string };
    quantity: number;
    price_at_purchase: number;
    order_item_modifiers: Array<{
      modifier: { name: string };
      price_added: number;
    }>;
  }>;
  payment: Array<{
    payment_method: string;
    status: string;
    amount: number;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  ready_for_pickup: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function ValidatePage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const renderQR = useCallback((pickupCode: string) => {
    if (qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, pickupCode, {
        width: 160,
        margin: 2,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      });
    }
  }, []);

  useEffect(() => {
    if (order?.pickup_code) {
      renderQR(order.pickup_code);
    }
  }, [order, renderQR]);

  const handleValidate = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await api.get<OrderDetail[]>(`/orders/admin?pickup_code=${trimmed}`);
      const orders = res.data;
      if (orders && orders.length > 0) {
        setOrder(orders[0]);
      } else {
        setError("No order found with this pickup code.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate code");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.order_id}/status`, { status: newStatus });
      toast.success(`Order updated to ${newStatus.replace(/_/g, " ")}`);
      setOrder({ ...order, status: newStatus });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const customerName = order?.member?.name || order?.customer?.name || "Walk-in";

  return (
    <div>
      <PageHeader title="Validate QR Ticket" description="Scan or enter a pickup code to validate an order" />

      {/* Input Section */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-full max-w-md space-y-4">
          <div className="flex gap-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter pickup code (e.g. ABC123)"
              className="text-center text-lg font-mono tracking-widest h-12"
              maxLength={6}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
            />
            <Button
              onClick={handleValidate}
              disabled={loading || !code.trim()}
              className="bg-kj-700 hover:bg-kj-800 text-white h-12 px-6"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanLine className="mr-2 h-5 w-5" />}
              Validate
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
              <XCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Order Result */}
      {order && (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Pickup Code + QR */}
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <h2 className="text-4xl font-mono font-bold tracking-widest text-kj-700">
                {order.pickup_code}
              </h2>
              <canvas ref={qrCanvasRef} />
              <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[order.status]}`}>
                {order.status.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{customerName}</span></div>
                <div><span className="text-muted-foreground">Source:</span> {order.source}</div>
                <div><span className="text-muted-foreground">Type:</span> {order.order_type}</div>
                <div><span className="text-muted-foreground">Outlet:</span> {order.outlet?.name || "—"}</div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(order.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                {order.order_items?.map((item) => (
                  <div key={item.order_item_id} className="flex justify-between py-1.5 border-b last:border-0 text-sm">
                    <div>
                      <span>{item.quantity}x {item.product?.name}</span>
                      {item.order_item_modifiers?.map((m, i) => (
                        <span key={i} className="text-xs text-muted-foreground ml-2">+{m.modifier?.name}</span>
                      ))}
                    </div>
                    <span>{formatRupiah(Number(item.price_at_purchase) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-semibold text-lg border-t pt-3">
                <span>Total</span>
                <span>{formatRupiah(Number(order.total_final))}</span>
              </div>

              {/* Payment Info */}
              {order.payment?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1 text-sm">Payment</h4>
                  {order.payment.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{p.payment_method}</span>
                      <Badge className={p.status === "success" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {order.status === "pending" && (
                  <Button
                    onClick={() => updateStatus("paid")}
                    disabled={updating}
                    className="bg-kj-700 hover:bg-kj-800 text-white flex-1 h-12 text-base"
                  >
                    {updating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    Confirm Payment
                  </Button>
                )}
                {order.status === "paid" && (
                  <Button
                    onClick={() => updateStatus("preparing")}
                    disabled={updating}
                    className="bg-kj-700 hover:bg-kj-800 text-white flex-1 h-12 text-base"
                  >
                    {updating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    Start Preparing
                  </Button>
                )}
                {order.status === "preparing" && (
                  <Button
                    onClick={() => updateStatus("ready_for_pickup")}
                    disabled={updating}
                    className="bg-kj-700 hover:bg-kj-800 text-white flex-1 h-12 text-base"
                  >
                    {updating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    Mark Ready for Pickup
                  </Button>
                )}
                {order.status === "ready_for_pickup" && (
                  <Button
                    onClick={() => updateStatus("completed")}
                    disabled={updating}
                    className="bg-kj-700 hover:bg-kj-800 text-white flex-1 h-12 text-base"
                  >
                    {updating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    Complete Order
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
