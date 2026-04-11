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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApiList, useApiGet } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Pencil, Coins, Loader2, AlertCircle } from "lucide-react";

interface Member {
  member_id: number;
  name: string;
  email: string;
  phone_number: string;
  birthday: string | null;
  tier: string;
  current_points: number;
  lifetime_points_earned: number;
  is_active: boolean;
  created_at: string;
}

const TIER_COLORS: Record<string, string> = {
  Bronze: "bg-orange-100 text-orange-800",
  Silver: "bg-gray-100 text-gray-800",
  Gold: "bg-yellow-100 text-yellow-800",
  Platinum: "bg-purple-100 text-purple-800",
};

export default function MembersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", phone_number: "", birthday: "", tier: "", is_active: true,
  });

  // Points adjustment dialog state
  const [pointsOpen, setPointsOpen] = useState(false);
  const [pointsForm, setPointsForm] = useState({ points_change: "", description: "" });
  const [pointsLoading, setPointsLoading] = useState(false);

  const { data, meta, loading, refetch } = useApiList<Member>("/members", {
    page, limit: 20, params: { search: search || undefined, tier: tier || undefined },
  });

  const { data: detail, loading: detailLoading, error: detailError, refetch: refetchDetail } = useApiGet<Member & { orderCount?: number; points_summary?: Record<string, number> }>(
    selectedId ? `/members/${selectedId}` : null
  );

  const openEdit = () => {
    if (!detail) return;
    setEditForm({
      name: detail.name || "",
      phone_number: detail.phone_number || "",
      birthday: detail.birthday ? detail.birthday.split("T")[0] : "",
      tier: detail.tier || "Bronze",
      is_active: detail.is_active,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!detail) return;
    const body: Record<string, unknown> = {
      name: editForm.name,
      phone_number: editForm.phone_number,
      tier: editForm.tier,
      is_active: editForm.is_active,
    };
    if (editForm.birthday) body.birthday = editForm.birthday;
    await api.patch(`/members/${detail.member_id}`, body);
    toast.success("Member updated");
    refetch();
    refetchDetail();
  };

  const openPointsDialog = () => {
    setPointsForm({ points_change: "", description: "" });
    setPointsOpen(true);
  };

  const handlePointsSubmit = async () => {
    if (!detail) return;
    if (!pointsForm.points_change || Number(pointsForm.points_change) === 0) {
      toast.error("Please enter a valid points amount");
      return;
    }
    setPointsLoading(true);
    try {
      await api.post("/loyalty/adjust", {
        member_id: detail.member_id,
        points_change: Number(pointsForm.points_change),
        description: pointsForm.description || "Manual adjustment",
      });
      toast.success("Points adjusted successfully");
      setPointsOpen(false);
      refetch();
      refetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust points");
    } finally {
      setPointsLoading(false);
    }
  };

  const columns: Column<Member>[] = [
    { key: "name", header: "Name", render: (m) => <span className="font-medium">{m.name}</span> },
    { key: "email", header: "Email" },
    { key: "phone_number", header: "Phone" },
    { key: "tier", header: "Tier", render: (m) => <Badge className={TIER_COLORS[m.tier]}>{m.tier}</Badge> },
    { key: "current_points", header: "Points", className: "text-right", render: (m) => <span className="text-gold-500 font-medium">{m.current_points?.toLocaleString()}</span> },
    { key: "created_at", header: "Joined", render: (m) => new Date(m.created_at).toLocaleDateString("id-ID") },
  ];

  return (
    <div>
      <PageHeader title="Members" description="CRM — manage loyalty members" />

      <div className="flex gap-3 mb-4">
        <Input placeholder="Search name, email, phone..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-sm" />
        <Select value={tier} onValueChange={(v) => { setTier(!v || v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All tiers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="Bronze">Bronze</SelectItem>
            <SelectItem value="Silver">Silver</SelectItem>
            <SelectItem value="Gold">Gold</SelectItem>
            <SelectItem value="Platinum">Platinum</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={setPage} onRowClick={(m) => setSelectedId(m.member_id)} />

      {/* Member Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>
          {detailLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {detailError && !detailLoading && (
            <div className="flex items-center gap-2 text-sm text-destructive py-4">
              <AlertCircle className="h-4 w-4" />
              {detailError}
            </div>
          )}
          {detail && !detailLoading && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Email:</span> {detail.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {detail.phone_number}</div>
                <div><span className="text-muted-foreground">Tier:</span> <Badge className={TIER_COLORS[detail.tier]}>{detail.tier}</Badge></div>
                <div><span className="text-muted-foreground">Active:</span> {detail.is_active ? "Yes" : "No"}</div>
                <div><span className="text-muted-foreground">Current Points:</span> <span className="font-semibold text-gold-500">{detail.current_points?.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Lifetime Points:</span> {detail.lifetime_points_earned?.toLocaleString()}</div>
                <div><span className="text-muted-foreground">Total Orders:</span> {detail.orderCount ?? "\u2014"}</div>
                <div><span className="text-muted-foreground">Joined:</span> {new Date(detail.created_at).toLocaleDateString("id-ID")}</div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" onClick={openEdit} className="bg-kj-700 hover:bg-kj-800 text-white">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={openPointsDialog}>
                  <Coins className="mr-1.5 h-3.5 w-3.5" /> Adjust Points
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <CrudDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Member"
        onSubmit={handleEditSubmit}
      >
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} />
          </div>
          <div>
            <Label>Birthday</Label>
            <Input type="date" value={editForm.birthday} onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })} />
          </div>
          <div>
            <Label>Tier</Label>
            <Select value={editForm.tier} onValueChange={(v) => setEditForm({ ...editForm, tier: v || "" })}>
              <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Bronze">Bronze</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={editForm.is_active}
              onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: !!checked })}
            />
            <Label>Active</Label>
          </div>
        </div>
      </CrudDialog>

      {/* Points Adjustment Dialog */}
      <Dialog open={pointsOpen} onOpenChange={setPointsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Points for {detail?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Current Points</Label>
              <p className="text-lg font-semibold text-gold-500">{detail?.current_points?.toLocaleString()}</p>
            </div>
            <div>
              <Label>Points Change (positive to add, negative to deduct)</Label>
              <Input
                type="number"
                value={pointsForm.points_change}
                onChange={(e) => setPointsForm({ ...pointsForm, points_change: e.target.value })}
                placeholder="e.g. 100 or -50"
              />
            </div>
            <div>
              <Label>Description / Reason</Label>
              <Input
                value={pointsForm.description}
                onChange={(e) => setPointsForm({ ...pointsForm, description: e.target.value })}
                placeholder="Reason for adjustment"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPointsOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePointsSubmit}
              disabled={pointsLoading}
              className="bg-kj-700 hover:bg-kj-800 text-white"
            >
              {pointsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Adjust Points
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
