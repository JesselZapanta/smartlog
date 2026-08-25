import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  CheckSquare,
  Loader2,
  Search,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import CoordinatorLayout from "@/layouts/CoordinatorLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageLoader from "@/components/PageLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

function InternRow({ intern, checked, onToggle, highlight }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors min-h-11 ${
        checked
          ? "border-green-300 bg-green-50/70"
          : highlight
            ? "border-green-200 bg-green-50/40 hover:bg-green-50"
            : "border-gray-100 bg-white hover:bg-gray-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-5 w-5 shrink-0 accent-green-600"
      />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold leading-tight text-gray-900">{intern.full_name}</span>
        <span className="block break-all text-xs text-gray-400">{intern.email}</span>
        {intern.program && <span className="block break-words text-xs text-gray-500">{intern.program}</span>}
      </span>
    </label>
  );
}

export default function AssignInternsPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const yearParam = searchParams.get("year") || "";

  const [hte, setHte] = useState(null);
  const [loadingHte, setLoadingHte] = useState(true);

  const [year, setYear] = useState("");
  const [yearError, setYearError] = useState("");

  const [assigned, setAssigned] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [selectedAssigned, setSelectedAssigned] = useState([]);

  const [interns, setInterns] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingHte(true);
    api
      .get(`/coordinator/htes/${uuid}`)
      .then((res) => {
        if (active) setHte(res.data.data);
      })
      .catch((err) => {
        if (active) {
          toast.error("Failed to load HTE", { description: firstErrorMessage(err) });
          navigate("/coordinator/hte-assignments");
        }
      })
      .finally(() => {
        if (active) setLoadingHte(false);
      });
    return () => {
      active = false;
    };
  }, [uuid, navigate]);

  useEffect(() => {
    if (yearParam) {
      setYear(yearParam);
      return;
    }
    api
      .get("/academic-terms/options")
      .then((res) => {
        const list = res.data.data || [];
        const active = list.find((term) => term.status === "active");
        if (active) {
          setYear(String(active.id));
        } else {
          setYearError("No academic year selected. Go back and choose an academic year.");
        }
      })
      .catch(() => setYearError("Could not load academic years. Go back and choose one."));
  }, [yearParam]);

  const loadAssigned = useCallback(async () => {
    if (!uuid || !year) return;
    setLoadingAssigned(true);
    try {
      const res = await api.get(`/coordinator/htes/${uuid}/assigned-interns?academic_year_id=${year}`);
      setAssigned(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load assigned interns", { description: firstErrorMessage(err) });
      setAssigned([]);
    } finally {
      setLoadingAssigned(false);
    }
  }, [uuid, year]);

  useEffect(() => {
    if (year) {
      setSelectedAssigned([]);
      loadAssigned();
    }
  }, [year, loadAssigned]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadAvailable = useCallback(
    async (targetPage, append) => {
      if (!uuid || !year) return;
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          per_page: String(PER_PAGE),
          academic_year_id: year,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        const res = await api.get(`/coordinator/htes/${uuid}/assignable-interns?${params.toString()}`);
        const next = res.data.data || [];
        setInterns((prev) => (append ? [...prev, ...next] : next));
        setMeta(res.data.meta || null);
      } catch (err) {
        toast.error("Failed to load interns", { description: firstErrorMessage(err) });
        if (!append) setInterns([]);
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [uuid, year, debouncedSearch]
  );

  useEffect(() => {
    if (!year) return;
    setSelected([]);
    setPage(1);
    loadAvailable(1, false);
  }, [year, debouncedSearch, loadAvailable]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadAvailable(nextPage, true);
  }

  function toggle(internId) {
    setSelected((prev) =>
      prev.includes(internId) ? prev.filter((id) => id !== internId) : [...prev, internId]
    );
  }

  function toggleAssigned(internId) {
    setSelectedAssigned((prev) =>
      prev.includes(internId) ? prev.filter((id) => id !== internId) : [...prev, internId]
    );
  }

  function toggleAllAvailable() {
    setSelected((prev) => (prev.length === interns.length ? [] : interns.map((i) => i.id)));
  }

  function toggleAllAssigned() {
    setSelectedAssigned((prev) => (prev.length === assigned.length ? [] : assigned.map((i) => i.id)));
  }

  async function handleAssign() {
    if (!uuid || selected.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/coordinator/htes/${uuid}/assign`, {
        academic_year_id: Number(year),
        intern_ids: selected,
      });
      toast.success("Interns assigned", { description: res.data.data.message });
      setSelected([]);
      setSearch("");
      setPage(1);
      await Promise.all([loadAssigned(), loadAvailable(1, false)]);
    } catch (err) {
      toast.error("Assignment failed", { description: firstErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnassign() {
    if (!uuid || selectedAssigned.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/coordinator/htes/${uuid}/unassign`, {
        academic_year_id: Number(year),
        intern_ids: selectedAssigned,
      });
      toast.success("Interns unassigned", { description: res.data.data.message });
      setSelectedAssigned([]);
      setPage(1);
      await Promise.all([loadAssigned(), loadAvailable(1, false)]);
    } catch (err) {
      toast.error("Unassignment failed", { description: firstErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  const hasMore = Boolean(meta && meta.current_page < meta.last_page);
  const totalAvailable = meta?.total ?? interns.length;

  return (
    <CoordinatorLayout>
      <div className="mx-auto w-full max-w-5xl space-y-4 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] pt-3 sm:space-y-5 sm:px-4 sm:pt-6 lg:px-6">
        <Link
          to="/coordinator/hte-assignments"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 sm:px-2"
        >
          <ArrowLeft size={16} /> Back to Assigned Interns
        </Link>

        {loadingHte || loadingAssigned || loading ? (
          <PageLoader />
        ) : hte ? (
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:flex-row sm:items-center sm:gap-3.5 sm:p-5">
              <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-3.5">
                <Avatar className="h-12 w-12 shrink-0 sm:h-14 sm:w-14">
                  {hte.profile_picture && <AvatarImage src={hte.profile_picture} alt={hte.contact_person} className="object-cover" />}
                  <AvatarFallback className="bg-gradient-to-br from-green-700 to-green-500 text-sm font-bold text-white sm:text-base">
                    {getInitials(hte.contact_person)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="break-words font-heading text-lg font-bold leading-tight text-green-950 sm:truncate sm:text-2xl">{hte.name}</h1>
                  <p className="mt-0.5 break-words text-xs text-gray-400 sm:truncate sm:text-sm">
                    {hte.program || "—"} · {hte.contact_person}
                  </p>
                </div>
              </div>
            </div>

            {yearError ? (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center sm:mt-6 sm:p-6">
                <Building2 size={20} className="text-amber-500" />
                <p className="break-words text-sm font-semibold text-amber-800">{yearError}</p>
                <Link to="/coordinator/hte-assignments" className="text-sm font-semibold text-amber-700 underline">
                  Go back and pick an academic year
                </Link>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-6 lg:grid lg:grid-cols-2 lg:items-start">
                <section className="order-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:p-5 lg:order-1">
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      <UserCheck size={16} className="shrink-0 text-green-600" />
                      <h2 className="break-words text-sm font-bold uppercase tracking-wider text-gray-700">
                        Assigned to this HTE ({assigned.length})
                      </h2>
                    </div>
                    {assigned.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllAssigned}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 self-start rounded-xl px-2 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50 sm:self-auto"
                      >
                        <CheckSquare size={14} />
                        {selectedAssigned.length === assigned.length ? "Unselect all" : "Select all"}
                      </button>
                    )}
                  </div>

                  {assigned.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 py-8 text-center">
                      <Users size={20} className="text-gray-300" />
                      <p className="text-sm font-semibold text-gray-500">No interns assigned yet</p>
                      <p className="text-xs text-gray-400">Pick interns from the right side and assign them.</p>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-64 space-y-2 overflow-y-auto pr-1 sm:max-h-80">
                        {assigned.map((intern) => (
                          <InternRow
                            key={intern.id}
                            intern={intern}
                            checked={selectedAssigned.includes(intern.id)}
                            onToggle={() => toggleAssigned(intern.id)}
                            highlight
                          />
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 h-11 w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={submitting || selectedAssigned.length === 0}
                        onClick={handleUnassign}
                      >
                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <UserMinus size={15} />}
                        Unassign {selectedAssigned.length > 0 ? `(${selectedAssigned.length})` : ""}
                      </Button>
                    </>
                  )}
                </section>

                <section className="order-1 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:p-5 lg:order-2">
                  <div className="mb-3 flex items-center gap-2">
                    <UserCheck size={16} className="shrink-0 text-green-600" />
                    <h2 className="break-words text-sm font-bold uppercase tracking-wider text-gray-700">Available interns</h2>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search interns by name or email"
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>

                  {interns.length === 0 ? (
                    <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 py-8 text-center">
                      <Users size={20} className="text-gray-300" />
                      <p className="text-sm font-semibold text-gray-500">
                        {debouncedSearch ? "No interns match your search" : "No assignable interns"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {debouncedSearch
                          ? "Try a different name or email."
                          : "All approved interns are already assigned to an HTE."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="break-words text-xs text-gray-400">
                          Showing {interns.length} of {totalAvailable} assignable interns
                        </p>
                        <button
                          type="button"
                          onClick={toggleAllAvailable}
                          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 self-start rounded-xl px-2 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50 sm:self-auto"
                        >
                          <CheckSquare size={14} />
                          {selected.length === interns.length ? "Unselect all" : "Select all"}
                        </button>
                      </div>
                      <div className="max-h-64 space-y-2 overflow-y-auto pr-1 sm:max-h-[22rem]">
                        {interns.map((intern) => (
                          <InternRow
                            key={intern.id}
                            intern={intern}
                            checked={selected.includes(intern.id)}
                            onToggle={() => toggle(intern.id)}
                          />
                        ))}
                      </div>
                      {hasMore && (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 h-11 w-full rounded-xl"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                        >
                          {loadingMore ? <Loader2 size={15} className="animate-spin" /> : null}
                          {loadingMore ? "Loading..." : "Load more"}
                        </Button>
                      )}
                      <Button
                        type="button"
                        className="mt-3 h-11 w-full rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
                        disabled={submitting || selected.length === 0}
                        onClick={handleAssign}
                      >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                        Assign {selected.length > 0 ? `(${selected.length})` : ""}
                      </Button>
                    </>
                  )}
                </section>
              </div>
            )}
          </>
        ) : null}
      </div>
    </CoordinatorLayout>
  );
}
