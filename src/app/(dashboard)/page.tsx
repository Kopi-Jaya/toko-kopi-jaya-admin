"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { useScope } from "@/lib/scope";
import { toast } from "sonner";
import {
  ShoppingCart,
  Users,
  Coffee,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface SalesBySource {
  source: string;
  total_orders: number;
  total_revenue: number;
}

interface ProductPerformance {
  name: string;
  total_quantity_sold: number;
  total_revenue: number;
}

interface MemberLoyalty {
  member_id: number;
  name: string;
  tier: string;
  lifetime_points_earned: number;
  current_points: number;
}

const CHART_COLORS = ["#B32F2F", "#D95C5C", "#FBC02D", "#1976D2", "#E64A19", "#E88A8A", "#FF7043"];

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

export default function DashboardPage() {
  const [salesBySource, setSalesBySource] = useState<SalesBySource[]>([]);
  const [productPerf, setProductPerf] = useState<ProductPerformance[]>([]);
  const [memberLoyalty, setMemberLoyalty] = useState<MemberLoyalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { currentOutletId } = useScope();

  const fetchData = useCallback(() => {
    setLoading(true);
    const dateParams = new URLSearchParams();
    if (dateFrom) dateParams.set("date_from", dateFrom);
    if (dateTo) dateParams.set("date_to", dateTo);
    if (currentOutletId !== null) dateParams.set("outlet_id", String(currentOutletId));
    const qs = dateParams.toString();
    const suffix = qs ? `?${qs}` : "";
    const limitParams = new URLSearchParams(dateParams);
    limitParams.set("limit", "10");
    const limitSuffix = `?${limitParams.toString()}`;

    Promise.all([
      api.get<SalesBySource[]>(`/analytics/sales-by-source${suffix}`),
      api.get<ProductPerformance[]>(`/analytics/product-performance${limitSuffix}`),
      api.get<MemberLoyalty[]>(`/analytics/member-loyalty${limitSuffix}`),
    ])
      .then(([sales, products, members]) => {
        setSalesBySource(sales.data.map((r: SalesBySource) => ({
          ...r,
          total_orders: Number(r.total_orders),
          total_revenue: Number(r.total_revenue),
        })));
        setProductPerf(products.data.map((r: ProductPerformance) => ({
          ...r,
          total_quantity_sold: Number(r.total_quantity_sold),
          total_revenue: Number(r.total_revenue),
        })));
        setMemberLoyalty(members.data.map((r: MemberLoyalty) => ({
          ...r,
          lifetime_points_earned: Number(r.lifetime_points_earned),
          current_points: Number(r.current_points),
        })));
      })
      .catch((err) => {
        console.error("Analytics fetch failed:", err);
        toast.error("Failed to load analytics data");
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, currentOutletId]);

  useEffect(() => {
    // Microtask defers the chained setState calls inside fetchData out of
    // React's commit phase — fixes react-hooks/set-state-in-effect.
    queueMicrotask(() => {
      fetchData();
    });
  }, [fetchData]);

  const totalOrders = salesBySource.reduce((s, r) => s + (Number(r.total_orders) || 0), 0);
  const totalRevenue = salesBySource.reduce((s, r) => s + (Number(r.total_revenue) || 0), 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of sales, products, and members"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
          </div>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <KpiCard icon={ShoppingCart} label="Total Orders" value={totalOrders} loading={loading} />
        <KpiCard icon={TrendingUp} label="Total Revenue" value={formatRupiah(totalRevenue)} loading={loading} />
        <KpiCard icon={Coffee} label="Active Products" value={productPerf.length} loading={loading} />
        <KpiCard icon={Users} label="Members" value={memberLoyalty.length} loading={loading} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {salesBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={salesBySource}
                    dataKey="total_revenue"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name }: { name?: string }) => name ?? ""}
                  >
                    {salesBySource.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No sales data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {productPerf.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productPerf} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                  <Bar dataKey="total_revenue" fill="#B32F2F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No product data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Loyalty Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top Members by Loyalty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Tier</th>
                    <th className="pb-2 font-medium text-right">Lifetime Points</th>
                    <th className="pb-2 font-medium text-right">Current Points</th>
                  </tr>
                </thead>
                <tbody>
                  {memberLoyalty.map((m) => (
                    <tr key={m.member_id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{m.name}</td>
                      <td className="py-2">
                        <TierBadge tier={m.tier} />
                      </td>
                      <td className="py-2 text-right">{m.lifetime_points_earned?.toLocaleString()}</td>
                      <td className="py-2 text-right">{m.current_points?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {memberLoyalty.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No members yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, loading }: { icon: React.ElementType; label: string; value: string | number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-kj-50">
          <Icon className="h-6 w-6 text-kj-700" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="h-7 w-20 animate-pulse rounded bg-muted" />
          ) : (
            <p className="text-2xl font-semibold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    Bronze: "bg-orange-100 text-orange-800",
    Silver: "bg-gray-100 text-gray-800",
    Gold: "bg-yellow-100 text-yellow-800",
    Platinum: "bg-purple-100 text-purple-800",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[tier] || "bg-gray-100 text-gray-600"}`}>
      {tier}
    </span>
  );
}
