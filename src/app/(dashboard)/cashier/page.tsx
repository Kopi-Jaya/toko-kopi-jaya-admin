"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RupiahInput } from "@/components/rupiah-input";
import { useApiList } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { useScope } from "@/lib/scope";
import { toast } from "sonner";
import { Banknote, QrCode, RefreshCw, Loader2 } from "lucide-react";

interface PendingOrder {
  order_id: number;
  pickup_code: string | null;
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

interface PaymentCreateResponse {
  payment_id: number;
  status: string;
  change?: number;
}

type PaymentMethod = "tunai" | "qris";

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

function CustomerName({ order }: { order: PendingOrder }) {
  return <span>{order.member?.name ?? order.customer?.name ?? "Tamu"}</span>;
}

export default function CashierPage() {
  const { currentOutletId } = useScope();
  const [page, setPage] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  // Tunai state
  const [cashReceived, setCashReceived] = useState("");

  // QRIS state
  const [qrisPaymentId, setQrisPaymentId] = useState<number | null>(null);

  const [processing, setProcessing] = useState(false);

  const { data: orders, meta, loading, refetch } = useApiList<PendingOrder>(
    "/orders/admin",
    {
      page,
      limit: 20,
      params: {
        status: "pending",
        outlet_id: currentOutletId ?? undefined,
      },
    },
  );

  // Auto-refresh every 30 s so new walk-in orders appear without manual refresh
  useEffect(() => {
    const id = setInterval(refetch, 30_000);
    return () => clearInterval(id);
  }, [refetch]);

  function openModal(order: PendingOrder) {
    setSelectedOrder(order);
    setPaymentMethod(null);
    setCashReceived("");
    setQrisPaymentId(null);
  }

  function closeModal() {
    if (processing) return;
    setSelectedOrder(null);
    setPaymentMethod(null);
    setCashReceived("");
    setQrisPaymentId(null);
  }

  const orderTotal = selectedOrder ? Number(selectedOrder.total_final) : 0;
  const cashReceivedNum = Number(cashReceived) || 0;
  const change = cashReceivedNum >= orderTotal ? cashReceivedNum - orderTotal : 0;
  const canConfirmTunai = cashReceivedNum >= orderTotal && orderTotal > 0;

  async function handleTunaiConfirm() {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      const res = await api.post<PaymentCreateResponse>("/payments", {
        order_id: selectedOrder.order_id,
        payment_method: "Cash",
        amount: orderTotal,
        cash_received: cashReceivedNum,
      });
      const serverChange = res.data.change ?? change;
      toast.success(`Pembayaran tunai berhasil! Kembalian: ${formatRupiah(serverChange)}`);
      closeModal();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses pembayaran");
    } finally {
      setProcessing(false);
    }
  }

  async function handleSelectQris() {
    if (!selectedOrder) return;
    setPaymentMethod("qris");
    setProcessing(true);
    try {
      const res = await api.post<PaymentCreateResponse>("/payments", {
        order_id: selectedOrder.order_id,
        payment_method: "QRIS",
        amount: orderTotal,
      });
      setQrisPaymentId(res.data.payment_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat pembayaran QRIS");
      setPaymentMethod(null);
    } finally {
      setProcessing(false);
    }
  }

  async function handleQrisConfirm() {
    if (!qrisPaymentId) return;
    setProcessing(true);
    try {
      await api.patch(`/payments/${qrisPaymentId}/confirm`);
      toast.success("Pembayaran QRIS dikonfirmasi!");
      closeModal();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengkonfirmasi QRIS");
    } finally {
      setProcessing(false);
    }
  }

  const qrisImageUrl =
    process.env.NEXT_PUBLIC_QRIS_IMAGE_URL ?? "/qris-placeholder.png";

  const columns: Column<PendingOrder>[] = [
    {
      key: "order_id",
      header: "No.",
      render: (o) => <span className="font-mono text-sm">#{o.order_id}</span>,
    },
    {
      key: "customer",
      header: "Pelanggan",
      render: (o) => <CustomerName order={o} />,
    },
    {
      key: "order_type",
      header: "Tipe",
      render: (o) => (
        <Badge variant="outline" className="capitalize">
          {o.order_type.replace(/-/g, " ")}
        </Badge>
      ),
    },
    {
      key: "source",
      header: "Sumber",
      render: (o) => (
        <span className="text-sm text-muted-foreground">{o.source}</span>
      ),
    },
    {
      key: "total_final",
      header: "Total",
      render: (o) => (
        <span className="font-semibold">{formatRupiah(Number(o.total_final))}</span>
      ),
    },
    {
      key: "created_at",
      header: "Waktu",
      render: (o) => (
        <span className="text-sm text-muted-foreground">
          {new Date(o.created_at).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      render: (o) => (
        <Button size="sm" onClick={() => openModal(o)}>
          Proses Pembayaran
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Kasir" description="Pesanan menunggu pembayaran">
        <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        emptyMessage="Tidak ada pesanan menunggu pembayaran"
      />

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              Proses Pembayaran — Pesanan #{selectedOrder?.order_id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Order total summary */}
            <div className="rounded-lg bg-muted px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">Total Pembayaran</p>
              <p className="text-2xl font-bold">
                {selectedOrder ? formatRupiah(Number(selectedOrder.total_final)) : ""}
              </p>
              {selectedOrder?.member?.name && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedOrder.member.name}
                </p>
              )}
            </div>

            {/* Step 1 — choose payment method */}
            {!paymentMethod && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 text-base"
                  onClick={() => setPaymentMethod("tunai")}
                >
                  <Banknote className="h-7 w-7" />
                  Tunai
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 text-base"
                  onClick={handleSelectQris}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : (
                    <QrCode className="h-7 w-7" />
                  )}
                  QRIS
                </Button>
              </div>
            )}

            {/* Step 2a — Tunai */}
            {paymentMethod === "tunai" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cash-input">Uang Diterima</Label>
                  <div className="mt-1.5">
                    <RupiahInput
                      value={cashReceived}
                      onChange={setCashReceived}
                      placeholder="0"
                    />
                  </div>
                </div>

                {cashReceivedNum > 0 && (
                  <div
                    className={`rounded-lg px-4 py-3 text-center transition-colors ${
                      canConfirmTunai
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {canConfirmTunai ? (
                      <>
                        <p className="text-sm">Kembalian</p>
                        <p className="text-xl font-bold">{formatRupiah(change)}</p>
                      </>
                    ) : (
                      <p className="text-sm font-medium">
                        Uang kurang{" "}
                        {formatRupiah(orderTotal - cashReceivedNum)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 2b — QRIS */}
            {paymentMethod === "qris" && (
              <div className="space-y-3 text-center">
                {processing && !qrisPaymentId ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Minta pelanggan scan QRIS berikut, lalu klik{" "}
                      <strong>Konfirmasi Diterima</strong> setelah pembayaran
                      masuk.
                    </p>
                    <div className="flex justify-center">
                      <img
                        src={qrisImageUrl}
                        alt="QRIS Code"
                        className="h-52 w-52 rounded-xl border object-contain p-2"
                        onError={(e) => {
                          // Inline SVG fallback when the image fails to load
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='208' height='208'%3E%3Crect width='208' height='208' fill='%23f9fafb' rx='8'/%3E%3Ctext x='104' y='100' font-family='sans-serif' font-size='14' fill='%236b7280' text-anchor='middle'%3EQRIS%3C/text%3E%3Ctext x='104' y='120' font-family='sans-serif' font-size='10' fill='%239ca3af' text-anchor='middle'%3ESet NEXT_PUBLIC_QRIS_IMAGE_URL%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={processing}
            >
              Batal
            </Button>

            {paymentMethod === "tunai" && (
              <Button
                onClick={handleTunaiConfirm}
                disabled={!canConfirmTunai || processing}
              >
                {processing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Konfirmasi Pembayaran
              </Button>
            )}

            {paymentMethod === "qris" && qrisPaymentId && !processing && (
              <Button onClick={handleQrisConfirm}>
                Konfirmasi Diterima
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
