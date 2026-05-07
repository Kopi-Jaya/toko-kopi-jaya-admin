"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { useApiList } from "@/hooks/use-api";
import { useScope } from "@/lib/scope";

interface Shift {
  shift_id: number;
  start_time: string;
  end_time: string | null;
  cash_in_hand: number;
  total_cash_received: number | null;
  total_cash_out: number | null;
  final_cash: number | null;
  staff?: { name: string };
  outlet?: { name: string };
}

function formatRupiah(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function ShiftsPage() {
  const [page, setPage] = useState(1);
  const { currentOutletId } = useScope();
  const { data, meta, loading } = useApiList<Shift>("/shifts", {
    page,
    limit: 20,
    params: { outlet_id: currentOutletId ?? undefined },
  });

  const columns: Column<Shift>[] = [
    { key: "staff", header: "Staff", render: (s) => <span className="font-medium">{s.staff?.name || "—"}</span> },
    { key: "outlet", header: "Outlet", render: (s) => s.outlet?.name || "—" },
    { key: "start_time", header: "Start", render: (s) => new Date(s.start_time).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) },
    { key: "end_time", header: "End", render: (s) => s.end_time ? new Date(s.end_time).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : <Badge className="bg-green-100 text-green-800">Active</Badge> },
    { key: "cash_in_hand", header: "Opening Cash", className: "text-right", render: (s) => formatRupiah(Number(s.cash_in_hand)) },
    { key: "final_cash", header: "Closing Cash", className: "text-right", render: (s) => formatRupiah(s.final_cash) },
  ];

  return (
    <div>
      <PageHeader title="Shifts" description="Monitor staff shift activity" />
      <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={setPage} />
    </div>
  );
}
