import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ClipboardList,
  Search,
  Eye,
  X,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Loader2,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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

function ProgressPill({ submitted, total }) {
  const complete = total > 0 && submitted >= total;
  const tone = complete ? "bg-green-50 text-green-700 ring-green-200" : "bg-amber-50 text-amber-700 ring-amber-200";
  return (
    <Badge className={`inline-flex items-center gap-1.5 rounded-full font-mono text-xs font-semibold ring-1 ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {submitted}/{total}
    </Badge>
  );
}

function OjtStatusPill({ status, startDate }) {
  if (status === "ongoing") {
    return (
      <Badge className="inline-flex items-center gap-1.5 rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        Ongoing{startDate ? ` · ${new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
      </Badge>
    );
  }
  return (
    <Badge className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 font-semibold text-gray-500 ring-1 ring-gray-200">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      Pending
    </Badge>
  );
}

export default function CoordinatorInternRequirementsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [academicYear, setAcademicYear] = useState("all");
  const [terms, setTerms] = useState([]);
  const defaultYearSet = useRef(false);

  useEffect(() => {
    api
      .get("/academic-terms/options")
      .then((res) => {
        const list = res.data.data || [];
        setTerms(list);
        if (!defaultYearSet.current) {
          defaultYearSet.current = true;
          const active = list.find((t) => t.status === "active");
          if (active) setAcademicYear(String(active.id));
        }
      })
      .catch(() => {});
  }, []);

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
      if (academicYear !== "all") params.set("academic_year_id", academicYear);
      const res = await api.get(`/coordinator/intern-requirements?${params.toString()}`);
      setRows(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error("Failed to load interns", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, order, academicYear]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function toggleOrder() {
    setOrder((current) => (current === "desc" ? "asc" : "desc"));
    setPage(1);
  }

  function onAcademicYearChange(value) {
    setAcademicYear(value);
    setPage(1);
  }

  const hasFilters = Boolean(search) || academicYear !== "all";

  return (
    <CoordinatorLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-green-950 sm:text-3xl">Intern Requirements</h1>
          <p className="mt-1 text-sm text-gray-500">Track requirement submissions of your approved interns.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search intern name or email…"
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
        <Select value={academicYear} onValueChange={onAcademicYearChange}>
          <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-52">
            <SelectValue placeholder="All academic years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All academic years</SelectItem>
            {terms.map((term) => (
              <SelectItem key={term.id} value={String(term.id)}>
                {term.description}
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
          <Button
            variant="ghost"
            className="h-11 rounded-xl text-gray-500 hover:text-gray-700"
            onClick={() => {
              setSearch("");
              const active = terms.find((t) => t.status === "active");
              setAcademicYear(active ? String(active.id) : "all");
              setPage(1);
            }}
          >
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
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Intern</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Program</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">OJT Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Requirements</TableHead>
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

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <ClipboardList size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No interns found</p>
            <p className="text-xs text-gray-400">Try adjusting your search.</p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div className="space-y-2.5 p-3 sm:p-4 md:hidden">
              {rows.map((intern) => (
                <div key={intern.uuid} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="h-9 w-9 shrink-0">
                        {intern.profile_picture && <AvatarImage src={intern.profile_picture} alt={intern.full_name} />}
                        <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                          {getInitials(intern.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{intern.full_name}</p>
                        <p className="truncate text-xs text-gray-400">{intern.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <ProgressPill submitted={intern.submitted} total={intern.total} />
                      <OjtStatusPill status={intern.ojt_status} startDate={intern.start_date} />
                    </div>
                  </div>
                  <div className="mt-2.5 text-xs text-gray-500">{intern.program || "—"}</div>
                  <div className="mt-3 flex gap-2 border-t border-gray-50 pt-3">
                    <Button
                      asChild
                      variant="outline"
                      className="h-10 flex-1 rounded-xl border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <Link to={`/coordinator/intern-requirements/${intern.uuid}`}>
                        <Eye size={15} /> View submissions
                      </Link>
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
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Intern</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Program</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">OJT Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Requirements</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((intern) => (
                    <TableRow key={intern.uuid} className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40">
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-green-700">#{intern.id}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            {intern.profile_picture && <AvatarImage src={intern.profile_picture} alt={intern.full_name} />}
                            <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                              {getInitials(intern.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{intern.full_name}</p>
                            <p className="truncate text-xs text-gray-400">{intern.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{intern.program || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <OjtStatusPill status={intern.ojt_status} startDate={intern.start_date} />
                      </TableCell>
                      <TableCell>
                        <ProgressPill submitted={intern.submitted} total={intern.total} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label={`View ${intern.full_name} submissions`}
                            className="h-10 w-10 rounded-xl text-gray-400 transition-colors hover:bg-green-50 hover:text-green-700 group-hover:text-gray-500"
                          >
                            <Link to={`/coordinator/intern-requirements/${intern.uuid}`}>
                              <Eye size={16} />
                            </Link>
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
              <span className="font-semibold text-gray-700">{meta.total}</span> interns
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
    </CoordinatorLayout>
  );
}
