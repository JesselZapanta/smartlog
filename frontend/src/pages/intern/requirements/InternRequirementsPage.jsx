import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, FileText, Upload, X, Loader2, CheckCircle2, ExternalLink, AlertTriangle, Clock3 } from "lucide-react";
import InternLayout from "@/layouts/InternLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { typeLabel, typeTone } from "@/pages/admin/requirements/constants.js";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  if (status === "approved") {
    return (
      <Badge className="inline-flex items-center gap-1.5 rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
        <CheckCircle2 size={12} /> Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="inline-flex items-center gap-1.5 rounded-full bg-red-50 font-semibold text-red-700 ring-1 ring-red-200">
        <AlertTriangle size={12} /> Rejected
      </Badge>
    );
  }
  return (
    <Badge className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 font-semibold text-amber-700 ring-1 ring-amber-200">
      <Clock3 size={12} /> Pending
    </Badge>
  );
}

export default function InternRequirementsPage() {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/intern/requirements");
      setRequirements(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load requirements", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFile(event, requirement) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Invalid file", { description: "Only PDF files are allowed." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", { description: "PDF must be 10 MB or smaller." });
      return;
    }

    setSubmittingId(requirement.id);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await api.post(`/intern/requirements/${requirement.id}/submit`, body);
      toast.success("Requirement submitted", { description: `${requirement.name} was uploaded.` });
      setRequirements((prev) =>
        prev.map((r) => (r.id === requirement.id ? { ...r, submission: res.data.data } : r))
      );
    } catch (err) {
      toast.error("Upload failed", { description: firstErrorMessage(err) });
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleRemove(requirement) {
    setRemovingId(requirement.id);
    try {
      await api.delete(`/intern/requirements/${requirement.id}`);
      toast.success("Submission removed", { description: `${requirement.name} was removed.` });
      setRequirements((prev) =>
        prev.map((r) => (r.id === requirement.id ? { ...r, submission: null } : r))
      );
    } catch (err) {
      toast.error("Remove failed", { description: firstErrorMessage(err) });
    } finally {
      setRemovingId(null);
    }
  }

  const submittedCount = requirements.filter((r) => r.submission).length;

  return (
    <InternLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-green-950 sm:text-3xl">Requirements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Submit the PDF requirements for your OJT internship.
          </p>
        </div>
        {!loading && requirements.length > 0 && (
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
            <CheckCircle2 size={18} className={submittedCount === requirements.length ? "text-green-600" : "text-gray-300"} />
            <span className="text-sm font-semibold text-gray-700">
              {submittedCount} / {requirements.length} submitted
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32 rounded-lg" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-3 w-3/4" />
              <Skeleton className="mt-4 h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : requirements.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white py-12 text-center shadow-sm ring-1 ring-gray-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <ClipboardList size={20} />
          </div>
          <p className="text-sm font-semibold text-gray-700">No requirements yet</p>
          <p className="text-xs text-gray-400">Your institute hasn't published any requirements.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {requirements.map((requirement) => (
            <div key={requirement.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-sm font-bold text-green-950">{requirement.name}</p>
                  {requirement.description && (
                    <p className="mt-1 text-xs text-gray-500">{requirement.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <TypePill type={requirement.type} />
                  {requirement.submission && <StatusPill status={requirement.submission.status} />}
                </div>
              </div>

              {requirement.submission?.status === "rejected" && requirement.submission.rejection_reason && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-600" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-red-700">Rejection reason</p>
                    <p className="mt-0.5 text-sm text-red-800">{requirement.submission.rejection_reason}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 border-t border-gray-50 pt-4">
                {requirement.submission ? (
                  <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-green-800">
                      <FileText size={16} className="shrink-0" />
                      <span className="truncate">
                        {requirement.submission.status === "rejected"
                          ? "Submitted (needs resubmit)"
                          : `Submitted ${formatDate(requirement.submission.submitted_at)}`}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={requirement.submission.file_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open submitted PDF"
                        className="-my-2 flex h-11 w-11 items-center justify-center rounded-lg text-green-700 transition-colors hover:bg-green-100"
                      >
                        <ExternalLink size={16} />
                      </a>
                      {requirement.submission.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => handleRemove(requirement)}
                          disabled={removingId === requirement.id}
                          aria-label="Remove submission"
                          className="-my-2 flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-green-100 hover:text-red-600 disabled:opacity-50"
                        >
                          {removingId === requirement.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <X size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Not yet submitted</p>
                )}

                <label
                  htmlFor={`req-file-${requirement.id}`}
                  className={`mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-semibold transition-colors ${
                    requirement.submission?.status === "approved"
                      ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                      : "border-gray-300 bg-white text-gray-600 hover:border-green-500 hover:bg-green-50 hover:text-green-700"
                  }`}
                >
                  {submittingId === requirement.id ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      {requirement.submission?.status === "approved"
                        ? "Approved"
                        : requirement.submission?.status === "rejected"
                          ? "Resubmit PDF"
                          : requirement.submission
                            ? "Replace PDF"
                            : "Upload PDF"}
                    </>
                  )}
                </label>
                <input
                  id={`req-file-${requirement.id}`}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={submittingId === requirement.id || requirement.submission?.status === "approved"}
                  onChange={(event) => handleFile(event, requirement)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </InternLayout>
  );
}
