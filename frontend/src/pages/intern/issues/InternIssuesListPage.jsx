import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, X, ArrowDown, ArrowUp, ChevronsUpDown, Plus, Loader2, AlertTriangle, Pencil, Trash2, Building2, School, ShieldCheck } from "lucide-react";
import InternLayout from "@/layouts/InternLayout.jsx";
import PageHeader from "@/components/PageHeader.jsx";
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InternIssueFormDialog from "@/pages/intern/issues/InternIssueFormDialog.jsx";

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

function StatusBadge({ status }) {
  if (status === "resolve") {
    return (
      <Badge className="rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
        Resolved
      </Badge>
    );
  }
  return <Badge className="rounded-full bg-amber-50 font-semibold text-amber-700 ring-1 ring-amber-200">Pending</Badge>;
}

export default function InternIssuesListPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [hteInfo, setHteInfo] = useState(null);
  const [hteLoading, setHteLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api
      .get("/intern/issues/hte")
      .then((res) => setHteInfo(res.data.data))
      .catch(() => setHteInfo(null))
      .finally(() => setHteLoading(false));
  }, []);

  const isAssigned = Boolean(hteInfo);

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
      const res = await api.get(`/intern/issues?${params.toString()}`);
      setRows(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error("Failed to load issues", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, order, status]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

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

  const hasFilters = Boolean(search) || status !== "all";

  function openCreateDialog() {
    if (!isAssigned) {
      toast.error("Not assigned to HTE", { description: "You must be assigned to an HTE to report an issue." });
      return;
    }
    setSelectedIssue(null);
    setReadOnly(false);
    setDialogOpen(true);
  }

  function openViewDialog(issue) {
    setSelectedIssue(issue);
    setReadOnly(true);
    setDialogOpen(true);
  }

  function openEditDialog(issue) {
    setSelectedIssue(issue);
    setReadOnly(false);
    setDialogOpen(true);
  }

  function handleDialogChange(open) {
    setDialogOpen(open);
    if (!open) {
      setSelectedIssue(null);
      setReadOnly(false);
    }
  }

  function handleSaved() {
    setDialogOpen(false);
    setSelectedIssue(null);
    setReadOnly(false);
    loadRows();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/intern/issues/${deleteTarget.id}`);
      toast.success("Issue deleted", { description: `Issue #${deleteTarget.id} was removed.` });
      setDeleteTarget(null);
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadRows();
      }
    } catch (err) {
      toast.error("Delete failed", { description: firstErrorMessage(err) });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <InternLayout>
            <PageHeader
        title="Issues"
        subtitle="Track and manage issues with your HTE."
        icon={AlertTriangle}
        action={
          <Button
            className="h-11 shrink-0 rounded-xl bg-white px-4 font-semibold text-green-700 shadow-sm hover:bg-green-50 disabled:opacity-60"
            onClick={openCreateDialog}
            disabled={hteLoading}
          >
            <Plus size={16} /> Report Issue
          </Button>
        }
      />

      {hteLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !isAssigned ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 ring-1 ring-amber-200">
            <Building2 size={22} />
          </div>
          <h2 className="font-heading text-lg font-bold text-amber-900">Not yet assigned to an HTE</h2>
          <p className="max-w-md text-sm leading-relaxed text-amber-800">
            You can report issues once you are assigned to a Host Training Establishment. Contact your coordinator for
            assignment.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm ring-1 ring-green-100">
            <div className="bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 p-4 sm:p-5">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur">
                  <Building2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-100">
                    Host Training Establishment
                  </p>
                  <h3 className="mt-1 break-words font-heading text-[15px] font-bold leading-tight text-white sm:text-base">
                    {hteInfo.name}
                  </h3>
                  {hteInfo.institute && (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur">
                      <School size={12} className="shrink-0" />
                      <span className="break-words">{hteInfo.institute}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-green-50/70 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-green-700 shadow-sm ring-1 ring-green-100">
                <ShieldCheck size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-none text-green-900">Your assigned HTE</p>
                <p className="mt-1 text-xs leading-none text-green-700">Reporting concern for this placement</p>
              </div>
              {hteInfo.status && (
                <Badge className="ml-2 shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold capitalize text-green-700 ring-1 ring-green-200">
                  {hteInfo.status}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:p-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search issues..."
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
              <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-40">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolve">Resolved</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                className="h-11 rounded-xl text-gray-500 hover:text-gray-700"
                onClick={clearFilters}
              >
                <X size={14} /> Clear filters
              </Button>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
            {loading ? (
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className="bg-green-50 hover:bg-green-50">
                      <SortableHeader label="ID" column="id" sort="id" order={order} onSort={toggleOrder} />
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Issue</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                      <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4} className="h-64">
                        <Loader2 size={28} className="mx-auto animate-spin text-green-600" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : null}

            {!loading && rows.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                  <AlertTriangle size={20} />
                </div>
                <p className="text-sm font-semibold text-gray-700">No issues found</p>
                <p className="text-xs text-gray-400">Report an issue with your HTE if needed.</p>
                {hasFilters && (
                  <Button variant="outline" className="mt-1 h-10 rounded-xl text-green-700" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {!loading && rows.length > 0 && (
              <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow className="bg-green-50 hover:bg-green-50">
                      <SortableHeader label="ID" column="id" sort="id" order={order} onSort={toggleOrder} />
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Issue</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                      <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((issue) => (
                      <TableRow
                        key={issue.id}
                        className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40"
                      >
                        <TableCell>
                          <span className="font-mono text-sm font-semibold text-green-700">#{issue.id}</span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[360px] truncate text-sm text-gray-700" title={issue.issues}>
                            {issue.issues}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={issue.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {issue.status !== "resolve" ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit issue #${issue.id}`}
                                onClick={() => openEditDialog(issue)}
                                className="h-10 w-10 rounded-xl text-gray-400 transition-colors hover:bg-green-50 hover:text-green-700 group-hover:text-gray-500"
                              >
                                <Pencil size={16} />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                className="h-10 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                onClick={() => openViewDialog(issue)}
                              >
                                View
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete issue #${issue.id}`}
                              onClick={() => setDeleteTarget(issue)}
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
            )}

            {!loading && meta && meta.total > 0 && (
              <div className="flex items-center justify-center border-t border-gray-100 bg-gray-50/60 px-4 py-4">
                <Pagination className="w-auto">
                  <PaginationContent className="justify-center">
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
        </>
      )}

      <InternIssueFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        issue={selectedIssue}
        readOnly={readOnly}
        hte={hteInfo}
        onSaved={handleSaved}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete issue?</DialogTitle>
            <DialogDescription>
              Issue <span className="font-semibold text-gray-800">#{deleteTarget?.id}</span> for{" "}
              <span className="font-semibold text-gray-800">{deleteTarget?.hte_name}</span> will be permanently
              removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="h-11 rounded-xl" disabled={deleting} onClick={handleDelete}>
              {deleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} /> Delete issue
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InternLayout>
  );
}
