import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Search,
  X,
} from "lucide-react";
import HteLayout from "@/layouts/HteLayout.jsx";
import PageHeader from "@/components/PageHeader.jsx";
import TransferStatusChip from "@/components/TransferStatusChip.jsx";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageLoader from "@/components/PageLoader";
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

const STATUS_OPTIONS = [
  { value: "requested", label: "Awaiting acceptance" },
  { value: "accepted", label: "Evaluating" },
  { value: "evaluated", label: "Ready to reassign" },
  { value: "reassigned", label: "Reassigned" },
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

function ProgressPill({ label, progress, tone }) {
  const complete = progress?.complete;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        complete ? "bg-green-50 text-green-700 ring-1 ring-green-200" : tone
      }`}
    >
      {complete && <CheckCircle2 size={11} />}
      {label} {progress?.answered ?? 0}/{progress?.total ?? 0}
    </span>
  );
}

export default function HteTransferRequestsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [acceptingUuid, setAcceptingUuid] = useState("");

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
      const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== "active") params.set("status", status);
      const res = await api.get(`/hte/transfer-requests?${params.toString()}`);
      setRows(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error("Failed to load transfer requests", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  async function acceptTransfer(transfer) {
    if (acceptingUuid) return;
    setAcceptingUuid(transfer.uuid);
    try {
      await api.post(`/hte/transfer-requests/${transfer.uuid}/accept`);
      toast.success("Transfer accepted", {
        description: `You can now evaluate ${transfer.intern?.name || "the intern"}.`,
      });
      await loadRows();
    } catch (err) {
      toast.error("Accept failed", { description: firstErrorMessage(err) });
    } finally {
      setAcceptingUuid("");
    }
  }

  function clearFilters() {
    setSearch("");
    setStatus("active");
    setPage(1);
  }

  const hasFilters = Boolean(search) || status !== "active";

  return (
    <HteLayout>
      <PageHeader
        title="Transfer Requests"
        subtitle="Transfers requested from your establishment."
        icon={ArrowLeftRight}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search intern..."
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
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-56">
            <SelectValue placeholder="Active requests" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active requests</SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Intern</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Requested by</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Requested</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="h-64">
                      <Loader2 size={28} className="mx-auto animate-spin text-green-600" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <ArrowLeftRight size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No transfer requests</p>
            <p className="text-xs text-gray-400">
              {hasFilters ? "Try adjusting your search or filters." : "Nothing needs your attention right now."}
            </p>
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
              {rows.map((transfer) => (
                <div
                  key={transfer.uuid}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                          {getInitials(transfer.intern?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{transfer.intern?.name || "Unknown"}</p>
                        <p className="truncate text-xs text-gray-400">{transfer.intern?.program || "—"}</p>
                      </div>
                    </div>
                    <TransferStatusChip status={transfer.status} />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Requested by {transfer.requested_by || "—"} · {formatDate(transfer.created_at)}
                  </p>

                  {transfer.status === "accepted" && transfer.progress && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <ProgressPill
                        label="Your evaluation"
                        progress={transfer.progress.intern}
                        tone="bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      />
                      <ProgressPill
                        label="Intern's evaluation"
                        progress={transfer.progress.hte}
                        tone="bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                      />
                    </div>
                  )}

                  {transfer.reason && (
                    <p className="mt-2 line-clamp-2 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
                      {transfer.reason}
                    </p>
                  )}

                  {transfer.status === "requested" && (
                    <div className="mt-3 border-t border-gray-50 pt-3">
                      <Button
                        className="h-11 w-full rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
                        onClick={() => acceptTransfer(transfer)}
                        disabled={Boolean(acceptingUuid)}
                      >
                        {acceptingUuid === transfer.uuid ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        Accept transfer
                      </Button>
                    </div>
                  )}

                  {transfer.status === "accepted" && (
                    <div className="mt-3 border-t border-gray-50 pt-3">
                      <Button asChild className="h-11 w-full rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700">
                        <Link to={`/hte/evaluations/${transfer.intern?.uuid}`}>
                          <ClipboardCheck size={15} />
                          Evaluate intern
                        </Link>
                      </Button>
                    </div>
                  )}

                  {transfer.status === "evaluated" && (
                    <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
                      Evaluations complete — waiting for the coordinator to reassign.
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-50 hover:bg-green-50">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Intern</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Requested by</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Progress</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((transfer) => (
                    <TableRow
                      key={transfer.uuid}
                      className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                              {getInitials(transfer.intern?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{transfer.intern?.name || "Unknown"}</p>
                            <p className="truncate text-xs text-gray-400">
                              {transfer.intern?.program || "—"} · {formatDate(transfer.created_at)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{transfer.requested_by || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <TransferStatusChip status={transfer.status} />
                      </TableCell>
                      <TableCell>
                        {transfer.status === "accepted" && transfer.progress ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <ProgressPill
                              label="Yours"
                              progress={transfer.progress.intern}
                              tone="bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            />
                            <ProgressPill
                              label="Intern"
                              progress={transfer.progress.hte}
                              tone="bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          {transfer.status === "requested" ? (
                            <Button
                              className="h-10 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
                              onClick={() => acceptTransfer(transfer)}
                              disabled={Boolean(acceptingUuid)}
                            >
                              {acceptingUuid === transfer.uuid ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <CheckCircle2 size={15} className="mr-1.5" />
                              )}
                              Accept
                            </Button>
                          ) : transfer.status === "accepted" ? (
                            <Button
                              asChild
                              variant="ghost"
                              className="h-10 rounded-xl text-green-700 transition-colors hover:bg-green-50"
                            >
                              <Link to={`/hte/evaluations/${transfer.intern?.uuid}`}>
                                <ClipboardCheck size={15} className="mr-1.5" />
                                Evaluate
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-sm text-gray-400">
                              {transfer.status === "evaluated" ? "Awaiting coordinator" : "Completed"}
                            </span>
                          )}
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
              Showing <span className="font-semibold text-gray-700">{meta.from ?? 0}</span>–
              <span className="font-semibold text-gray-700">{meta.to ?? 0}</span> of{" "}
              <span className="font-semibold text-gray-700">{meta.total}</span> requests
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
    </HteLayout>
  );
}
