import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  School,
} from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import RequirementFormDialog from "@/pages/admin/requirements/RequirementFormDialog.jsx";
import { statusLabel, statusOptions, statusTone, toActiveValue, typeLabel, typeOptions, typeTone } from "@/pages/admin/requirements/constants.js";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function TypePill({ type }) {
  return (
    <Badge className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${typeTone[type] || "bg-gray-50 text-gray-600 ring-gray-200"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {typeLabel[type] || type}
    </Badge>
  );
}

function StatusPill({ status }) {
  return (
    <Badge
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${
        statusTone[status] || statusTone.inactive
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel[status] || status}
    </Badge>
  );
}

export default function RequirementListPage() {
  const [requirements, setRequirements] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [institutes, setInstitutes] = useState([]);
  const [instituteFilter, setInstituteFilter] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/institutes?per_page=100");
        if (!cancelled) setInstitutes(res.data.data);
      } catch {
        // Institute options are optional; the list still loads.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadRequirements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
        sort: "id",
        order,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (instituteFilter !== "all") params.set("institute_id", instituteFilter);
      if (type !== "all") params.set("type", type);
      if (status !== "all") params.set("status", status);
      const res = await api.get(`/requirements?${params.toString()}`);
      setRequirements(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error("Failed to load requirements", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, instituteFilter, type, status, debouncedSearch, order]);

  useEffect(() => {
    loadRequirements();
  }, [loadRequirements]);

  useEffect(() => {
    if (refreshTick > 0) loadRequirements();
  }, [refreshTick, loadRequirements]);

  function onInstituteChange(value) {
    setInstituteFilter(value);
    setPage(1);
  }

  function onTypeChange(value) {
    setType(value);
    setPage(1);
  }

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
    setInstituteFilter("all");
    setType("all");
    setStatus("all");
    setPage(1);
  }

  function openCreate() {
    setEditingRequirement(null);
    setDialogOpen(true);
  }

  function openEdit(requirement) {
    setEditingRequirement(requirement);
    setDialogOpen(true);
  }

  function handleSaved() {
    setDialogOpen(false);
    setEditingRequirement(null);
    setRefreshTick((tick) => tick + 1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/requirements/${deleteTarget.id}`);
      toast.success("Requirement deleted", { description: `${deleteTarget.name} was removed.` });
      setDeleteTarget(null);
      if (requirements.length === 1 && page > 1) {
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

  const hasFilters = Boolean(search) || instituteFilter !== "all" || type !== "all" || status !== "all";

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-green-950 sm:text-3xl">Requirements</h1>
          <p className="mt-1 text-sm text-gray-500">OJT requirements per institute, pre or post deployment.</p>
        </div>
        <Button className="h-11 rounded-xl bg-green-600 px-4 font-semibold text-white hover:bg-green-700" onClick={openCreate}>
          <Plus size={16} /> Add Requirement
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or description…"
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
        <Select value={instituteFilter} onValueChange={onInstituteChange}>
          <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-56">
            <SelectValue placeholder="All institutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All institutes</SelectItem>
            {institutes.map((institute) => (
              <SelectItem key={institute.id} value={String(institute.id)}>
                {institute.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
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
            <div className="md:hidden">
              <PageLoader />
            </div>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-50 hover:bg-green-50">
                    <SortableHeader label="ID" column="id" sort="id" order={order} onSort={toggleOrder} />
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Requirement</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Institute</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Type</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="h-64">
                      <Loader2 size={28} className="mx-auto animate-spin text-green-600" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}

        {!loading && requirements.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <ClipboardList size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No requirements found</p>
            <p className="text-xs text-gray-400">Try adjusting your search or filters.</p>
            {hasFilters && (
              <Button variant="outline" className="mt-1 h-10 rounded-xl text-green-700" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {!loading && requirements.length > 0 && (
          <>
            <div className="space-y-2.5 p-3 sm:p-4 md:hidden">
              {requirements.map((requirement) => (
                <div
                  key={requirement.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-gray-400">#{requirement.id}</span>
                    <div className="flex items-center gap-1.5">
                      <TypePill type={requirement.type} />
                      <StatusPill status={toActiveValue(requirement.is_active)} />
                    </div>
                  </div>
                  <p className="mt-2.5 truncate text-sm font-semibold text-gray-900">{requirement.name}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-500">
                    <School size={13} className="shrink-0 text-gray-300" />
                    {requirement.institute?.name || "—"}
                  </p>
                  <div className="mt-3 flex gap-2 border-t border-gray-50 pt-3">
                    <Button
                      variant="outline"
                      className="h-10 flex-1 rounded-xl border-green-200 text-green-700 hover:bg-green-50"
                      onClick={() => openEdit(requirement)}
                    >
                      <Pencil size={15} /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 flex-1 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget(requirement)}
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
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Requirement</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Institute</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Type</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.map((requirement) => (
                    <TableRow
                      key={requirement.id}
                      className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40"
                    >
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-green-700">#{requirement.id}</span>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold text-gray-900">{requirement.name}</p>
                        {requirement.description && (
                          <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-gray-400">{requirement.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                          <School size={14} className="text-gray-300" />
                          {requirement.institute?.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <TypePill type={requirement.type} />
                      </TableCell>
                      <TableCell>
                        <StatusPill status={toActiveValue(requirement.is_active)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${requirement.name}`}
                            onClick={() => openEdit(requirement)}
                            className="h-10 w-10 rounded-xl text-gray-400 transition-colors hover:bg-green-50 hover:text-green-700 group-hover:text-gray-500"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${requirement.name}`}
                            onClick={() => setDeleteTarget(requirement)}
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
              <span className="font-semibold text-gray-700">{meta.total}</span> requirements
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

      <RequirementFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        requirement={editingRequirement}
        institutes={institutes}
        onSaved={handleSaved}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete requirement?</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-gray-800">{deleteTarget?.name}</span> will be permanently removed.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-11 rounded-xl" disabled={deleting} onClick={handleDelete}>
              {deleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={16} /> Delete requirement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
