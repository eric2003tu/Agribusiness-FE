import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StaffAccessNotice } from "@/components/staff-access-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type Column } from "@/components/data-table";
import { useApiList } from "@/hooks/use-api-list";
import { apiErrorMessage, apiFieldErrors, ApiError } from "@/lib/api/client";
import {
  createCategoryApi,
  createCurrencyApi,
  createLanguageApi,
  createLocationApi,
  createUomApi,
  deleteCategoryApi,
  deleteCurrencyApi,
  deleteLanguageApi,
  deleteLocationApi,
  deleteUomApi,
  listCategoriesApi,
  listCurrenciesApi,
  listLanguagesApi,
  listLocationLevelsApi,
  listLocationsApi,
  listUomsApi,
  patchCategoryApi,
  patchCurrencyApi,
  patchLanguageApi,
  patchLocationApi,
  patchUomApi,
  type LocationPayload,
} from "@/lib/api/reference";
import {
  createOrganizationApi,
  createOrganizationTypeApi,
  deleteOrganizationApi,
  deleteOrganizationTypeApi,
  listOrganizationsApi,
  listOrganizationTypesApi,
  patchOrganizationApi,
  patchOrganizationTypeApi,
} from "@/lib/api/organizations";
import {
  createAddressApi,
  createContactApi,
  deleteAddressApi,
  deleteContactApi,
  listAddressesApi,
  listContactsApi,
  patchAddressApi,
  patchContactApi,
  type AddressCreatePayload,
  type ContactCreatePayload,
} from "@/lib/api/contacts";
import {
  createUserApi,
  deleteUserApi,
  listUsersApi,
  patchUserApi,
  type UserWritePayload,
} from "@/lib/api/users";
import type {
  AddressType,
  ApiAddress,
  ApiCategory,
  ApiContact,
  ApiCurrency,
  ApiLanguage,
  ApiLocationFull,
  ApiLocationLevel,
  ApiOrganizationFull,
  ApiOrganizationType,
  ApiUom,
  ApiUser,
  ContactType,
  OrganizationStatus,
  UserStatus,
} from "@/lib/api/types";

export const Route = createFileRoute("/reference-data")({
  head: () => ({
    meta: [
      { title: "Reference data — Agribridge" },
      { name: "description", content: "Manage languages, currencies, categories, units and organizations on the live API." },
    ],
  }),
  component: ReferenceDataPage,
});

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function LoadMoreButton({ hasMore, loadMore }: { hasMore: boolean; loadMore: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (!hasMore) return null;
  return (
    <div className="flex justify-center py-3">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await loadMore();
          setBusy(false);
        }}
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        Load more from server
      </Button>
    </div>
  );
}

/* --------------------------------- Languages -------------------------------- */

function LanguagesTab() {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listLanguagesApi({ page_size: 100 }),
    [],
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(l: ApiLanguage) {
    setEditingId(l.id);
    setCode(l.code);
    setName(l.name);
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setCode("");
    setName("");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    try {
      if (editingId) await patchLanguageApi(editingId, { code: code.trim(), name: name.trim() });
      else await createLanguageApi({ code: code.trim(), name: name.trim() });
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteLanguageApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiLanguage>[] = [
    { key: "code", header: "Code", render: (l) => l.code, exportValue: (l) => l.code },
    { key: "name", header: "Name", render: (l) => l.name, exportValue: (l) => l.name },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(l)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(l.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit language" : "Add a language"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input className="w-24" value={code} onChange={(e) => setCode(e.target.value)} maxLength={5} required />
            {fieldErrors["code"] && <p className="text-xs text-destructive">{fieldErrors["code"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-56" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required />
            {fieldErrors["name"] && <p className="text-xs text-destructive">{fieldErrors["name"]}</p>}
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(l) => String(l.id)}
            searchFields={(l) => `${l.code} ${l.name}`}
            exportFileName="languages"
            paginate
            searchPlaceholder="Search by code or name…"
            emptyMessage="No languages yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Currencies -------------------------------- */

function CurrenciesTab() {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listCurrenciesApi({ page_size: 100 }),
    [],
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimalPlaces, setDecimalPlaces] = useState("2");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(c: ApiCurrency) {
    setEditingId(c.id);
    setCode(c.code);
    setName(c.name);
    setSymbol(c.symbol);
    setDecimalPlaces(String(c.decimal_places));
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setCode("");
    setName("");
    setSymbol("");
    setDecimalPlaces("2");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !symbol.trim()) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload = {
      code: code.trim(),
      name: name.trim(),
      symbol: symbol.trim(),
      decimal_places: Number(decimalPlaces) || 0,
    };
    try {
      if (editingId) await patchCurrencyApi(editingId, payload);
      else await createCurrencyApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteCurrencyApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiCurrency>[] = [
    { key: "code", header: "Code", render: (c) => c.code, exportValue: (c) => c.code },
    { key: "name", header: "Name", render: (c) => c.name, exportValue: (c) => c.name },
    { key: "symbol", header: "Symbol", render: (c) => c.symbol, exportValue: (c) => c.symbol },
    {
      key: "decimals",
      header: "Decimals",
      render: (c) => c.decimal_places,
      exportValue: (c) => c.decimal_places,
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(c)}>
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
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit currency" : "Add a currency"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Code</Label>
            <Input className="w-20" value={code} onChange={(e) => setCode(e.target.value)} maxLength={3} required />
            {fieldErrors["code"] && <p className="text-xs text-destructive">{fieldErrors["code"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required />
          </div>
          <div className="grid gap-2">
            <Label>Symbol</Label>
            <Input className="w-20" value={symbol} onChange={(e) => setSymbol(e.target.value)} maxLength={5} required />
          </div>
          <div className="grid gap-2">
            <Label>Decimals</Label>
            <Input
              type="number"
              min={0}
              className="w-20"
              value={decimalPlaces}
              onChange={(e) => setDecimalPlaces(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(c) => String(c.id)}
            searchFields={(c) => `${c.code} ${c.name}`}
            exportFileName="currencies"
            paginate
            searchPlaceholder="Search by code or name…"
            emptyMessage="No currencies yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* ----------------------------- Organization types ----------------------------- */

function OrganizationTypesTab({
  items,
  loading,
  error,
  hasMore,
  loadMore,
  reload,
}: ReturnType<typeof useApiList<ApiOrganizationType>>) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(t: ApiOrganizationType) {
    setEditingId(t.id);
    setName(t.name);
    setDescription(t.description);
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload = { name: name.trim(), ...(description.trim() ? { description: description.trim() } : {}) };
    try {
      if (editingId) await patchOrganizationTypeApi(editingId, payload);
      else await createOrganizationTypeApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteOrganizationTypeApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiOrganizationType>[] = [
    { key: "name", header: "Name", render: (t) => t.name, exportValue: (t) => t.name },
    {
      key: "description",
      header: "Description",
      render: (t) => t.description || "—",
      exportValue: (t) => t.description,
    },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(t)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(t.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          {editingId ? "Edit organization type" : "Add an organization type"}
        </h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-48" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required />
            {fieldErrors["name"] && <p className="text-xs text-destructive">{fieldErrors["name"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Input className="w-64" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(t) => String(t.id)}
            searchFields={(t) => `${t.name} ${t.description}`}
            exportFileName="organization-types"
            paginate
            searchPlaceholder="Search by name…"
            emptyMessage="No organization types yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* ----------------------------- Units of measure ------------------------------ */

function UomTab() {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listUomsApi({ page_size: 100 }), []);
  const baseUnits = items.filter((u) => u.base_unit === null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [baseUnitId, setBaseUnitId] = useState<string>("none");
  const [conversionFactor, setConversionFactor] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(u: ApiUom) {
    setEditingId(u.id);
    setName(u.name);
    setSymbol(u.symbol);
    setBaseUnitId(u.base_unit ? String(u.base_unit) : "none");
    setConversionFactor(u.conversion_factor ?? "");
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setName("");
    setSymbol("");
    setBaseUnitId("none");
    setConversionFactor("");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload = {
      name: name.trim(),
      symbol: symbol.trim(),
      ...(baseUnitId === "none"
        ? {}
        : {
            base_unit: Number(baseUnitId),
            ...(conversionFactor.trim() ? { conversion_factor: conversionFactor.trim() } : {}),
          }),
    };
    try {
      if (editingId) await patchUomApi(editingId, payload);
      else await createUomApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteUomApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiUom>[] = [
    { key: "name", header: "Name", render: (u) => u.name, exportValue: (u) => u.name },
    { key: "symbol", header: "Symbol", render: (u) => u.symbol, exportValue: (u) => u.symbol },
    {
      key: "base",
      header: "Base unit",
      render: (u) => {
        if (!u.base_unit) return <Badge variant="secondary">Base unit</Badge>;
        return items.find((b) => b.id === u.base_unit)?.name ?? `#${u.base_unit}`;
      },
      exportValue: (u) => (u.base_unit ? items.find((b) => b.id === u.base_unit)?.name ?? "" : "base"),
    },
    {
      key: "factor",
      header: "Conversion factor",
      render: (u) => u.conversion_factor ?? "—",
      exportValue: (u) => u.conversion_factor ?? "",
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(u)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(u.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit unit" : "Add a unit of measure"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-40" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required />
            {fieldErrors["name"] && <p className="text-xs text-destructive">{fieldErrors["name"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Symbol</Label>
            <Input className="w-24" value={symbol} onChange={(e) => setSymbol(e.target.value)} maxLength={10} required />
          </div>
          <div className="grid gap-2">
            <Label>Base unit (optional)</Label>
            <Select value={baseUnitId} onValueChange={setBaseUnitId}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None — this is a base unit</SelectItem>
                {baseUnits.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors["base_unit"] && <p className="text-xs text-destructive">{fieldErrors["base_unit"]}</p>}
          </div>
          {baseUnitId !== "none" && (
            <div className="grid gap-2">
              <Label>Conversion factor</Label>
              <Input
                className="w-32"
                placeholder="e.g. 1000"
                value={conversionFactor}
                onChange={(e) => setConversionFactor(e.target.value)}
              />
            </div>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(u) => String(u.id)}
            searchFields={(u) => `${u.name} ${u.symbol}`}
            exportFileName="units-of-measure"
            paginate
            searchPlaceholder="Search by name or symbol…"
            emptyMessage="No units yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Categories -------------------------------- */

function CategoriesTab() {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listCategoriesApi({ page_size: 100 }),
    [],
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [categoryType, setCategoryType] = useState<"produce" | "input">("produce");
  const [parentId, setParentId] = useState<string>("none");
  const [isLeaf, setIsLeaf] = useState(true);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const eligibleParents = items.filter((c) => c.category_type === categoryType && c.id !== editingId);

  function startEdit(c: ApiCategory) {
    setEditingId(c.id);
    setName(c.name);
    setCategoryType(c.category_type);
    setParentId(c.parent ? String(c.parent) : "none");
    setIsLeaf(c.is_leaf);
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setName("");
    setCategoryType("produce");
    setParentId("none");
    setIsLeaf(true);
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
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
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteCategoryApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
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
      render: (c) => (c.parent ? items.find((p) => p.id === c.parent)?.name ?? `#${c.parent}` : "—"),
      exportValue: (c) => (c.parent ? items.find((p) => p.id === c.parent)?.name ?? "" : ""),
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
          <Button size="sm" variant="outline" onClick={() => startEdit(c)}>
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
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit category" : "Add a category"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-44" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            {fieldErrors["name"] && <p className="text-xs text-destructive">{fieldErrors["name"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={categoryType} onValueChange={(v) => { setCategoryType(v as "produce" | "input"); setParentId("none"); }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="produce">Produce</SelectItem>
                <SelectItem value="input">Input</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Parent (optional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-48">
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
            {fieldErrors["parent"] && <p className="text-xs text-destructive">{fieldErrors["parent"]}</p>}
            {fieldErrors["category_type"] && (
              <p className="text-xs text-destructive">{fieldErrors["category_type"]}</p>
            )}
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <Checkbox checked={isLeaf} onCheckedChange={(v) => setIsLeaf(v === true)} />
            Leaf category
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(c) => String(c.id)}
            searchFields={(c) => `${c.name} ${c.category_type}`}
            exportFileName="categories"
            paginate
            searchPlaceholder="Search by name…"
            emptyMessage="No categories yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* -------------------------------- Organizations -------------------------------- */

function OrganizationsTab({ orgTypes }: { orgTypes: ApiOrganizationType[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listOrganizationsApi({ page_size: 50 }),
    [],
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [orgTypeId, setOrgTypeId] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [status, setStatus] = useState<OrganizationStatus>("active");
  const [isVerified, setIsVerified] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(o: ApiOrganizationFull) {
    setEditingId(o.id);
    setName(o.name);
    setOrgTypeId(String(o.organization_type));
    setRegistrationNumber(o.registration_number ?? "");
    setTaxId(o.tax_id ?? "");
    setStatus(o.status);
    setIsVerified(o.is_verified);
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setName("");
    setOrgTypeId("");
    setRegistrationNumber("");
    setTaxId("");
    setStatus("active");
    setIsVerified(false);
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !orgTypeId) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload = {
      name: name.trim(),
      organization_type: Number(orgTypeId),
      ...(registrationNumber.trim() ? { registration_number: registrationNumber.trim() } : {}),
      ...(taxId.trim() ? { tax_id: taxId.trim() } : {}),
      status,
      is_verified: isVerified,
    };
    try {
      if (editingId) await patchOrganizationApi(editingId, payload);
      else await createOrganizationApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteOrganizationApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiOrganizationFull>[] = [
    { key: "name", header: "Name", render: (o) => o.name, exportValue: (o) => o.name },
    {
      key: "type",
      header: "Type",
      render: (o) => orgTypes.find((t) => t.id === o.organization_type)?.name ?? `#${o.organization_type}`,
      exportValue: (o) => orgTypes.find((t) => t.id === o.organization_type)?.name ?? "",
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <Badge variant={o.status === "active" ? "secondary" : "destructive"}>{o.status}</Badge>,
      exportValue: (o) => o.status,
    },
    {
      key: "verified",
      header: "Verified",
      render: (o) => (o.is_verified ? "Yes" : "No"),
      exportValue: (o) => (o.is_verified ? "yes" : "no"),
    },
    {
      key: "reliability",
      header: "Reliability",
      render: (o) => o.reliability_score,
      exportValue: (o) => o.reliability_score,
    },
    {
      key: "actions",
      header: "",
      render: (o) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(o)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(o.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit organization" : "Add an organization"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-56" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
            {fieldErrors["name"] && <p className="text-xs text-destructive">{fieldErrors["name"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={orgTypeId} onValueChange={setOrgTypeId}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={orgTypes.length ? "Select a type" : "No types yet"} />
              </SelectTrigger>
              <SelectContent>
                {orgTypes.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors["organization_type"] && (
              <p className="text-xs text-destructive">{fieldErrors["organization_type"]}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Registration number</Label>
            <Input className="w-40" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Tax ID</Label>
            <Input className="w-36" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as OrganizationStatus)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <Checkbox checked={isVerified} onCheckedChange={(v) => setIsVerified(v === true)} />
            Verified
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(o) => String(o.id)}
            searchFields={(o) => `${o.name} ${o.registration_number ?? ""} ${o.tax_id ?? ""}`}
            exportFileName="organizations"
            paginate
            searchPlaceholder="Search by name, registration number or tax id…"
            emptyMessage="No organizations yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Users (read-only) -------------------------------- */

function UsersTab({
  languages,
  locations,
  organizations,
}: {
  languages: ApiLanguage[];
  locations: ApiLocationFull[];
  organizations: ApiOrganizationFull[];
}) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(() => listUsersApi({ page_size: 50 }), []);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [preferredLanguageId, setPreferredLanguageId] = useState("");
  const [primaryLocationId, setPrimaryLocationId] = useState("none");
  const [organizationId, setOrganizationId] = useState("none");
  const [status, setStatus] = useState<UserStatus>("active");
  const [isVerified, setIsVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(u: ApiUser) {
    setEditingId(u.id);
    setPhone(u.phone);
    setFullName(u.full_name);
    setEmail(u.email ?? "");
    setNationalId(u.national_id ?? "");
    setPreferredLanguageId(String(u.preferred_language.id));
    setPrimaryLocationId(u.primary_location ? String(u.primary_location.id) : "none");
    setOrganizationId(u.organization ? String(u.organization.id) : "none");
    setStatus(u.status);
    setIsVerified(u.is_verified);
    setPassword("");
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setPhone("");
    setFullName("");
    setEmail("");
    setNationalId("");
    setPreferredLanguageId("");
    setPrimaryLocationId("none");
    setOrganizationId("none");
    setStatus("active");
    setIsVerified(false);
    setPassword("");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !fullName.trim() || !preferredLanguageId) return;
    if (!editingId && !password.trim()) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload: UserWritePayload = {
      phone: phone.trim(),
      full_name: fullName.trim(),
      preferred_language: Number(preferredLanguageId),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(nationalId.trim() ? { national_id: nationalId.trim() } : {}),
      ...(primaryLocationId === "none" ? {} : { primary_location: Number(primaryLocationId) }),
      ...(organizationId === "none" ? {} : { organization: Number(organizationId) }),
      status,
      is_verified: isVerified,
    };
    try {
      if (editingId) await patchUserApi(editingId, payload);
      else await createUserApi({ ...payload, password: password.trim() });
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteUserApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiUser>[] = [
    { key: "name", header: "Name", render: (u) => u.full_name, exportValue: (u) => u.full_name },
    { key: "phone", header: "Phone", render: (u) => u.phone, exportValue: (u) => u.phone },
    { key: "email", header: "Email", render: (u) => u.email ?? "—", exportValue: (u) => u.email ?? "" },
    {
      key: "organization",
      header: "Organization",
      render: (u) => u.organization?.name ?? "—",
      exportValue: (u) => u.organization?.name ?? "",
    },
    {
      key: "status",
      header: "Status",
      render: (u) => <Badge variant={u.status === "active" ? "secondary" : "destructive"}>{u.status}</Badge>,
      exportValue: (u) => u.status,
    },
    {
      key: "verified",
      header: "Verified",
      render: (u) => (u.is_verified ? "Yes" : "No"),
      exportValue: (u) => (u.is_verified ? "yes" : "no"),
    },
    {
      key: "reliability",
      header: "Reliability",
      render: (u) => u.reliability_score,
      exportValue: (u) => u.reliability_score,
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(u)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(u.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit user" : "Add a user"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Staff-only account management — distinct from public self-registration; this never sends an OTP.
        </p>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input className="w-40" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            {fieldErrors["phone"] && <p className="text-xs text-destructive">{fieldErrors["phone"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Full name</Label>
            <Input className="w-48" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            {fieldErrors["full_name"] && <p className="text-xs text-destructive">{fieldErrors["full_name"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input className="w-48" value={email} onChange={(e) => setEmail(e.target.value)} />
            {fieldErrors["email"] && <p className="text-xs text-destructive">{fieldErrors["email"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>National ID</Label>
            <Input className="w-40" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
            {fieldErrors["national_id"] && <p className="text-xs text-destructive">{fieldErrors["national_id"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Preferred language</Label>
            <Select value={preferredLanguageId} onValueChange={setPreferredLanguageId}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={languages.length ? "Select" : "No languages yet"} />
              </SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Primary location</Label>
            <Select value={primaryLocationId} onValueChange={setPrimaryLocationId}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Organization</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as UserStatus)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <Checkbox checked={isVerified} onCheckedChange={(v) => setIsVerified(v === true)} />
            Verified
          </label>
          {!editingId && (
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input
                className="w-40"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {fieldErrors["password"] && <p className="text-xs text-destructive">{fieldErrors["password"]}</p>}
            </div>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(u) => String(u.id)}
            searchFields={(u) => `${u.full_name} ${u.phone} ${u.email ?? ""} ${u.national_id ?? ""}`}
            exportFileName="users"
            paginate
            searchPlaceholder="Search by name, phone, email or national id…"
            emptyMessage="No users yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Locations -------------------------------- */

function LocationsTab({ currencies }: { currencies: ApiCurrency[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listLocationsApi({ page_size: 50 }),
    [],
  );
  const levelsList = useApiList(() => listLocationLevelsApi({ page_size: 100 }), []);
  const levels = levelsList.items;

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [levelId, setLevelId] = useState("");
  const [parentId, setParentId] = useState("none");
  const [isoCode, setIsoCode] = useState("");
  const [currencyId, setCurrencyId] = useState("none");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function startEdit(l: ApiLocationFull) {
    setEditingId(l.id);
    setName(l.name);
    setLevelId(String(l.level));
    setParentId(l.parent ? String(l.parent) : "none");
    setIsoCode(l.iso_code);
    setCurrencyId(l.currency ? String(l.currency) : "none");
    setLatitude(l.latitude ?? "");
    setLongitude(l.longitude ?? "");
    setFormError("");
    setFieldErrors({});
  }
  function resetForm() {
    setEditingId(null);
    setName("");
    setLevelId("");
    setParentId("none");
    setIsoCode("");
    setCurrencyId("none");
    setLatitude("");
    setLongitude("");
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !levelId) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload: LocationPayload = {
      name: name.trim(),
      level: Number(levelId),
      ...(parentId === "none" ? {} : { parent: Number(parentId) }),
      ...(isoCode.trim() ? { iso_code: isoCode.trim() } : {}),
      ...(currencyId === "none" ? {} : { currency: Number(currencyId) }),
      ...(latitude.trim() ? { latitude: latitude.trim() } : {}),
      ...(longitude.trim() ? { longitude: longitude.trim() } : {}),
    };
    try {
      if (editingId) await patchLocationApi(editingId, payload);
      else await createLocationApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await deleteLocationApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  const columns: Column<ApiLocationFull>[] = [
    { key: "name", header: "Name", render: (l) => l.name, exportValue: (l) => l.name },
    {
      key: "level",
      header: "Level",
      render: (l) => levels.find((lv) => lv.id === l.level)?.name ?? `#${l.level}`,
      exportValue: (l) => levels.find((lv) => lv.id === l.level)?.name ?? "",
    },
    {
      key: "parent",
      header: "Parent",
      render: (l) => (l.parent ? items.find((p) => p.id === l.parent)?.name ?? `#${l.parent}` : "—"),
      exportValue: (l) => (l.parent ? items.find((p) => p.id === l.parent)?.name ?? "" : ""),
    },
    { key: "iso", header: "ISO code", render: (l) => l.iso_code || "—", exportValue: (l) => l.iso_code },
    {
      key: "currency",
      header: "Currency",
      render: (l) => (l.currency ? currencies.find((c) => c.id === l.currency)?.code ?? `#${l.currency}` : "—"),
      exportValue: (l) => (l.currency ? currencies.find((c) => c.id === l.currency)?.code ?? "" : ""),
    },
    {
      key: "actions",
      header: "",
      render: (l) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => startEdit(l)}>
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void remove(l.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">{editingId ? "Edit location" : "Add a location"}</h2>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input className="w-44" value={name} onChange={(e) => setName(e.target.value)} required />
            {fieldErrors["name"] && <p className="text-xs text-destructive">{fieldErrors["name"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Level</Label>
            <Select value={levelId} onValueChange={setLevelId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={levels.length ? "Select a level" : "No levels yet"} />
              </SelectTrigger>
              <SelectContent>
                {levels.map((lv) => (
                  <SelectItem key={lv.id} value={String(lv.id)}>
                    {lv.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors["level"] && <p className="text-xs text-destructive">{fieldErrors["level"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Parent (optional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None — top level</SelectItem>
                {items
                  .filter((p) => p.id !== editingId)
                  .map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>ISO code</Label>
            <Input className="w-24" value={isoCode} onChange={(e) => setIsoCode(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Currency (optional)</Label>
            <Select value={currencyId} onValueChange={setCurrencyId}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {currencies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Latitude</Label>
            <Input className="w-28" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="-1.9441" />
          </div>
          <div className="grid gap-2">
            <Label>Longitude</Label>
            <Input className="w-28" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="30.0619" />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {editingId ? "Save changes" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {levelsList.error && <ErrorBanner message={levelsList.error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(l) => String(l.id)}
            searchFields={(l) => `${l.name} ${l.iso_code}`}
            exportFileName="locations"
            paginate
            searchPlaceholder="Search by name or ISO code…"
            emptyMessage="No locations yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* ------------------------------ Owner picker (shared) ------------------------------ */

type OwnerKind = "user" | "organization";

function OwnerPicker({
  users,
  organizations,
  ownerKind,
  setOwnerKind,
  ownerId,
  setOwnerId,
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  ownerKind: OwnerKind;
  setOwnerKind: (k: OwnerKind) => void;
  ownerId: string;
  setOwnerId: (id: string) => void;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label>Owner type</Label>
        <Select
          value={ownerKind}
          onValueChange={(v) => {
            setOwnerKind(v as OwnerKind);
            setOwnerId("");
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="organization">Organization</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{ownerKind === "user" ? "User" : "Organization"}</Label>
        <Select value={ownerId} onValueChange={setOwnerId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={`Select ${ownerKind === "user" ? "a user" : "an organization"}`} />
          </SelectTrigger>
          <SelectContent>
            {ownerKind === "user"
              ? users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.full_name} ({u.phone})
                  </SelectItem>
                ))
              : organizations.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.name}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

/* --------------------------------- Addresses -------------------------------- */

const ADDRESS_TYPES: AddressType[] = ["billing", "pickup", "farm", "warehouse"];

function AddressesTab({
  users,
  organizations,
  locations,
}: {
  users: ApiUser[];
  organizations: ApiOrganizationFull[];
  locations: ApiLocationFull[];
}) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listAddressesApi({ page_size: 50 }),
    [],
  );
  const [ownerKind, setOwnerKind] = useState<OwnerKind>("user");
  const [ownerId, setOwnerId] = useState("");
  const [addrType, setAddrType] = useState<AddressType>("farm");
  const [locationId, setLocationId] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setOwnerKind("user");
    setOwnerId("");
    setAddrType("farm");
    setLocationId("");
    setStreet("");
    setLandmark("");
    setIsDefault(false);
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId || !locationId) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload: AddressCreatePayload = {
      ...(ownerKind === "user" ? { user: Number(ownerId) } : { organization: Number(ownerId) }),
      addr_type: addrType,
      location: Number(locationId),
      ...(street.trim() ? { street: street.trim() } : {}),
      ...(landmark.trim() ? { landmark: landmark.trim() } : {}),
      is_default: isDefault,
    };
    try {
      await createAddressApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function toggleDefault(a: ApiAddress) {
    try {
      await patchAddressApi(a.id, { is_default: !a.is_default });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Update failed.") : "Could not reach the server.");
    }
  }

  async function remove(id: number) {
    try {
      await deleteAddressApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  function ownerLabel(a: ApiAddress) {
    if (a.user) return users.find((u) => u.id === a.user)?.full_name ?? `User #${a.user}`;
    if (a.organization) return organizations.find((o) => o.id === a.organization)?.name ?? `Org #${a.organization}`;
    return "—";
  }

  const columns: Column<ApiAddress>[] = [
    { key: "owner", header: "Owner", render: ownerLabel, exportValue: ownerLabel },
    {
      key: "type",
      header: "Type",
      render: (a) => <Badge variant="secondary">{a.addr_type}</Badge>,
      exportValue: (a) => a.addr_type,
    },
    {
      key: "location",
      header: "Location",
      render: (a) => locations.find((l) => l.id === a.location)?.name ?? `#${a.location}`,
      exportValue: (a) => locations.find((l) => l.id === a.location)?.name ?? "",
    },
    { key: "street", header: "Street", render: (a) => a.street || "—", exportValue: (a) => a.street },
    { key: "landmark", header: "Landmark", render: (a) => a.landmark || "—", exportValue: (a) => a.landmark },
    {
      key: "default",
      header: "Default",
      render: (a) => (
        <Button size="sm" variant={a.is_default ? "secondary" : "outline"} onClick={() => void toggleDefault(a)}>
          {a.is_default ? "Default" : "Set default"}
        </Button>
      ),
      exportValue: (a) => (a.is_default ? "yes" : "no"),
    },
    {
      key: "actions",
      header: "",
      render: (a) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => void remove(a.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Add an address</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Staff-only resource — every action here (including browsing) requires an admin session.
        </p>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={ownerKind}
            setOwnerKind={setOwnerKind}
            ownerId={ownerId}
            setOwnerId={setOwnerId}
          />
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={addrType} onValueChange={(v) => setAddrType(v as AddressType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADDRESS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={locations.length ? "Select a location" : "No locations yet"} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors["location"] && <p className="text-xs text-destructive">{fieldErrors["location"]}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Street</Label>
            <Input className="w-40" value={street} onChange={(e) => setStreet(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Landmark</Label>
            <Input className="w-40" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(v === true)} />
            Default
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(a) => String(a.id)}
            searchFields={(a) => `${ownerLabel(a)} ${a.addr_type} ${a.street} ${a.landmark}`}
            exportFileName="addresses"
            paginate
            searchPlaceholder="Search by owner, type, street or landmark…"
            emptyMessage="No addresses yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* --------------------------------- Contacts -------------------------------- */

const CONTACT_TYPES: ContactType[] = ["phone", "whatsapp", "email"];

function ContactsTab({ users, organizations }: { users: ApiUser[]; organizations: ApiOrganizationFull[] }) {
  const { items, loading, error, hasMore, loadMore, reload } = useApiList(
    () => listContactsApi({ page_size: 50 }),
    [],
  );
  const [ownerKind, setOwnerKind] = useState<OwnerKind>("user");
  const [ownerId, setOwnerId] = useState("");
  const [contactType, setContactType] = useState<ContactType>("phone");
  const [value, setValue] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setOwnerKind("user");
    setOwnerId("");
    setContactType("phone");
    setValue("");
    setIsPrimary(false);
    setFormError("");
    setFieldErrors({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId || !value.trim()) return;
    setBusy(true);
    setFormError("");
    setFieldErrors({});
    const payload: ContactCreatePayload = {
      ...(ownerKind === "user" ? { user: Number(ownerId) } : { organization: Number(ownerId) }),
      contact_type: contactType,
      value: value.trim(),
      is_primary: isPrimary,
    };
    try {
      await createContactApi(payload);
      resetForm();
      await reload();
    } catch (err) {
      const body = err instanceof ApiError ? err.body : null;
      setFormError(apiErrorMessage(body) ?? "Could not reach the server.");
      setFieldErrors(apiFieldErrors(body));
    } finally {
      setBusy(false);
    }
  }

  async function toggleVerified(c: ApiContact) {
    try {
      await patchContactApi(c.id, { is_verified: !c.is_verified });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Update failed.") : "Could not reach the server.");
    }
  }

  async function remove(id: number) {
    try {
      await deleteContactApi(id);
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? (apiErrorMessage(err.body) ?? "Delete failed.") : "Could not reach the server.");
    }
  }

  function ownerLabel(c: ApiContact) {
    if (c.user) return users.find((u) => u.id === c.user)?.full_name ?? `User #${c.user}`;
    if (c.organization) return organizations.find((o) => o.id === c.organization)?.name ?? `Org #${c.organization}`;
    return "—";
  }

  const columns: Column<ApiContact>[] = [
    { key: "owner", header: "Owner", render: ownerLabel, exportValue: ownerLabel },
    {
      key: "type",
      header: "Type",
      render: (c) => <Badge variant="secondary">{c.contact_type}</Badge>,
      exportValue: (c) => c.contact_type,
    },
    { key: "value", header: "Value", render: (c) => c.value, exportValue: (c) => c.value },
    {
      key: "primary",
      header: "Primary",
      render: (c) => (c.is_primary ? "Yes" : "No"),
      exportValue: (c) => (c.is_primary ? "yes" : "no"),
    },
    {
      key: "verified",
      header: "Verified",
      render: (c) => (
        <Button size="sm" variant={c.is_verified ? "secondary" : "outline"} onClick={() => void toggleVerified(c)}>
          {c.is_verified ? "Verified" : "Mark verified"}
        </Button>
      ),
      exportValue: (c) => (c.is_verified ? "yes" : "no"),
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => void remove(c.id)}>
            Delete
          </Button>
        </div>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Add a contact</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Staff-only resource — every action here (including browsing) requires an admin session.
        </p>
        <ErrorBanner message={formError} />
        <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={submit}>
          <OwnerPicker
            users={users}
            organizations={organizations}
            ownerKind={ownerKind}
            setOwnerKind={setOwnerKind}
            ownerId={ownerId}
            setOwnerId={setOwnerId}
          />
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={contactType} onValueChange={(v) => setContactType(v as ContactType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Value</Label>
            <Input
              className="w-56"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={contactType === "email" ? "name@example.com" : "+2507..."}
              required
            />
            {fieldErrors["value"] && <p className="text-xs text-destructive">{fieldErrors["value"]}</p>}
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
            <Checkbox checked={isPrimary} onCheckedChange={(v) => setIsPrimary(v === true)} />
            Primary
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </form>
      </section>

      {error && <ErrorBanner message={error} />}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <DataTable
            rows={items}
            columns={columns}
            getRowId={(c) => String(c.id)}
            searchFields={(c) => `${ownerLabel(c)} ${c.contact_type} ${c.value}`}
            exportFileName="contacts"
            paginate
            searchPlaceholder="Search by owner, type or value…"
            emptyMessage="No contacts yet."
          />
          <LoadMoreButton hasMore={hasMore} loadMore={loadMore} />
        </>
      )}
    </div>
  );
}

/* ----------------------------------- Page ----------------------------------- */

function ReferenceDataPage() {
  const orgTypesList = useApiList(() => listOrganizationTypesApi({ page_size: 100 }), []);
  const currenciesList = useApiList(() => listCurrenciesApi({ page_size: 100 }), []);
  const organizationsList = useApiList(() => listOrganizationsApi({ page_size: 100 }), []);
  const usersList = useApiList(() => listUsersApi({ page_size: 100 }), []);
  const locationsList = useApiList(() => listLocationsApi({ page_size: 100 }), []);
  const languagesList = useApiList(() => listLanguagesApi({ page_size: 100 }), []);

  return (
    <AppShell
      title="Reference data"
      description="Manage the live API's lookup tables and organizations directly."
    >
      <StaffAccessNotice />
      <Tabs defaultValue="languages">
        <TabsList className="flex-wrap">
          <TabsTrigger value="languages">Languages</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="org-types">Organization types</TabsTrigger>
          <TabsTrigger value="uoms">Units of measure</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="languages">
          <LanguagesTab />
        </TabsContent>
        <TabsContent value="currencies">
          <CurrenciesTab />
        </TabsContent>
        <TabsContent value="org-types">
          <OrganizationTypesTab {...orgTypesList} />
        </TabsContent>
        <TabsContent value="uoms">
          <UomTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="organizations">
          <OrganizationsTab orgTypes={orgTypesList.items} />
        </TabsContent>
        <TabsContent value="locations">
          <LocationsTab currencies={currenciesList.items} />
        </TabsContent>
        <TabsContent value="addresses">
          <AddressesTab
            users={usersList.items}
            organizations={organizationsList.items}
            locations={locationsList.items}
          />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsTab users={usersList.items} organizations={organizationsList.items} />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab
            languages={languagesList.items}
            locations={locationsList.items}
            organizations={organizationsList.items}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
