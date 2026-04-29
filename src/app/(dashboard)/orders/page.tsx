"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiList, useApiGet } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import QRCode from "qrcode";

interface Order {
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
}

interface OrderDetail extends Order {
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

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const { data, meta, loading, refetch } = useApiList<Order>("/orders/admin", {
    page,
    limit: 20,
    params: {
      status: status || undefined,
      source: source || undefined,
    },
  });

  const { data: detail, loading: detailLoading } = useApiGet<OrderDetail>(
    selectedId ? `/orders/${selectedId}` : null
  );

  // React Compiler infers `detail` as the dependency (more conservative
  // than the manual `detail?.pickup_code`); inline the QR render so the
  // compiler can memoize without complaining.
  useEffect(() => {
    if (qrCanvasRef.current && detail?.pickup_code) {
      QRCode.toCanvas(qrCanvasRef.current, detail.pickup_code, {
        width: 128,
        margin: 2,
        color: { dark: "#1a1a1a", light: "#ffffff" },
      });
    }
  }, [detail?.pickup_code]);

  const updateStatus = async (orderId: number, newStatus: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order updated to ${newStatus}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const columns: Column<Order>[] = [
    {
      key: "pickup_code",
      header: "Code",
      render: (o) => (
        <span className="font-mono font-semibold text-kj-700">{o.pickup_code}</span>
      ),
    },
    {
      key: "customer_name",
      header: "Customer",
      render: (o) => o.member?.name || o.customer?.name || "\u2014",
    },
    { key: "source", header: "Source" },
    { key: "order_type", header: "Type" },
    {
      key: "status",
      header: "Status",
      render: (o) => (
        <Badge variant="outline" className={STATUS_COLORS[o.status]}>
          {o.status.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "total_final",
      header: "Total",
      className: "text-right",
      render: (o) => formatRupiah(Number(o.total_final)),
    },
    {
      key: "created_at",
      header: "Date",
      render: (o) => new Date(o.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    },
    {
      key: "actions",
      header: "Actions",
      render: (o) => {
        const next = STATUS_TRANSITIONS[o.status];
        if (!next?.length) return null;
        return (
          <div className="flex gap-1">
            {next.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === "cancelled" ? "destructive" : "outline"}
                onClick={(e) => { e.stopPropagation(); updateStatus(o.order_id, s); }}
                className="text-xs h-7"
              >
                {s === "cancelled" ? "Cancel" : s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Orders" description="Manage and track all orders">
        <Link href="/orders/create">
          <Button className="bg-kj-700 hover:bg-kj-800 text-white">
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
        </Link>
      </PageHeader>

      <div className="flex gap-3 mb-4">
        <Select value={status} onValueChange={(v) => { setStatus(!v || v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready_for_pickup">Ready</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(v) => { setSource(!v || v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="Mobile App">Mobile App</SelectItem>
            <SelectItem value="POS - In-Store">POS In-Store</SelectItem>
            <SelectItem value="POS - GoFood">GoFood</SelectItem>
            <SelectItem value="POS - GrabFood">GrabFood</SelectItem>
            <SelectItem value="POS - ShopeeFood">ShopeeFood</SelectItem>
            <SelectItem value="Admin Dashboard">Dashboard</SelectItem>
            <SelectItem value="Kiosk">Kiosk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onRowClick={(o) => setSelectedId(o.order_id)}
      />

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{detail?.pickup_code}</DialogTitle>
          </DialogHeader>
          {detailLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {detail && !detailLoading && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_COLORS[detail.status]}>{detail.status}</Badge></div>
                <div><span className="text-muted-foreground">Source:</span> {detail.source}</div>
                <div><span className="text-muted-foreground">Type:</span> {detail.order_type}</div>
                <div><span className="text-muted-foreground">Outlet:</span> {detail.outlet?.name}</div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                {detail.order_items?.map((item) => (
                  <div key={item.order_item_id} className="flex justify-between py-1 border-b last:border-0">
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

              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Total</span>
                <span>{formatRupiah(Number(detail.total_final))}</span>
              </div>

              {detail.payment?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1">Payment</h4>
                  {detail.payment.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{p.payment_method}</span>
                      <Badge className={p.status === "success" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2 border-t pt-4">
                <canvas ref={qrCanvasRef} />
                <span className="font-mono text-lg font-bold text-kj-700 tracking-widest">{detail.pickup_code}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
