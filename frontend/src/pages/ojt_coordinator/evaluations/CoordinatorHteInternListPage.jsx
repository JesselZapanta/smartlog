import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Search, X, ArrowDown, ArrowUp, ChevronsUpDown,   Loader2, Users, Eye, Award, UserRound, Briefcase, Lightbulb, ArrowLeft } from "lucide-react";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
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
  SelectValue
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusChip from "@/components/StatusChip.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
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

function EvaluationBadge({ evaluation }) {
  if (!evaluation || evaluation.total === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 ring-1 ring-gray-200">
        No criteria
      </span>
    );
  }
  const answered = evaluation.answered ?? 0;
  if (evaluation.status === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-green-700 ring-1 ring-green-200">
        {answered}/{evaluation.total} done
      </span>
    );
  }
  if (evaluation.status === "partial") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
        {answered}/{evaluation.total} answered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 ring-1 ring-gray-200">
      Not evaluated
    </span>
  );
}

export default function CoordinatorHteInternListPage() {
  const { hteUuid } = useParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [academicYear, setAcademicYear] = useState("all");
  const [order, setOrder] = useState("desc");
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
        const terms = res.data.data || [];
        setTerms(terms);
        const active = terms.find((term) => term.status === "active");
        setAcademicYear(active ? String(active.id) : "all");
      })
      .catch(() => {});
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
        sort: "id",
        order
});
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (academicYear !== "all") params.set("academic_year_id", academicYear);
      const res = await api.get(`/coordinator/hte-evaluations/${hteUuid}/interns?${params.toString()}`);
      setRows(res.data.data);
      setMeta(res.data.meta);
      setSummary(res.data.summary || null);
    } catch (err) {
      toast.error("Failed to load interns", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, order, academicYear, hteUuid]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function onAcademicYearChange(value) {
    setAcademicYear(value);
    setPage(1);
  }

  function toggleOrder() {
    setOrder((current) => (current === "desc" ? "asc" : "desc"));
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    const active = terms.find((term) => term.status === "active");
    setAcademicYear(active ? String(active.id) : "all");
    setPage(1);
  }

  const activeAcademicYearId = (() => {
    const active = terms.find((term) => term.status === "active");
    return active ? String(active.id) : "all";
  })();
  const hasFilters = Boolean(search) || academicYear !== activeAcademicYearId;

  return (
    <CoordinatorLayout>
            <PageHeader
        title="HTE Interns"
        subtitle="Interns who evaluated this HTE."
        icon={Users}
        action={
          <Button asChild className="h-11 shrink-0 rounded-xl bg-white px-4 font-semibold text-green-700 shadow-sm hover:bg-green-50">
            <Link to="/coordinator/hte-evaluations">
              <ArrowLeft size={16} /> Back to HTEs
            </Link>
          </Button>
        }
      />

<div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:p-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email…"
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
        
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:gap-3">
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
        </div>
        {hasFilters && (
          <Button variant="ghost" className="h-11 rounded-xl text-gray-500 hover:text-gray-700" onClick={clearFilters}>
            <X size={14} /> Clear filters
          </Button>
        )}
      </div>

      {summary && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center gap-2.5 border-b border-gray-50 px-4 py-3 sm:px-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
              <Award size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-sm font-bold text-green-950">Evaluation Summary</h2>
              <p className="mt-0.5 break-words text-xs leading-relaxed text-gray-500">
                {summary.evaluated_count} of {summary.interns_count} interns evaluated
                {academicYear !== "all" ? ` · ${terms.find((t) => String(t.id) === academicYear)?.description || academicYear}` : ""}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-px bg-gray-100 sm:grid-cols-3">
            {[
              { key: "personal_characteristics", label: "Personal", fullLabel: "Personal Characteristics", weight: "30%", tone: "bg-blue-50 text-blue-600 ring-blue-100", Icon: UserRound },
              { key: "work_characteristics", label: "Work", fullLabel: "Work Characteristics", weight: "30%", tone: "bg-amber-50 text-amber-600 ring-amber-100", Icon: Briefcase },
              { key: "job_knowledge", label: "Job Knowledge", fullLabel: "Job Knowledge", weight: "40%", tone: "bg-emerald-50 text-emerald-600 ring-emerald-100", Icon: Lightbulb },
            ].map(({ key, fullLabel, weight, tone, Icon }) => {
              const cat = summary.per_category?.[key];
              const avg = cat?.avg;
              return (
                <div key={key} className="bg-white p-4">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${tone}`}>
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold leading-tight text-gray-800">{fullLabel}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{weight} weight</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="font-heading text-2xl font-bold text-green-950">{avg != null ? Number(avg).toFixed(2) : "—"}</span>
                    <span className="text-xs font-semibold text-gray-400">/ 5.00</span>
                  </div>
                  <div className="mt-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all"
                        style={{ width: `${avg != null ? (Number(avg) / 5) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      {cat ? `${cat.answered} of ${cat.total} rated` : `0 of 0 rated`}
                      {cat?.na_count > 0 ? ` · ${cat.na_count} N/A as 0` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {summary.weighted != null && (
            <div className="flex flex-col gap-2 border-t border-green-600 bg-gradient-to-br from-green-600 to-emerald-500 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span className="text-xs font-semibold text-green-50">
                Weighted Average = (Personal 30% + Work 30% + Job Knowledge 40%)
              </span>
              <span className="font-heading text-sm font-bold text-white sm:hidden">{Number(summary.weighted).toFixed(2)} / 5.00</span>
              <span className="hidden font-heading text-sm font-bold text-white sm:block">{Number(summary.weighted).toFixed(2)} / 5.00</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 bg-gray-50/60 px-4 py-2.5 sm:px-5">
            <span className="text-xs text-gray-500">
              Based on {summary.evaluated_count} evaluated intern{summary.evaluated_count === 1 ? "" : "s"} of {summary.interns_count} total
            </span>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-green-50 hover:bg-green-50">
                    <SortableHeader label="ID" column="id" sort="id" order={order} onSort={toggleOrder} />
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Intern</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Program</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Evaluation</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Weighted Avg</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7} className="h-64">
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
              <Users size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No interns found</p>
            <p className="text-xs text-gray-400">No hours_completed or completed interns evaluated this HTE for the selected year.</p>
            {hasFilters && (
              <Button variant="outline" className="mt-1 h-10 rounded-xl text-green-700" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-green-50 hover:bg-green-50">
                    <SortableHeader label="ID" column="id" sort="id" order={order} onSort={toggleOrder} />
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Intern</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Program</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Evaluation</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Weighted Avg</TableHead>
                    <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((intern) => (
                    <TableRow
                      key={intern.uuid}
                      className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40"
                    >
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
                        <StatusChip status={intern.ojt_status || intern.status} />
                      </TableCell>
                      <TableCell>
                        <EvaluationBadge evaluation={intern.evaluation} />
                      </TableCell>
                      <TableCell>
                        {intern.evaluation?.weighted_average != null ? (
                          <span className="font-mono text-sm font-bold text-green-700">
                            {Number(intern.evaluation.weighted_average).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <Button
                            asChild
                            variant="ghost"
                            aria-label={`View ${intern.full_name} evaluation`}
                            className="h-10 rounded-xl text-green-700 transition-colors hover:bg-green-50"
                          >
                            <Link to={`/coordinator/hte-evaluations/${hteUuid}/${intern.uuid}`}>
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
    </CoordinatorLayout>
  );
}