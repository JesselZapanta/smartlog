import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Award,
  CheckCircle2,
  ChevronsUpDown,
  Clock3,
  GraduationCap,
  Info,
  Loader2,
  Lock,
  Search,
  X,
  XCircle,
} from "lucide-react";
import InstructorLayout from "@/layouts/InstructorLayout.jsx";
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

const PER_PAGE = 10;

const GRADE_OPTIONS = [
  { value: "all", label: "All grades" },
  { value: "ungraded", label: "Not graded" },
  { value: "Passed", label: "Passed" },
  { value: "Failed", label: "Failed" },
];



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

function GradeBadge({ grade }) {
  if (grade === "Passed") {
    return (
      <Badge className="rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
        Passed
      </Badge>
    );
  }
  if (grade === "Failed") {
    return (
      <Badge className="rounded-full bg-red-50 font-semibold text-red-700 ring-1 ring-red-200">
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="rounded-full bg-gray-100 font-semibold text-gray-600 ring-1 ring-gray-200">
      Not graded
    </Badge>
  );
}

function formatHours(minutes) {
  const safe = Math.max(0, minutes || 0);
  return `${Math.floor(safe / 60)}h ${safe % 60}m`;
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

export default function InstructorInternGradesPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [academicYear, setAcademicYear] = useState("all");
  const [grade, setGrade] = useState("all");
  const [sort, setSort] = useState("id");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const [target, setTarget] = useState(null);
  const [working, setWorking] = useState(false);

  const activeAcademicYearId = useMemo(() => {
    const active = terms.find((term) => term.status === "active");
    return active ? String(active.id) : "all";
  }, [terms]);

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
      .then((res) => setTerms(res.data.data || []))
      .catch(() => {});
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
        sort,
        order,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (academicYear !== "all") params.set("academic_year_id", academicYear);
      if (grade !== "all") params.set("grade", grade);

      const res = await api.get(`/instructor/intern-grades?${params.toString()}`);
      setRows(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error("Failed to load intern grades", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, academicYear, grade, sort, order]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function onSort(column) {
    if (sort === column) {
      setOrder((current) => (current === "desc" ? "asc" : "desc"));
    } else {
      setSort(column);
      setOrder("desc");
    }
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setAcademicYear(activeAcademicYearId);
    setGrade("all");
    setPage(1);
  }

  const hasFilters = Boolean(search) || academicYear !== activeAcademicYearId || grade !== "all";

  async function applyGrade(row, nextGrade) {
    setWorking(true);
    try {
      const res = await api.patch(`/instructor/interns/${row.uuid}/grade`, {
        grade: nextGrade,
        academic_year_id: row.academic_year_id,
      });
      toast.success(res.data.message || "Grade updated", {
        description: `${row.full_name} · ${row.academic_year || "this term"}`,
      });
      setTarget(null);
      loadRows();
    } catch (err) {
      toast.error("Could not update grade", { description: firstErrorMessage(err) });
    } finally {
      setWorking(false);
    }
  }

  // `target.grade` is null when the dialog is only asking which grade to apply, so
  // it stays truthy and no longer needs an "unchanged" guard — picking the grade the
  // row already has simply produces a no-op confirm, which the endpoint reports back
  // as "Grade is unchanged."

  return (
    <InstructorLayout>
      <PageHeader
        title="Intern Grade"
        subtitle="Record the final Passed or Failed grade for each intern per term."
        icon={GraduationCap}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:p-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email..."
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
          value={academicYear}
          onValueChange={(value) => {
            setAcademicYear(value);
            setPage(1);
          }}
        >
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

        <Select
          value={grade}
          onValueChange={(value) => {
            setGrade(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-44">
            <SelectValue placeholder="All grades" />
          </SelectTrigger>
          <SelectContent>
            {GRADE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
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
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-green-50 hover:bg-green-50">
                  <SortableHeader label="ID" column="id" sort={sort} order={order} onSort={onSort} />
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                    Intern
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                    OJT Status
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                    Hours
                  </TableHead>
                  <SortableHeader label="Grade" column="grade" sort={sort} order={order} onSort={onSort} />
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
        ) : null}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Award size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No intern grades found</p>
            <p className="text-xs text-gray-400">Try adjusting your search or filters.</p>
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
                  <SortableHeader label="ID" column="id" sort={sort} order={order} onSort={onSort} />
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                    Intern
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                    OJT Status
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                    Hours
                  </TableHead>
                  <SortableHeader label="Grade" column="grade" sort={sort} order={order} onSort={onSort} />
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={`${row.id}`}
                    className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40"
                  >
                    <TableCell>
                      <span className="font-mono text-sm font-semibold text-green-700">#{row.id}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {row.profile_picture && <AvatarImage src={row.profile_picture} alt={row.full_name} />}
                          <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                            {getInitials(row.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{row.full_name}</p>
                          <p className="truncate text-xs text-gray-400">{row.program || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={row.ojt_status} />
                    </TableCell>
                    <TableCell>
                      {row.required_hours ? (
                        <div className="min-w-0">
                          <span
                            className={`text-sm font-semibold ${
                              row.hours_met ? "text-green-700" : "text-amber-700"
                            }`}
                          >
                            {formatHours(row.earned_minutes)}
                          </span>
                          <span className="text-xs text-gray-400"> / {row.required_hours}h</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <GradeBadge grade={row.grade} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          className="h-10 rounded-xl px-3 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50"
                          onClick={() => setTarget({ row, grade: null })}
                        >
                          <Award size={15} className="mr-1.5" />
                          {row.grade ? "Edit Grade" : "Add Grade"}
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

      <Dialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && !working && setTarget(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          {target && (() => {
            const { row, grade } = target;
            const passing = grade === "Passed";
            const shortOfHours = Boolean(row.required_hours) && !row.hours_met;
            const editing = Boolean(row.grade);

            return (
              <>
                <DialogHeader className="space-y-1">
                  <DialogTitle className="text-base">
                    {editing ? "Edit grade" : "Add grade"}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    <span className="font-semibold text-gray-700">{row.full_name}</span>
                    <span className="break-words">
                      {" "}· {row.program || "—"} · {row.academic_year || "This term"}
                    </span>
                  </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between gap-2.5 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Clock3 size={13} className="shrink-0 text-gray-400" />
                    <span className="text-[11px] font-semibold text-gray-600">OJT hours</span>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      row.required_hours
                        ? row.hours_met
                          ? "text-green-700"
                          : "text-amber-700"
                        : "text-gray-500"
                    }`}
                  >
                    {row.required_hours
                      ? `${formatHours(row.earned_minutes)} / ${row.required_hours}h`
                      : `${formatHours(row.earned_minutes)} · no requirement`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      value: "Passed",
                      icon: CheckCircle2,
                      active: "border-green-500 bg-green-50 text-green-700 ring-green-200",
                      idle: "border-gray-200 bg-white text-gray-500 ring-gray-100 hover:bg-green-50 hover:text-green-700",
                    },
                    {
                      value: "Failed",
                      icon: XCircle,
                      active: "border-red-500 bg-red-50 text-red-700 ring-red-200",
                      idle: "border-gray-200 bg-white text-gray-500 ring-gray-100 hover:bg-red-50 hover:text-red-600",
                    },
                  ].map((option) => {
                    const Icon = option.icon;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={working}
                        aria-pressed={grade === option.value}
                        onClick={() => setTarget({ row, grade: option.value })}
                        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 py-2.5 text-sm font-semibold ring-1 transition-colors disabled:opacity-60 ${
                          grade === option.value ? option.active : option.idle
                        }`}
                      >
                        <Icon size={16} />
                        {option.value}
                      </button>
                    );
                  })}
                </div>

                {grade ? (
                  <p
                    className={`flex items-start gap-1.5 text-[11px] leading-relaxed ${
                      passing && shortOfHours ? "text-amber-700" : "text-gray-500"
                    }`}
                  >
                    {passing && shortOfHours ? (
                      <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                    ) : passing ? (
                      <Lock size={12} className="mt-0.5 shrink-0" />
                    ) : (
                      <Info size={12} className="mt-0.5 shrink-0" />
                    )}
                    {passing && shortOfHours ? (
                      <>
                        Below the {row.required_hours}h requirement — you can still mark them passed.
                      </>
                    ) : passing ? (
                      <>Passing is permanent: they can no longer enrol for another OJT term.</>
                    ) : (
                      <>They stay eligible to enrol again in a later term.</>
                    )}
                  </p>
                ) : null}

                <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl"
                    disabled={working}
                    onClick={() => setTarget(null)}
                  >
                    Cancel
                  </Button>
                  {grade ? (
                    <Button
                      disabled={working}
                      onClick={() => applyGrade(row, grade)}
                      className={`h-11 rounded-xl font-semibold text-white ${
                        passing ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {working ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Saving...
                        </>
                      ) : passing ? (
                        <>
                          <CheckCircle2 size={16} /> Confirm {grade}
                      </>
                      ) : (
                        <>
                          <XCircle size={16} /> Confirm {grade}
                        </>
                      )}
                    </Button>
                  ) : null}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </InstructorLayout>
  );
}