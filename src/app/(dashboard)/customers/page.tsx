"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { useApiList } from "@/hooks/use-api";

interface Customer {
  customer_id: number;
  name: string;
  phone_number: string;
  created_at: string;
}

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const { data, meta, loading } = useApiList<Customer>("/customers", { page, limit: 20 });

  const columns: Column<Customer>[] = [
    { key: "name", header: "Name", render: (c) => <span className="font-medium">{c.name || "Anonymous"}</span> },
    { key: "phone_number", header: "Phone", render: (c) => c.phone_number || "—" },
    { key: "created_at", header: "First Visit", render: (c) => new Date(c.created_at).toLocaleDateString("id-ID") },
  ];

  return (
    <div>
      <PageHeader title="Customers" description="Walk-in and anonymous customers" />
      <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={setPage} />
    </div>
  );
}
