import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Files,
  Download,
  Search,
  X,
  Loader2,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  School,
  CalendarDays,
  FileText,
  Filter,
  FileCheck,
} from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import PageHeader from "@/components/PageHeader.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { typeLabel, typeTone } from "@/pages/admin/requirements/constants.js";

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

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

export default function DocumentsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [institutes, setInstitutes] = useState([]);
  const [terms, setTerms] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [academicYear, setAcademicYear] = useState("all");
  const [instituteId, setInstituteId] = useState("all");
  const [selectedRequirementIds, setSelectedRequirementIds] = useState([]);
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
      .get("/institutes", { params: { per_page: 100, status: "active" } })
      .then((res) => setInstitutes(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get("/academic-terms/options")
      .then((res) => setTerms(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (instituteId === "all") {
      setRequirements([]);
      setSelectedRequirementIds([]);
      return;
    }
    let cancelled = false;
    setRequirementsLoading(true);
    api
      .get("/requirements", { params: { institute_id: instituteId, per_page: 100, status: "active" } })
      .then((res) => {
        if (!cancelled) setRequirements(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) setRequirements([]);
      })
      .finally(() => {
        if (!cancelled) setRequirementsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instituteId]);

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
      if (instituteId !== "all") params.set("institute_id", instituteId);
      if (selectedRequirementIds.length > 0) params.set("requirement_ids", selectedRequirementIds.join(","));
      const res = await api.get(`/documents?${params.toString()}`);
      setRows(res.data.data || []);
      setMeta(res.data.meta);
    } catch (err) {
      toast.error("Failed to load documents", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, order, academicYear, instituteId, selectedRequirementIds]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function onAcademicYearChange(value) {
    setAcademicYear(value);
    setPage(1);
  }

  function onInstituteChange(value) {
    setInstituteId(value);
    setPage(1);
  }

  function toggleOrder() {
    setOrder((current) => (current === "desc" ? "asc" : "desc"));
    setPage(1);
  }

  function toggleRequirement(id) {
    const sid = String(id);
    setSelectedRequirementIds((prev) => (prev.includes(sid) ? prev.filter((v) => v !== sid) : [...prev, sid]));
    setPage(1);
  }

  function selectAllRequirements() {
    setSelectedRequirementIds(requirements.map((r) => String(r.id)));
    setPage(1);
  }

  function clearRequirementSelection() {
    setSelectedRequirementIds([]);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setAcademicYear("all");
    setInstituteId("all");
    setSelectedRequirementIds([]);
    setPage(1);
  }

  async function handleBulkDownload() {
    if (downloading) return;
    if (meta && meta.total === 0) {
      toast.error("Nothing to download", { description: "No approved files match your filters." });
      return;
    }
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (academicYear !== "all") params.set("academic_year_id", academicYear);
      if (instituteId !== "all") params.set("institute_id", instituteId);
      if (selectedRequirementIds.length > 0) params.set("requirement_ids", selectedRequirementIds.join(","));
      const res = await api.get(`/documents/download?${params.toString()}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      let filename = `smartlog_documents_${new Date().toISOString().slice(0, 10)}.zip`;
      const disposition = res.headers["content-disposition"] || res.headers["Content-Disposition"];
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Download started", { description: `${meta?.total ?? rows.length} file(s) bundled as ZIP.` });
    } catch (err) {
      let message = firstErrorMessage(err);
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          message = json.errors?.documents?.[0] || json.message || message;
        } catch {
          // keep original message
        }
      }
      toast.error("Download failed", { description: message });
    } finally {
      setDownloading(false);
    }
  }

  const hasFilters =
    Boolean(search) || academicYear !== "all" || instituteId !== "all" || selectedRequirementIds.length > 0;
  const instituteName = institutes.find((i) => String(i.id) === String(instituteId))?.name || "";
  const totalFiles = meta?.total ?? 0;

  return (
    <AdminLayout>
      <PageHeader
        title="Documents"
        subtitle="Download approved requirement files in bulk — filter by academic year, institute, and requirement."
        icon={Files}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:p-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search intern or requirement…"
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
            <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-56">
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

          <Select value={instituteId} onValueChange={onInstituteChange}>
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
        </div>

        {hasFilters && (
          <Button variant="ghost" className="h-11 rounded-xl text-gray-500 hover:text-gray-700" onClick={clearFilters}>
            <X size={14} /> Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-green-100 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600 ring-1 ring-green-100">
              <FileText size={16} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              {instituteId === "all" ? "Requirements" : `Requirements · ${instituteName || "Institute"}`}
            </h3>
            {instituteId !== "all" && requirements.length > 0 && (
              <span className="rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-gray-200">
                {selectedRequirementIds.length === 0
                  ? "All"
                  : `${selectedRequirementIds.length} selected`}
              </span>
            )}
            {instituteId !== "all" && requirementsLoading && (
              <Loader2 size={14} className="animate-spin text-green-600" />
            )}
            {instituteId !== "all" && requirements.length > 0 && (
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg px-2.5 text-xs font-medium text-green-700 hover:bg-green-50"
                  onClick={selectAllRequirements}
                  disabled={selectedRequirementIds.length === requirements.length}
                >
                  Select all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-lg px-2.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                  onClick={clearRequirementSelection}
                  disabled={selectedRequirementIds.length === 0}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs leading-relaxed text-gray-500">
            {instituteId === "all"
              ? "Select an institute to pick specific requirements — or leave blank to include every approved file."
              : requirementsLoading
                ? "Loading requirements for this institute…"
                : requirements.length === 0
                  ? "No active requirements for this institute."
                  : "Check requirements to narrow the bulk download. Leave unchecked to include all approved files from this institute."}
          </p>
        </div>

        {instituteId !== "all" && !requirementsLoading && requirements.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {requirements.map((req) => {
              const checked = selectedRequirementIds.includes(String(req.id));
              return (
                <label
                  key={req.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    checked ? "border-green-200 bg-green-50/70" : "border-gray-100 bg-gray-50/60 hover:bg-white hover:border-gray-200"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleRequirement(req.id)}
                    className="mt-0.5 shrink-0 data-checked:border-green-600 data-checked:bg-green-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-tight text-gray-800">{req.name}</span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <Badge className={`rounded-full px-2 py-0 text-[11px] font-semibold ring-1 ${typeTone[req.type] || "bg-gray-50 text-gray-600 ring-gray-200"}`}>
                        {typeLabel[req.type] || req.type}
                      </Badge>
                      {req.description && (
                        <span className="truncate text-[11px] text-gray-400">{req.description}</span>
                      )}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
            <Filter size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {loading ? (
                <span className="inline-flex items-center gap-1.5 text-gray-500">
                  <Loader2 size={14} className="animate-spin" /> Loading files…
                </span>
              ) : totalFiles === 0 ? (
                "No approved files match"
              ) : (
                `${totalFiles} approved file${totalFiles === 1 ? "" : "s"} · page ${meta?.current_page ?? 1} of ${meta?.last_page ?? 1}`
              )}
            </p>
            <p className="truncate text-xs text-gray-400">
              {hasFilters ? "Filtered by your selection — download ZIP respects all filters." : "Showing every approved requirement submission."}
            </p>
          </div>
        </div>
        <Button
          onClick={handleBulkDownload}
          disabled={downloading || loading || totalFiles === 0}
          className="h-11 w-full rounded-xl bg-green-600 px-5 font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60 sm:w-auto"
        >
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Preparing ZIP…
            </>
          ) : (
            <>
              <Download size={16} /> Download ZIP
            </>
          )}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <div className="overflow-x-auto">
            <Table className="min-w-[1050px]">
              <TableHeader>
                <TableRow className="bg-green-50 hover:bg-green-50">
                  <SortableHeader label="ID" column="id" sort="id" order={order} onSort={toggleOrder} />
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Intern</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Academic Year</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Requirement</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Approved</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">Actions</TableHead>
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
              <Files size={20} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No approved documents found</p>
            <p className="max-w-sm text-xs leading-relaxed text-gray-400">
              No submissions are approved for the selected filters. Try clearing the institute or academic year filter, or check that coordinators have approved requirement files.
            </p>
            {hasFilters && (
              <Button variant="outline" className="mt-1 h-10 rounded-xl text-green-700" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <Table className="min-w-[1050px]">
              <TableHeader>
                <TableRow className="bg-green-50 hover:bg-green-50">
                  <SortableHeader label="ID" column="id" sort="id" order={order} onSort={toggleOrder} />
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Intern</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={11} /> Academic Year
                    </span>
                  </TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Requirement</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Approved</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-green-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40"
                  >
                    <TableCell>
                      <span className="font-mono text-sm font-semibold text-green-700">#{row.id}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          {row.intern?.profile_picture && <AvatarImage src={row.intern.profile_picture} alt={row.intern.full_name} />}
                          <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-xs font-bold text-white">
                            {getInitials(row.intern?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{row.intern?.full_name || "-"}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-gray-400">
                            {row.intern?.email}
                            {row.intern?.institute && (
                              <>
                                <span className="h-1 w-1 rounded-full bg-gray-300" />
                                <span className="inline-flex items-center gap-1">
                                  <School size={11} className="text-gray-300" />
                                  {row.intern.institute}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-100">
                        <CalendarDays size={12} />
                        {row.intern?.academic_year || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{row.requirement?.name || "-"}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          {row.requirement?.type && (
                            <Badge className={`rounded-full px-2 py-0 text-[11px] font-semibold ring-1 ${typeTone[row.requirement.type] || "bg-gray-50 text-gray-600 ring-gray-200"}`}>
                              {typeLabel[row.requirement.type] || row.requirement.type}
                            </Badge>
                          )}
                          {row.intern?.institute && (
                            <span className="truncate text-xs text-gray-400">{row.intern.institute}</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-400" title={row.file_name}>
                          {row.file_name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                        <FileCheck size={14} className="text-green-500" />
                        {formatDate(row.reviewed_at || row.submitted_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label={`Download ${row.requirement?.name || row.file_name}`}
                          className="h-10 w-10 rounded-xl text-gray-400 transition-colors hover:bg-green-50 hover:text-green-700 group-hover:text-gray-500"
                        >
                          <a href={row.file_url} target="_blank" rel="noreferrer" download>
                            <Download size={16} />
                          </a>
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
    </AdminLayout>
  );
}
