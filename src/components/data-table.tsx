import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, Download, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  exportValue: (row: T) => string | number;
  className?: string;
}

export interface FilterConfig<T> {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  match: (row: T, value: string) => boolean;
}

export interface SortOption<T> {
  key: string;
  label: string;
  sort: (a: T, b: T) => number;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Array<Column<T>>;
  getRowId: (row: T) => string;
  searchFields: (row: T) => string;
  filters?: Array<FilterConfig<T>> | undefined;
  sortOptions?: Array<SortOption<T>> | undefined;
  exportFileName?: string | undefined;
  toolbarActions?: ((selectedIds: string[], clear: () => void) => ReactNode) | undefined;
  emptyMessage?: string | undefined;
  initialFilters?: Record<string, string> | undefined;
  /** Enables paged rendering (default page size 10, selectable via the footer). Omit to render every filtered row, as before. */
  paginate?: boolean | undefined;
  pageSizeOptions?: number[] | undefined;
  searchPlaceholder?: string | undefined;
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchFields,
  filters = [],
  sortOptions = [],
  exportFileName = "export",
  toolbarActions,
  emptyMessage = "No records match your filters.",
  initialFilters,
  paginate = false,
  pageSizeOptions = [10, 25, 50],
  searchPlaceholder = "Search…",
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    () => initialFilters ?? {},
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>("");
  const [pageSize, setPageSize] = useState(pageSizeOptions[0] ?? 10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = rows.filter((row) => {
      if (q && !searchFields(row).toLowerCase().includes(q)) return false;
      return filters.every((f) => {
        const value = filterValues[f.key];
        if (!value || value === "all") return true;
        return f.match(row, value);
      });
    });
    if (sortKey) {
      const opt = sortOptions.find((s) => s.key === sortKey);
      if (opt) result.sort(opt.sort);
    }
    return result;
  }, [rows, query, filterValues, filters, searchFields, sortKey, sortOptions]);

  const filteredIds = filtered.map(getRowId);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.includes(id));
  const someSelected = filteredIds.some((id) => selected.includes(id));
  const selectedRows = rows.filter((r) => selected.includes(getRowId(r)));
  const activeFilterCount =
    Object.values(filterValues).filter((v) => v && v !== "all").length +
    (query ? 1 : 0) +
    (sortKey ? 1 : 0);

  const totalPages = paginate ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;

  useEffect(() => {
    setPage(1);
  }, [query, filterValues, sortKey, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = paginate ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;
  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => Math.max(1, Math.min(totalPages - 4, page - 2)) + i,
  );

  const clearSelection = () => setSelected([]);

  const toggleAll = () => {
    setSelected(
      allSelected
        ? selected.filter((id) => !filteredIds.includes(id))
        : [...new Set([...selected, ...filteredIds])],
    );
  };

  const toggleRow = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const exportCsv = () => {
    const source = selectedRows.length > 0 ? selectedRows : filtered;
    if (source.length === 0) {
      toast.error("Nothing to export", { description: "Adjust your filters and try again." });
      return;
    }
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      columns.map((c) => escape(c.header)).join(","),
      ...source.map((row) => columns.map((c) => escape(c.exportValue(row))).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${source.length} row${source.length > 1 ? "s" : ""}`, {
      description: selectedRows.length > 0 ? "Selected rows only." : "All filtered rows.",
    });
  };

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label="Search table"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <Select
              key={f.key}
              value={filterValues[f.key] ?? "all"}
              onValueChange={(v) => setFilterValues((prev) => ({ ...prev, [f.key]: v }))}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {f.label.toLowerCase()}</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {sortOptions.length > 0 && (
            <Select value={sortKey} onValueChange={(v) => setSortKey(v === "default" ? "" : v)}>
              <SelectTrigger className="h-9 w-[180px]">
                <ArrowUpDown className="size-3.5 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default order</SelectItem>
                {sortOptions.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setFilterValues({});
                setSortKey("");
              }}
            >
              <X className="size-4" /> Clear
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary-soft px-4 py-2.5">
          <span className="text-sm font-medium text-secondary-foreground">
            {selected.length} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {toolbarActions?.(selected, clearSelection)}
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear selection
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Select all rows"
                />
              </TableHead>
              {columns.map((c) => (
                <TableHead key={c.key} className={cn("whitespace-nowrap", c.className)}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((row) => {
              const id = getRowId(row);
              const isSelected = selected.includes(id);
              return (
                <TableRow
                  key={id}
                  data-state={isSelected ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => toggleRow(id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRow(id)}
                      aria-label={`Select row ${id}`}
                    />
                  </TableCell>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={c.className}>
                      {c.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {paginate ? (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Show:</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[70px]" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>of {filtered.length} records</span>
          </div>

          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                />
              </PaginationItem>
              {pageNumbers[0] && pageNumbers[0] > 1 && (
                <PaginationItem className="px-1 text-sm text-muted-foreground">…</PaginationItem>
              )}
              {pageNumbers.map((n) => (
                <PaginationItem key={n}>
                  <PaginationLink
                    href="#"
                    isActive={n === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(n);
                    }}
                  >
                    {n}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {pageNumbers.at(-1) && pageNumbers.at(-1)! < totalPages && (
                <PaginationItem className="px-1 text-sm text-muted-foreground">…</PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : (
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Showing {filtered.length} of {rows.length} records
        </div>
      )}
    </div>
  );
}
