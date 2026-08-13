import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Store, Search, X, ArrowUp, ArrowDown, ChevronsUpDown, CalendarDays, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusChip from "@/components/StatusChip.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PER_PAGE = 10;

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Inactive" },
];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const list = [];
  let previous = 0;
  for (const page of sorted) {
    if (page - previous > 1) list.push(`ellipsis-${previous}`);
    list.push(page);
    previous = page;
  }
  return list;
}

function SortableHeader({ label, column, sort, order, onSort, className }) {
  const active = sort === column;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={`Sort by ${label}`}
        className={`inline-flex min-h-11 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
          active ? "text-green-700" : "text-green-700/60 hover:text-green-700"
        }`}
      >
        {label}
        {active ? (
          order === "desc" ? (
            <ArrowDown size={12} className="shrink-0" />
          ) : (
            <ArrowUp size={12} className="shrink-0" />
          )
        ) : (
          <ChevronsUpDown size={12} className="shrink-0 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}

export default function CoordinatorHteListPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
        sort: "id",
        order,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== "all") params.set("status", status);
      const res = await api.get(`/coordinator/htes?${params.toString()}`);
      setRows(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error("Failed to load HTEs", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, order, status]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (refreshTick > 0) loadRows();
  }, [refreshTick, loadRows]);

  function onStatusChange(value) {
    setStatus(value);
    setPage(1);
  }

  function toggleOrder() {
    setOrder((current) => (current === "desc" ? "asc" : "desc"));
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setPage(1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/coordinator/htes/${deleteTarget.uuid}`);
      toast.success("HTE deleted", { description: `${deleteTarget.name} was removed.` });
      setDeleteTarget(null);
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setRefreshTick((tick) => tick + 1);
      }
    } catch (err) {
      toast.error("Delete failed", { description: firstErrorMessage(err) });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const hasFilters = Boolean(search) || status !== "all";

  return (
    <CoordinatorLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-green-950 sm:text-3xl">HTE Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage host training establishments for your institute.</p>
        </div>
        <Button asChild className="h-11 rounded-xl bg-green-600 px-4 font-semibold text-white hover:bg-green-700">
          <Link to="/coordinator/htes/new">
            <Plus size={16} /> Add HTE
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search HTE or contact…"
            className="h-11 rounded-xl pl-10 pr-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="h-11 rounded-xl md:hidden"
          onClick={toggleOrder}
          aria-label="Toggle sort order"
        >
          {order === "desc" ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
          {order === "desc" ? "Newest first" : "Oldest first"}
        </Button>
        {hasFilters && (
          <Button variant="ghost" className="h-11 rounded-xl text-gray-500 hover:text-gray-700" onClick={clearFilters}>
            <X size={14} /> Clear filters
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <>
            <div className="space-y-2.5 p-4 md:hidden">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-gray-100 p-4 ring-1 ring-gray-100">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1.5 h-3 w-40" />
                    </div>
                    <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
                  </div>
                  <Skeleton className="mt-3 h-3 w-2/3" />
                  <div className="mt-3 flex gap-2">
                    <Skeleton className="h-10 flex-1 rounded-xl" />
                    <Skeleton className="h-10 flex-1 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-50 hover:bg-green-50">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">ID</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">HTE</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Start</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">End</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index} className="border-b border-gray-50 last:border-0">
                      <TableCell>
                        <Skeleton className="h-4 w-10" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Skeleton className="h-10 w-10 rounded-xl" />
                          <Skeleton className="h-10 w-10 rounded-xl" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Store size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No HTEs found</p>
            <p className="text-xs text-gray-400">Try adjusting your search or filters.</p>
            {hasFilters && (
              <Button variant="outline" className="mt-1 h-10 rounded-xl text-green-700" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div className="space-y-2.5 p-3 sm:p-4 md:hidden">
              {rows.map((hte) => (
                <div
                  key={hte.uuid}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="h-9 w-9 shrink-0">
                        {hte.profile_picture && <AvatarImage src={hte.profile_picture} alt={hte.contact_person} />}
                        <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                          {getInitials(hte.contact_person)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{hte.name}</p>
                        <p className="truncate text-xs text-gray-400">{hte.contact_person}</p>
                      </div>
                    </div>
                    <StatusChip status={hte.status} />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={13} className="shrink-0 text-gray-300" />
                      {formatDate(hte.start_at)} – {formatDate(hte.end_at)}
                    </span>
                    <span className="font-mono text-gray-400">#{hte.id}</span>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-gray-50 pt-3">
                    <Button
                      asChild
                      variant="outline"
                      className="h-10 flex-1 rounded-xl border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <Link to={`/coordinator/htes/${hte.uuid}/edit`}>
                        <Pencil size={15} /> Edit
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget(hte)}
                    >
                      <Trash2 size={15} /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-50 hover:bg-green-50">
                    <SortableHeader label="ID" column="id" sort="id" order={order} onSort={toggleOrder} />
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">HTE</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Start</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">End</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((hte) => (
                    <TableRow
                      key={hte.uuid}
                      className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40"
                    >
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-green-700">#{hte.id}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {hte.profile_picture && <AvatarImage src={hte.profile_picture} alt={hte.contact_person} />}
                            <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                              {getInitials(hte.contact_person)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{hte.name}</p>
                            <p className="truncate text-xs text-gray-400">{hte.contact_person}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={hte.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{formatDate(hte.start_at)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{formatDate(hte.end_at)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${hte.name}`}
                            className="h-10 w-10 rounded-xl text-gray-400 transition-colors hover:bg-green-50 hover:text-green-700 group-hover:text-gray-500"
                          >
                            <Link to={`/coordinator/htes/${hte.uuid}/edit`}>
                              <Pencil size={16} />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${hte.name}`}
                            onClick={() => setDeleteTarget(hte)}
                            className="h-10 w-10 rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 group-hover:text-gray-500"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {!loading && meta && meta.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-700">{meta.from ?? 0}</span>–
              <span className="font-semibold text-gray-700">{meta.to ?? 0}</span> of{" "}
              <span className="font-semibold text-gray-700">{meta.total}</span> HTEs
            </p>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
                {getPageList(page, meta.last_page).map((item) =>
                  typeof item === "number" ? (
                    <PaginationItem key={item}>
                      <PaginationLink
                        href="#"
                        isActive={item === page}
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(item);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page < meta.last_page) setPage(page + 1);
                    }}
                    aria-disabled={page >= meta.last_page}
                    className={page >= meta.last_page ? "pointer-events-none opacity-40" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete HTE?</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-gray-800">{deleteTarget?.name}</span> and its account will be
              permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-11 rounded-xl"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={16} /> Delete HTE
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CoordinatorLayout>
  );
}
