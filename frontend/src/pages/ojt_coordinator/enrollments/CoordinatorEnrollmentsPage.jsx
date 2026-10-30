import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Eye,
  GraduationCap,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import PageHeader from "@/components/PageHeader.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function StatusBadge({ status }) {
  const map = {
    pending: { label: "Pending", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
    approved: { label: "Approved", className: "bg-green-50 text-green-700 ring-1 ring-green-200" },
    rejected: { label: "Rejected", className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  };
  const tone = map[status] || map.pending;
  return <Badge className={`rounded-full font-semibold ${tone.className}`}>{tone.label}</Badge>;
}

export default function CoordinatorEnrollmentsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [academicYear, setAcademicYear] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api
      .get("/academic-terms/options")
      .then((res) => {
        const list = res.data.data || [];
        setTerms(list);
        const active = list.find((term) => term.status === "active");
        setAcademicYear(active ? String(active.id) : "all");
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (academicYear !== "all") params.set("academic_year_id", academicYear);
      if (status !== "all") params.set("status", status);
      const res = await api.get(`/coordinator/enrollments?${params.toString()}`);
      setRows(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error("Failed to load applications", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <CoordinatorLayout>
      <PageHeader
        title="OJT Enrollments"
        subtitle="Approve or reject applications to enrol for OJT in a new term."
        icon={RefreshCw}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:p-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student..."
            className="h-11 rounded-xl pl-10 pr-10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
          <Select
            value={academicYear}
            onValueChange={(value) => {
              setAcademicYear(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-52">
              <SelectValue placeholder="All terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All terms</SelectItem>
              {terms.map((term) => (
                <SelectItem key={term.id} value={String(term.id)}>
                  {term.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-40">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-green-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Send size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No applications found</p>
            <p className="text-xs text-gray-400">Applications submitted by interns appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow className="bg-green-50 hover:bg-green-50">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Student</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Term</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Program</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Forms</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-green-50/40">
                      <TableCell>
                        <p className="truncate text-sm font-semibold text-gray-900">{row.student_name}</p>
                        <p className="truncate text-xs text-gray-400">{row.email}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">{row.academic_year}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{row.program}</span>
                      </TableCell>
                      <TableCell>
                        {row.documents?.length ? (
                          <a
                            href={row.documents[0].url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800"
                          >
                            <Paperclip size={13} />
                            {row.documents.length} form{row.documents.length === 1 ? "" : "s"}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <StatusBadge status={row.status} />
                          {row.intern_passed && (
                            <Badge className="gap-1 rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
                              <GraduationCap size={11} />
                              OJT passed
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            aria-label={`View ${row.student_name}`}
                            className="h-10 rounded-xl px-3 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50"
                          >
                            <Link to={`/coordinator/enrollments/${row.id}`} className="inline-flex items-center">
                              <Eye size={15} className="mr-1.5" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {meta && meta.total > 0 && (
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
          </>
        )}
      </div>
    </CoordinatorLayout>
  );
}