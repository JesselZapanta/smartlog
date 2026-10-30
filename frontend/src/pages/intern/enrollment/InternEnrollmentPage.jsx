import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Lock,
  Paperclip,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import InternLayout from "@/layouts/InternLayout.jsx";
import PageHeader from "@/components/PageHeader.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Everything the intern must provide before an application can be submitted:
 * two attached documents and a declared hours figure. Mirrors
 * OjtEnrollment::REQUIRED_ITEMS on the backend.
 */
const REQUIRED_ITEMS = [
  { key: "cor", kind: "document", label: "New COR", hint: "Updated Certificate of Registration" },
  { key: "curriculum", kind: "document", label: "Curriculum", hint: "Your current curriculum" },
  {
    key: "ojt_hours",
    kind: "number",
    label: "OJT hours",
    hint: "Total hours you have rendered",
  },
];

const REQUIRED_DOCUMENT_LABELS = Object.fromEntries(
  REQUIRED_ITEMS.filter((item) => item.kind === "document").map((item) => [item.key, item.label])
);

function StatusBadge({ status }) {
  const map = {
    pending: { label: "Pending review", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
    approved: { label: "Approved", className: "bg-green-50 text-green-700 ring-1 ring-green-200" },
    rejected: { label: "Rejected", className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  };
  const tone = map[status] || {
    label: status || "Unknown",
    className: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  };
  return <Badge className={`rounded-full font-semibold ${tone.className}`}>{tone.label}</Badge>;
}

/**
 * One required document, styled after the requirements submission card.
 *
 * The upload is a clickable dashed label wired to a hidden input, and the submitted
 * state shows the file with an open link and a remove button — the same pattern the
 * requirements module uses.
 */
function DocumentSlot({ item, uploaded, stagedName, busy, removingId, canUpload, onFile, onClear, onRemove }) {
  const inputId = `enroll-file-${item.key}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex items-start gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
          <FileText size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-heading text-sm font-bold leading-snug text-green-950">
            {item.label}
          </p>
          <div className="mt-2 flex flex-col items-start gap-1.5">
            {uploaded ? (
              <Badge className="inline-flex items-center gap-1.5 rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Submitted
              </Badge>
            ) : stagedName ? (
              <Badge className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 font-semibold text-blue-700 ring-1 ring-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Selected
              </Badge>
            ) : (
              <Badge className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 font-semibold text-amber-700 ring-1 ring-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Not yet submitted
              </Badge>
            )}
          </div>
          {item.hint && (
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{item.hint}</p>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50/60 p-3 sm:p-4">
        {uploaded ? (
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-gray-700">
              <FileText size={16} className="shrink-0" />
              <span className="truncate">{uploaded.label}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <a
                href={uploaded.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Open submitted file"
                className="-my-2 flex h-11 w-11 items-center justify-center rounded-lg text-green-700 transition-colors hover:bg-green-100"
              >
                <ExternalLink size={16} />
              </a>
              <button
                type="button"
                onClick={() => onRemove(uploaded)}
                disabled={busy || !canUpload || removingId === uploaded.id}
                aria-label={`Remove ${item.label}`}
                className="-my-2 flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500"
              >
                {removingId === uploaded.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
              </button>
            </div>
          </div>
        ) : stagedName ? (
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-blue-800">
              <FileText size={16} className="shrink-0" />
              <span className="truncate">{stagedName}</span>
            </div>
            <button
              type="button"
              onClick={() => onClear(item)}
              disabled={busy || !canUpload}
              aria-label={`Clear selected ${item.label}`}
              className="-my-2 flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <p className="px-1 py-2 text-xs font-medium text-gray-400">Not yet submitted</p>
        )}

        <>
          <label
            htmlFor={inputId}
            aria-disabled={!canUpload}
            className={`mt-2.5 flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ring-1 transition-colors ${
              canUpload
                ? "cursor-pointer border border-dashed border-gray-300 bg-white text-gray-600 hover:border-green-500 hover:bg-green-50 hover:text-green-700"
                : "pointer-events-none border border-dashed border-gray-200 bg-gray-50 text-gray-400 opacity-70"
            }`}
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                {uploaded || stagedName ? "Replace PDF" : "Upload PDF"}
              </>
            )}
          </label>
          <input
            id={inputId}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            disabled={busy || !canUpload}
            onChange={(event) => onFile(event, item)}
          />
          {!canUpload && (
            <p className="mt-2 text-xs text-gray-400">
              Locked: submitted applications can no longer be changed.
            </p>
          )}
        </>
      </div>
    </div>
  );
}

function RequirementChecklist({
  application,
  documents,
  stagedFiles,
  savedHours,
  hoursInput,
  hoursValue,
  uploading,
  removingId,
  savingHours,
  hoursDirty,
  canUpload,
  satisfied,
  onFile,
  onClear,
  onRemove,
  onHoursChange,
  onSaveHours,
}) {
  // A locked checklist shows its own saved figure, while the staging checklist shows
  // whatever the intern is currently typing.
  const shownHours = hoursValue ?? hoursInput;
  const attachedCount = REQUIRED_ITEMS.filter(satisfied).length;
  const extraDocuments = application
    ? documents.filter((item) => !REQUIRED_DOCUMENT_LABELS[item.type])
    : [];
  const _hoursReady = application ? Number(savedHours) > 0 : satisfied({ key: "ojt_hours", kind: "number" });

  return (
    <div className="mt-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
        Requirements ({attachedCount} of {REQUIRED_ITEMS.length})
      </p>

      <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {REQUIRED_ITEMS.filter((item) => item.kind === "document").map((item) => (
          <DocumentSlot
            key={item.key}
            item={item}
            uploaded={application ? documents.find((doc) => doc.type === item.key) : null}
            stagedName={!application ? stagedFiles[item.key]?.name : null}
            busy={uploading === item.key}
            removingId={removingId}
            canUpload={canUpload}
            onFile={onFile}
            onClear={onClear}
            onRemove={onRemove}
          />
        ))}
      </div>

      {REQUIRED_ITEMS.filter((item) => item.kind === "number").map((item) => (
        <div
          key={item.key}
          className={`mt-4 overflow-hidden rounded-2xl border bg-white shadow-sm ring-1 ${
            satisfied(item) ? "border-green-100 ring-green-100" : "border-gray-100 ring-gray-100"
          }`}
        >
          <div className="flex items-start gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
              <Clock3 size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words font-heading text-sm font-bold leading-snug text-green-950">
                {item.label}
              </p>
              <div className="mt-2 flex flex-col items-start gap-1.5">
                {satisfied(item) ? (
                  <Badge className="inline-flex items-center gap-1.5 rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {application ? `${savedHours} hours submitted` : `${shownHours} hours ready`}
                  </Badge>
                ) : (
                  <Badge className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 font-semibold text-amber-700 ring-1 ring-amber-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    Not yet submitted
                  </Badge>
                )}
              </div>
              {item.hint && (
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{item.hint}</p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50/60 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="10000"
                value={shownHours}
                onChange={(event) => onHoursChange(event.target.value)}
                placeholder="0"
                disabled={!canUpload}
                className="h-11 w-full rounded-xl disabled:cursor-not-allowed disabled:opacity-70 sm:w-40"
              />
              {application && (
                <Button
                  variant="outline"
                  disabled={!canUpload || savingHours || !hoursDirty}
                  onClick={onSaveHours}
                  className="h-11 shrink-0 rounded-xl px-4 text-xs font-semibold text-green-700"
                >
                  {savingHours ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {application
                ? canUpload
                  ? "Enter the total hours you have rendered. This cannot be zero."
                  : "Locked: submitted applications can no longer be changed."
                : "Enter the total hours you have rendered. This value is sent with your application."}
            </p>
          </div>
        </div>
      ))}

      {extraDocuments.length > 0 && (
        <ul className="mt-3 space-y-2">
          {extraDocuments.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2.5"
            >
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm font-medium text-gray-700 hover:text-green-700"
              >
                <Paperclip size={14} className="shrink-0 text-gray-400" />
                <span className="truncate">{doc.label}</span>
              </a>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${doc.label}`}
                disabled={!canUpload || removingId === doc.id}
                onClick={() => onRemove(doc)}
                className="h-9 w-9 shrink-0 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-400"
              >
                {removingId === doc.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function InternEnrollmentPage() {
  const [options, setOptions] = useState(null);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [termId, setTermId] = useState("");
  const [uploading, setUploading] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [hoursInput, setHoursInput] = useState("");
  const [savingHours, setSavingHours] = useState(false);
  // Files selected before a new application exists. They are uploaded as part of the
  // single submission because incomplete rows are never created.
  const [stagedFiles, setStagedFiles] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [optionsRes, currentRes] = await Promise.all([
        api.get("/intern/enrollment/options"),
        api.get("/intern/enrollments/current"),
      ]);
      const optionsData = optionsRes.data.data;
      setOptions(optionsData);
      setCurrent(currentRes.data.data);
      setTermId((prev) => prev || (optionsData.terms?.[0] ? String(optionsData.terms[0].id) : ""));
    } catch (err) {
      toast.error("Failed to load enrollment", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    if (!termId) {
      toast.error("Choose a term first");
      return;
    }
    setSubmitting(true);
    try {
      // A new row is created only when the selected term has no application and it can
      // immediately enter review. Take every required upload and the hours figure in one
      // request; there is no draft row.
      if (!selectedApplication) {
        const body = new FormData();
        body.append("academic_year_id", Number(termId));
        body.append("ojt_hours", Number(hoursInput));
        body.append("cor", stagedFiles.cor);
        body.append("curriculum", stagedFiles.curriculum);
        const res = await api.post("/intern/enrollments", body);
        toast.success("Application submitted", {
          description: res.data.message || "Your application to enrol for OJT was submitted.",
        });
        setStagedFiles({});
        await load();
        setTermId("");
        return;
      }

      const res = await api.post("/intern/enrollments", { academic_year_id: Number(termId) });
      toast.success("Application submitted", {
        description: res.data.message || "Your application to enrol for OJT was submitted.",
      });
      await load();
    } catch (err) {
      toast.error("Submission failed", { description: firstErrorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveHours() {
    if (!selectedApplication) return;

    setSavingHours(true);
    try {
      const res = await api.patch(`/intern/enrollments/${selectedApplication.id}/ojt-hours`, {
        ojt_hours: Number(hoursInput),
      });
      toast.success(res.data.message || "OJT hours saved");
      // Update in place — no full reload, so the page does not flash or lose scroll.
      setCurrent((prev) =>
        prev
          ? { ...prev, application: { ...prev.application, ...res.data.data } }
          : prev
      );
    } catch (err) {
      toast.error("Could not save hours", { description: firstErrorMessage(err) });
    } finally {
      setSavingHours(false);
    }
  }

  async function handleUpload(event, item) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", { description: "The file may not be larger than 10 MB." });
      return;
    }

    // Before an application exists, files stay local and are submitted together.
    if (!selectedApplication) {
      setStagedFiles((prev) => ({ ...prev, [item.key]: file }));
      return;
    }

    setUploading(item.key);
    try {
      const body = new FormData();
      body.append("type", item.key);
      body.append("file", file);
      const res = await api.post(`/intern/enrollments/${selectedApplication.id}/documents`, body);
      toast.success(`${item.label} uploaded`);
      // Patch just this slot. Re-fetching the whole page on every upload made the
      // list jump and lose the intern's place.
      setCurrent((prev) =>
        prev
          ? {
              ...prev,
              application: {
                ...prev.application,
                documents: [
                  ...prev.application.documents.filter((doc) => doc.type !== item.key),
                  res.data.data,
                ],
                missing_requirements: res.data.data.missing_requirements ?? prev.application.missing_requirements,
              },
            }
          : prev
      );
    } catch (err) {
      toast.error("Upload failed", { description: firstErrorMessage(err) });
    } finally {
      setUploading(null);
    }
  }

  function handleClearStagedFile(item) {
    setStagedFiles((prev) => {
      if (!prev[item.key]) return prev;
      const next = { ...prev };
      delete next[item.key];
      return next;
    });
  }

  async function handleRemove(document) {
    if (!selectedApplication) return;
    setRemovingId(document.id);
    try {
      await api.delete(`/intern/enrollments/${selectedApplication.id}/documents/${document.id}`);
      toast.success("Document removed");
      setCurrent((prev) =>
        prev
          ? {
              ...prev,
              application: {
                ...prev.application,
                documents: prev.application.documents.filter((doc) => doc.id !== document.id),
              },
            }
          : prev
      );
    } catch (err) {
      toast.error("Remove failed", { description: firstErrorMessage(err) });
    } finally {
      setRemovingId(null);
    }
  }

/* -------------------------------------------------------------------------- */
  // Two different questions, deliberately kept apart:
  //
  //   `application`          — the intern's latest application row. This is the record
  //                            of where they stand, so the status badge and the
  //                            application card always show it, even when its term is
  //                            not selectable (an approved term is closed).
  //   `selectedApplication`  — the row for the term currently in the selector. Only
  //                            this one drives what gets edited and submitted, so the
  //                            page can never validate one term while posting another.
  const application = current?.application;
  const selectedApplication =
    application && String(application.academic_year_id) === String(termId) ? application : null;

  const savedHours = application?.ojt_hours ?? null;
  const stagedSavedHours = selectedApplication?.ojt_hours ?? null;

  // Prefill the field from the row the intern can actually edit, without stomping on
  // live typing.
  useEffect(() => {
    setHoursInput(stagedSavedHours != null ? String(stagedSavedHours) : "");
  }, [stagedSavedHours]);

  // Before an application exists for a term, attachments stay local and hours stay in
  // the form until the single submission. Each checklist evaluates against its own
  // row, so the saved application and the staged one never bleed into each other.
  const stagedHours = Number(hoursInput);
  const stagedHoursValid =
    hoursInput !== "" && Number.isInteger(stagedHours) && stagedHours >= 1 && stagedHours <= 10000;

  const makeSatisfied = (target) => (item) => {
    if (item.kind === "number") {
      return target ? Number(target.ojt_hours ?? 0) > 0 : stagedHoursValid;
    }

    if (target) {
      return (target.documents || []).some((doc) => doc.type === item.key);
    }

    return Boolean(stagedFiles[item.key]);
  };

  const applicationSatisfied = makeSatisfied(application);
  const stagedSatisfied = makeSatisfied(selectedApplication);

  const stagedAttachedCount = REQUIRED_ITEMS.filter(stagedSatisfied).length;
  const serverRequirementsComplete = stagedAttachedCount === REQUIRED_ITEMS.length;
  const stagedRequirementsComplete =
    REQUIRED_ITEMS.filter((item) => item.kind === "document").every((item) =>
      Boolean(stagedFiles[item.key])
    ) && stagedHoursValid;
  const hoursDirty =
    hoursInput !== "" && Number(hoursInput) > 0 && Number(hoursInput) !== Number(stagedSavedHours || 0);
  // A passed intern is done: the page becomes a record of that result rather than an
  // application form. The API already refuses (can_enroll=false, passed_term set, and
  // POST /intern/enrollments returns 422) — this is about not inviting the action.
  const passedTerm = options?.passed_term || null;
  const isPassed = Boolean(passedTerm);
  // An approved application means the intern is already running their OJT for that
  // term, so there is nothing left to apply for. The page becomes a record of that
  // result rather than a form, the same way a completed OJT does.
  //
  // The one exception is a failure: the ojt_enrollments row stays "approved" after the
  // intern is graded Failed (the grade lives on the intern record), and hiding the form
  // then would strand exactly the interns who are allowed to re-apply in a later term.
  const approvedTermFailed = application?.status === "approved"
    ? (current?.history || []).some(
        (record) =>
          record.academic_year_id === application.academic_year_id && record.grade === "Failed"
      )
    : false;
  const isApproved = application?.status === "approved" && !approvedTermFailed;

  // The form is only worth showing while there is something to declare or correct.
  //
  // A pending application is locked while it sits under review, and an approved one
  // means the intern is mid-OJT, so in both cases there is nothing left to fill in and
  // the page becomes a record. A rejected application is still editable, and a failure
  // on an approved term reopens the option to apply for a later term, so both keep it.
  const showEnrollForm =
    !isPassed &&
    (application == null || application.status === "rejected" || approvedTermFailed);
  const canSubmit = Boolean(options?.can_enroll) && showEnrollForm;
  // Before submission, the checklist is editable whenever starting is allowed. Once an
  // application exists, only a rejected application may still be changed. Submitted and
  // approved applications are read-only for the intern.
  const isEditableApplication = selectedApplication
    ? selectedApplication.is_editable === true
    : canSubmit;
  const canUpload = isEditableApplication;
  // The saved application card is only ever interactive when it is the row the intern
  // can edit. Every other row it might display (pending, approved, or another term) has
  // its controls disabled, so the handlers below can safely target the selected row.
  const canEditSavedApplication =
    application && selectedApplication === application && application.is_editable === true;
  // There is a brand-new application to create only when the selected term has none.
  // Once the selected term has one, resubmission is limited to a rejected row.
  const hasApplication = Boolean(selectedApplication);
  const canSubmitForReview = selectedApplication
    ? serverRequirementsComplete && options?.application_complete !== false
    : stagedRequirementsComplete;

  return (
    <InternLayout>
      <PageHeader
        title="OJT Enrollment"
        subtitle={
          isPassed
            ? "Your OJT is complete. This page records your final result."
            : "Apply to enrol for OJT in a new term without registering again."
        }
        icon={RefreshCw}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {isPassed && (
            <section className="relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-sm sm:p-5">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-green-100/50" />
              <div className="relative z-10 flex items-start gap-3 sm:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-sm">
                  <GraduationCap size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-base font-bold text-green-900 sm:text-lg">
                    You have completed your OJT
                  </h2>
                  <p className="mt-0.5 text-sm leading-relaxed text-green-800">
                    You passed in <span className="font-semibold">{passedTerm}</span>. Re-enrollment is
                    closed, so you cannot apply for another OJT term.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Current academic year ------------------------------------------- */}
          <Card className="rounded-2xl border border-gray-100 shadow-sm ring-gray-100">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Current academic year</p>
                  <p className="mt-1 break-words font-heading text-lg font-bold text-gray-900">
                    {options?.active_academic_year?.description || options?.current?.academic_year || "—"}
                  </p>
                </div>
                <div className="min-w-0 text-left sm:text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Enrollment status</p>
                  <div className="mt-1">
                    {application ? (
                      <StatusBadge status={application.status} />
                    ) : (
                      <Badge className="rounded-full bg-gray-100 font-semibold text-gray-600 ring-1 ring-gray-200">
                        No enrollment
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600 ring-1 ring-green-100">
                    <Building2 size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Institute</p>
                    <p className="break-words text-sm font-semibold text-gray-800">
                      {options?.current?.institute || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600 ring-1 ring-green-100">
                    <GraduationCap size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Program</p>
                    <p className="break-words text-sm font-semibold text-gray-800">
                      {options?.current?.program || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500 ring-1 ring-gray-100">
                {isPassed
                  ? "This is the term you were graded in. Your institute and program are part of your permanent record."
                  : "Your institute and program carry over to any new term and cannot be changed here."}
              </p>
            </CardContent>
          </Card>

          {/* Application ----------------------------------------------------- */}
          {application && (
            <Card className="rounded-2xl border border-gray-100 shadow-sm ring-gray-100">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Application</p>
                    <p className="mt-1 break-words font-heading text-base font-bold text-gray-900">
                      {application.academic_year}
                    </p>
                  </div>
                  <StatusBadge status={application.status} />
                </div>

                {isPassed && application.status !== "approved" && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-gray-100 bg-gray-50/70 p-3 ring-1 ring-gray-100">
                    <Lock size={16} className="mt-0.5 shrink-0 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      This application was submitted before you passed and can no longer be approved.
                      Your uploaded forms are kept on record.
                    </p>
                  </div>
                )}

                {application.status === "rejected" && application.rejection_reason && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/60 p-3 ring-1 ring-red-100">
                    <XCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Reason</p>
                      <p className="mt-0.5 break-words text-sm text-red-800">{application.rejection_reason}</p>
                    </div>
                  </div>
                )}

                {application.status === "approved" && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-green-100 bg-green-50/60 p-3 ring-1 ring-green-100">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
                    <p className="text-sm text-green-800">
                      Approved. Your OJT for this term is now open on your dashboard.
                    </p>
                  </div>
                )}

                <RequirementChecklist
                  application={application}
                  documents={application?.documents || []}
                  stagedFiles={stagedFiles}
                  savedHours={savedHours}
                  hoursInput={hoursInput}
                  hoursValue={savedHours != null ? String(savedHours) : ""}
                  uploading={uploading}
                  removingId={removingId}
                  savingHours={savingHours}
                  hoursDirty={hoursDirty}
                  canUpload={canEditSavedApplication}
                  satisfied={applicationSatisfied}
                  onFile={handleUpload}
                  onClear={handleClearStagedFile}
                  onRemove={handleRemove}
                  onHoursChange={setHoursInput}
                  onSaveHours={handleSaveHours}
                />
              </CardContent>
            </Card>
          )}

          {/* Apply ----------------------------------------------------------- */}
          {showEnrollForm && (
            <Card className="rounded-2xl border border-gray-100 shadow-sm ring-gray-100">
              <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2">
                {isPassed ? (
                  <CheckCircle2 size={15} className="text-green-600" />
                ) : (
                  <Send size={15} className="text-green-600" />
                )}
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  {isPassed ? "Re-enrollment" : "Enroll for OJT"}
                </p>
              </div>

              {!options ? null : isPassed ? (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-green-100 bg-green-50/60 p-3 ring-1 ring-green-100">
                  <Lock size={16} className="mt-0.5 shrink-0 text-green-600" />
                  <p className="text-sm text-green-800">
                    Closed. Your OJT was graded Passed in {passedTerm}, so no further enrollment is
                    accepted.
                  </p>
                </div>
              ) : !canSubmit ? (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 p-3 ring-1 ring-amber-100">
                  <Clock3 size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <p className="text-sm text-amber-800">{options.reason}</p>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-sm text-gray-500">
                    Choose the term you want to enrol for. Your current institute and program are
                    carried over.
                  </p>

                  {!hasApplication && (
                    <p className="mt-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-xs text-gray-600 ring-1 ring-gray-100">
                      Select a term, attach your New COR and Curriculum, and enter your OJT hours.
                      Your complete application is submitted in one step; nothing is saved or sent
                      for review before then.
                    </p>
                  )}

                  {!hasApplication && (
                    <RequirementChecklist
                      application={null}
                      documents={[]}
                      stagedFiles={stagedFiles}
                      savedHours={null}
                      hoursInput={hoursInput}
                      uploading={uploading}
                      removingId={removingId}
                      savingHours={savingHours}
                      hoursDirty={hoursDirty}
                      canUpload={canUpload}
                      satisfied={stagedSatisfied}
                      onFile={handleUpload}
                      onClear={handleClearStagedFile}
                      onRemove={handleRemove}
                      onHoursChange={setHoursInput}
                      onSaveHours={handleSaveHours}
                    />
                  )}

                  {canUpload && !canSubmitForReview && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs text-amber-800 ring-1 ring-amber-100">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                      <span>
                        Complete all three requirements before submitting —{" "}
                        {REQUIRED_ITEMS.filter((item) => !stagedSatisfied(item))
                          .map((item) => item.label)
                          .join(", ")}{" "}
                        still outstanding.{" "}
                        {hasApplication
                          ? "Your application stays rejected until every requirement is met."
                          : "No application is created until everything is complete."}
                      </span>
                    </p>
                  )}

                  {canUpload && canSubmitForReview && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl border border-green-100 bg-green-50/60 p-3 text-xs text-green-800 ring-1 ring-green-100">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-600" />
                      <span>
                        All requirements are done. Submit now to send this to your coordinator for
                        review.
                      </span>
                    </p>
                  )}

                  <div className="mt-4 space-y-3">
                    <Select
                      value={termId}
                      onValueChange={setTermId}
                      disabled={Boolean(selectedApplication) && !isEditableApplication}
                    >
                      <SelectTrigger className="data-[size=default]:h-11 w-full rounded-xl sm:w-72">
                        <SelectValue placeholder="Select a term" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.terms.map((term) => (
                          <SelectItem key={term.id} value={String(term.id)}>
                            {term.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !termId || !canSubmitForReview || (hasApplication && !isEditableApplication)}
                      className="h-11 w-full rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700 sm:w-auto"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Submitting...
                        </>
                      ) : hasApplication ? (
                        <>
                          <Send size={16} /> Submit for review
                        </>
                      ) : (
                        <>
                          <Send size={16} /> Submit application
                        </>
                      )}
                    </Button>
                    {selectedApplication?.status === "rejected" && canSubmitForReview && (
                      <p className="text-xs text-gray-400">
                        Your previous application was rejected — submitting again replaces it.
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
            </Card>
          )}

          {/* History section removed: the Current academic year card shows the active
              academic year, institute, program, and enrollment status. History remains
              available in reports. */}

          {!isApproved && (
            <p className="flex items-start gap-2 px-1 text-xs text-gray-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                A grade is assigned by your OJT instructor at the end of each term. Records from earlier terms are
                kept and remain available in your reports.
              </span>
            </p>
          )}
        </div>
      )}
    </InternLayout>
  );
}
