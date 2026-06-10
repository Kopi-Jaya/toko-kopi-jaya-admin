"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type Column } from "@/components/data-table";
import { CrudDialog } from "@/components/crud-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useApiList } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { toast } from "sonner";
import Image from "next/image";
import { Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { toProxyImageUrl } from "@/lib/image-url";

interface EventItem {
  event_id: number;
  outlet_id: number | null;
  outlet?: { outlet_id: number; name: string } | null;
  title: string;
  description: string | null;
  img_url: string | null;
  tag: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const emptyForm = {
  title: "",
  description: "",
  tag: "",
  start_date: "",
  end_date: "",
  is_active: true,
};

export default function EventsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);

  const { data, loading, refetch } = useApiList<EventItem>("/events");

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setImageFile(null);
    setImagePreview(null);
    setDialogOpen(true);
  };

  const openEdit = (e: EventItem) => {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description || "",
      tag: e.tag || "",
      start_date: e.start_date,
      end_date: e.end_date,
      is_active: e.is_active,
    });
    setImageFile(null);
    setImagePreview(e.img_url ? toProxyImageUrl(e.img_url) : null);
    setDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    try {
      const body = {
        title: form.title,
        description: form.description || undefined,
        tag: form.tag || undefined,
        start_date: form.start_date,
        end_date: form.end_date,
        is_active: form.is_active,
      };

      let savedId: number;
      if (editing) {
        await api.patch(`/events/${editing.event_id}`, body);
        savedId = editing.event_id;
        toast.success("Event updated");
      } else {
        const res = await api.post<EventItem>("/events", body);
        savedId = res.data.event_id;
        toast.success("Event created");
      }

      if (imageFile) {
        setUploadingImage(true);
        try {
          const fd = new FormData();
          fd.append("file", imageFile);
          await api.upload(`/events/${savedId}/image`, fd);
        } catch {
          toast.error("Event saved but image upload failed");
        } finally {
          setUploadingImage(false);
        }
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
      await api.delete(`/events/${deleteTarget.id}`);
      toast.success("Event deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      throw err;
    }
  };

  const columns: Column<EventItem>[] = [
    {
      key: "img",
      header: "",
      className: "w-14",
      render: (e) =>
        e.img_url ? (
          <Image
            src={toProxyImageUrl(e.img_url)}
            alt={e.title}
            width={40}
            height={40}
            className="rounded-md object-cover h-10 w-10"
          />
        ) : (
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        ),
    },
    { key: "title", header: "Title", render: (e) => <span className="font-medium">{e.title}</span> },
    { key: "tag", header: "Tag", render: (e) => e.tag ? <Badge variant="outline">{e.tag}</Badge> : "—" },
    {
      key: "dates",
      header: "Period",
      render: (e) => (
        <span className="text-sm text-muted-foreground">
          {e.start_date} → {e.end_date}
        </span>
      ),
    },
    {
      key: "outlet",
      header: "Outlet",
      render: (e) => e.outlet?.name ?? <span className="text-muted-foreground italic">All outlets</span>,
    },
    {
      key: "is_active",
      header: "Status",
      render: (e) => (
        <Badge
          variant="outline"
          className={e.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}
        >
          {e.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (e) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={(ev) => { ev.stopPropagation(); setDeleteTarget({ id: e.event_id, label: e.title }); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Events & Promos" description="Manage promo banners shown on the mobile app">
        <Button onClick={openCreate} className="bg-kj-700 hover:bg-kj-800 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </PageHeader>

      <DataTable columns={columns} data={data} loading={loading} />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.label}"?`}
        description="This event will be removed from the mobile app."
        onConfirm={handleDelete}
      />

      <CrudDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Event" : "Add Event"}
        onSubmit={handleSubmit}
      >
        <div className="space-y-3">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label>Tag (e.g. TERBATAS, EKSKLUSIF)</Label>
            <Input
              value={form.tag}
              onChange={(e) => setForm({ ...form, tag: e.target.value })}
              maxLength={50}
              placeholder="Optional short label"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>End Date *</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Image upload */}
          <div>
            <Label>Banner Image</Label>
            <div className="mt-1 flex items-center gap-3">
              {imagePreview && (
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={80}
                  height={48}
                  className="rounded-md object-cover h-12 w-20"
                />
              )}
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-foreground transition-colors">
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {imagePreview ? "Change image" : "Upload image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="evt_is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="evt_is_active">Active</Label>
          </div>
        </div>
      </CrudDialog>
    </div>
  );
}
