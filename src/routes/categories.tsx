import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FolderTree, Layers, Loader2, Package, Plus, Sprout } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StaffAccessNotice } from "@/components/staff-access-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/stat-card";
import { DataTable, type Column } from "@/components/data-table";
import { useApiList } from "@/hooks/use-api-list";
import { apiErrorMessage, apiFieldErrors, ApiError } from "@/lib/api/client";
import {
  createCategoryApi,
  deleteCategoryApi,
  listCategoriesApi,
  patchCategoryApi,
} from "@/lib/api/reference";
import type { ApiCategory, CategoryType } from "@/lib/api/types";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — Agribridge" },
      { name: "description", content: "Manage the live AgriBridge product category taxonomy." },
    ],
  }),
  component: CategoriesPage,
});

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function CategoriesPage() {
  const { items, loading, error, reload } = useApiList(
    () => listCategoriesApi({ page_size: 100 }),
    [],
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ApiCategory | null>(null);
  const [formError, setFormError] = useState("");

  function openAdd() {
    setEditingCategory(null);
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(c: ApiCategory) {
    setEditingCategory(c);
    setFormError("");
    setDialogOpen(true);
  }

  async function remove(id: number) {
    try {
      await deleteCategoryApi(id);
      await reload();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? (apiErrorMessage(err.body) ?? "Delete failed.")
          : "Could not reach the server.",
      );
    }
  }

  const columns: Column<ApiCategory>[] = [
    { key: "name", header: "Name", render: (c) => c.name, exportValue: (c) => c.name },
    {
      key: "type",
      header: "Type",
      render: (c) => <Badge variant="secondary">{c.category_type}</Badge>,
      exportValue: (c) => c.category_type,
    },
    {
      key: "parent",
      header: "Parent",
      render: (c) =>
        c.parent ? (items.find((p) => p.id === c.parent)?.name ?? `#${c.parent}`) : "—",
      exportValue: (c) => (c.parent ? (items.find((p) => p.id === c.parent)?.name ?? "") : ""),
    },
    { key: "depth", header: "Depth", render: (c) => c.depth, exportValue: (c) => c.depth },
    {
      key: "leaf",
      header: "Leaf?",
      render: (c) => (c.is_leaf ? "Yes" : "No"),
      exportValue: (c) => (c.is_leaf ? "yes" : "no"),
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(c.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <AppShell
      title="Categories"
      description="Manage the live AgriBridge product category taxonomy."
      actions={
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add category
        </Button>
      }
    >
      <StaffAccessNotice />

      {formError && <ErrorBanner message={formError} />}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FolderTree} title="Total categories" value={items.length} tone="brand" />
        <StatCard
          icon={Sprout}
          title="Leaf categories"
          value={items.filter((c) => c.is_leaf).length}
          tone="success"
        />
        <StatCard
          icon={Layers}
          title="Produce"
          value={items.filter((c) => c.category_type === "produce").length}
          tone="soft"
        />
        <StatCard
          icon={Package}
          title="Inputs"
          value={items.filter((c) => c.category_type === "input").length}
          tone="warning"
        />
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DataTable
          rows={items}
          columns={columns}
          getRowId={(c) => String(c.id)}
          searchFields={(c) => `${c.name} ${c.category_type}`}
          exportFileName="categories"
          paginate
          searchPlaceholder="Search by name or type…"
          emptyMessage="No categories yet — click “Add category” to create one (staff account required)."
        />
      )}

      <CategoryDialog
        key={editingCategory?.id ?? "new"}
        categories={items}
        category={editingCategory}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => void reload()}
      />
    </AppShell>
  );
}

/* --------------------------------- Category dialog -------------------------------- */

function CategoryDialog({
  categories,
  category,
  open,
  onOpenChange,
  onSaved,
}: {
  categories: ApiCategory[];
  category: ApiCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const editingId = category?.id ?? null;

  const [name, setName] = useState(category?.name ?? "");
  const [categoryType, setCategoryType] = useState<CategoryType>(
    category?.category_type ?? "produce",
  );
  const [parentId, setParentId] = useState(category?.parent ? String(category.parent) : "none");
  const [isLeaf, setIsLeaf] = useState(category?.is_leaf ?? true);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const eligibleParents = categories.filter(
    (c) => c.category_type === categoryType && c.id !== editingId,
  );

  function resetForm() {
    setName("");
    setCategoryType("produce");
    setParentId("none");
    setIsLeaf(true);
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFieldErrors({ name: "Name is required." });
      return;
    }
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload = {
      name: name.trim(),
      category_type: categoryType,
      ...(parentId === "none" ? {} : { parent: Number(parentId) }),
      is_leaf: isLeaf,
    };
    try {
      if (editingId) await patchCategoryApi(editingId, payload);
      else await createCategoryApi(payload);
      resetForm();
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (field: string) =>
    fieldErrors[field] ? <p className="text-xs text-destructive">{fieldErrors[field]}</p> : null;

  function changeType(t: string) {
    setCategoryType(t as CategoryType);
    setParentId("none");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit category" : "Add a category"}</DialogTitle>
          <DialogDescription>
            {editingId
              ? `Updating ${category?.name ?? `#${editingId}`}. Depth is derived from the parent, so it can't be set here.`
              : "Create a category in the product taxonomy, saved to the live API (staff account required)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void submit(e)} className="grid gap-3">
          {formError && <ErrorBanner message={formError} />}

          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            {fieldError("name")}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={categoryType} onValueChange={changeType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="produce">Produce</SelectItem>
                  <SelectItem value="input">Input</SelectItem>
                </SelectContent>
              </Select>
              {fieldError("category_type")}
            </div>
            <div className="grid gap-2">
              <Label>Parent (optional)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — top level</SelectItem>
                  {eligibleParents.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldError("parent")}
            </div>
          </div>

          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <Checkbox checked={isLeaf} onCheckedChange={(v) => setIsLeaf(v === true)} />
            Leaf category
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {editingId ? "Save changes" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
