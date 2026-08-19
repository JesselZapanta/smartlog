import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  FileClock,
  Flag,
  ImagePlus,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import InternLayout from "@/layouts/InternLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { downscaleImageFile } from "@/lib/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 6;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function formatTime(value) {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function computeDuration(slots) {
  const toMinutes = (time) => {
    if (!time) return null;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  let total = 0;
  for (const [inKey, outKey] of [
    ["am_in", "am_out"],
    ["pm_in", "pm_out"],
  ]) {
    const start = toMinutes(slots?.[inKey]?.time);
    const end = toMinutes(slots?.[outKey]?.time);
    if (start != null && end != null && end > start) {
      total += end - start;
    }
  }
  if (total <= 0) return null;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

function DtrTile({ label, value, mono = false, strong = false }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 text-sm",
          mono && "font-mono",
          strong ? "font-semibold text-gray-800" : "font-bold text-gray-800"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "approved" || status === "verified") {
    return (
      <Badge className="inline-flex items-center gap-1.5 rounded-full bg-green-50 font-semibold text-green-700 ring-1 ring-green-200">
        <CheckCircle2 size={12} /> {status === "verified" ? "Verified" : "Approved"}
      </Badge>
    );
  }
  if (status === "checked") {
    return (
      <Badge className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 font-semibold text-indigo-700 ring-1 ring-indigo-200">
        <ShieldCheck size={12} /> Checked
      </Badge>
    );
  }
  if (status === "flagged") {
    return (
      <Badge className="inline-flex items-center gap-1.5 rounded-full bg-red-50 font-semibold text-red-700 ring-1 ring-red-200">
        <Flag size={12} /> Flagged
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="inline-flex items-center gap-1.5 rounded-full bg-red-50 font-semibold text-red-700 ring-1 ring-red-200">
        <X size={12} /> Rejected
      </Badge>
    );
  }
  return (
    <Badge className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 font-semibold text-amber-700 ring-1 ring-amber-200">
      <FileClock size={12} /> Pending
    </Badge>
  );
}

export default function JournalFormPage() {
  const { date: dateParam } = useParams();
  const navigate = useNavigate();
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const [entry, setEntry] = useState(null);
  const [ojtStatus, setOjtStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [journal, setJournal] = useState("");
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removedIds, setRemovedIds] = useState(() => new Set());
  const [newPhotos, setNewPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [dtr, setDtr] = useState(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [capturedFile, setCapturedFile] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState("");
  const [viewPhoto, setViewPhoto] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fallbackInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const validDate = DATE_PATTERN.test(dateParam || "");
  const isFuture = validDate && dateParam > todayKey;
  const readOnly = ojtStatus === "hours_completed";
  const locked = Boolean(entry && ["verified", "checked", "flagged", "rejected"].includes(entry.status));
  const lockedLabel = {
    verified: "Verified",
    checked: "Approved",
    flagged: "Flagged",
    rejected: "Rejected",
  }[entry?.status];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, dtrRes] = await Promise.all([
        api.get(`/intern/journals?date=${dateParam}`),
        api.get(`/intern/photo-dtr?from=${dateParam}&to=${dateParam}`),
      ]);
      setOjtStatus(res.data.ojt_status || "");
      const found = res.data.data;
      setEntry(found);
      setTitle(found?.title || "");
      setJournal(found?.journal || "");
      setExistingPhotos(found?.photos || []);
      setRemovedIds(new Set());
      setDtr((dtrRes.data.data || []).find((record) => record.dtr_date === dateParam) || null);
    } catch (err) {
      toast.error("Failed to load journal", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, [dateParam]);

  useEffect(() => {
    if (validDate && !isFuture) {
      load();
    } else {
      setLoading(false);
    }
  }, [load, validDate, isFuture]);

  useEffect(() => {
    if (!viewPhoto && !cameraOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [viewPhoto, cameraOpen]);

  useEffect(
    () => () => {
      stopStream();
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      newPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function clearCaptured() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl("");
    setCapturedFile(null);
  }

  async function startStream() {
    setStreamReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not available on this device.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStreamReady(true);
    } catch {
      setCameraError("Camera unavailable — choose a photo instead.");
    }
  }

  function openCamera() {
    setCameraOpen(true);
    setCameraError("");
    clearCaptured();
    stopStream();
    startStream();
  }

  function closeCamera() {
    stopStream();
    clearCaptured();
    setCameraOpen(false);
    setCameraError("");
    setStreamReady(false);
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setCapturing(true);
    try {
      const scale = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) {
        toast.error("Capture failed", { description: "Could not take the photo." });
        return;
      }
      const file = new File([blob], "journal-photo.jpg", { type: "image/jpeg" });
      setCapturedFile(file);
      setCapturedUrl(URL.createObjectURL(file));
      stopStream();
    } finally {
      setCapturing(false);
    }
  }

  function retake() {
    clearCaptured();
    startStream();
  }

  function saveCaptured() {
    if (!capturedFile) return;
    const file = capturedFile;
    closeCamera();
    addNewPhoto(file);
  }

  function addNewPhoto(file) {
    if (photoSlotsLeft <= 0) {
      toast.error("Photo limit", { description: "A journal can have at most 6 photos." });
      return;
    }
    setNewPhotos((prev) => [...prev, { file, url: URL.createObjectURL(file) }]);
  }

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (photoSlotsLeft <= 0) {
      toast.error("Photo limit", { description: "A journal can have at most 6 photos." });
      return;
    }
    const accepted = files.slice(0, photoSlotsLeft);
    const processed = [];
    for (const file of accepted) {
      const downscaled = await downscaleImageFile(file);
      processed.push({ file: downscaled, url: URL.createObjectURL(downscaled) });
    }
    setNewPhotos((prev) => [...prev, ...processed]);
    if (files.length > photoSlotsLeft) {
      toast.info("Some photos skipped", { description: "A journal can have at most 6 photos." });
    }
  }

  const photoSlotsLeft = MAX_PHOTOS - existingPhotos.length + removedIds.size - newPhotos.length;

  async function handleSave() {
    if (locked || !title.trim() || !journal.trim()) {
      if (!locked) {
        toast.error("Missing details", { description: "Add a title and journal content before saving." });
      }
      return;
    }
    setSaving(true);
    try {
      const body = new FormData();
      body.append("title", title.trim());
      body.append("journal", journal.trim());
      newPhotos.forEach((photo) => body.append("photos[]", photo.file));
      removedIds.forEach((id) => body.append("remove_photos[]", id));
      if (entry) {
        await api.post(`/intern/journals/${entry.id}`, body);
        toast.success("Journal updated");
      } else {
        body.append("date", dateParam);
        await api.post("/intern/journals", body);
        toast.success("Journal submitted");
      }
      navigate("/intern/journals");
    } catch (err) {
      toast.error(entry ? "Update failed" : "Submit failed", { description: firstErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (locked) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      window.setTimeout(() => setDeleteArmed(false), 3000);
      return;
    }
    setDeleting(true);
    api
      .delete(`/intern/journals/${entry.id}`)
      .then(() => {
        toast.success("Journal deleted");
        navigate("/intern/journals");
      })
      .catch((err) => toast.error("Delete failed", { description: firstErrorMessage(err) }))
      .finally(() => setDeleting(false));
  }

  const prettyDate = validDate
    ? format(new Date(`${dateParam}T00:00:00`), "EEEE, MMMM d, yyyy")
    : "";

  const dtrShortDate = validDate ? format(new Date(`${dateParam}T00:00:00`), "MMM d, yyyy") : "";
  const dtrDuration = dtr ? computeDuration(dtr.slots) : null;

  const dtrCard = (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700 ring-1 ring-green-100">
          <Clock3 size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Photo DTR — read only</p>
          <p className="truncate font-heading text-base font-bold text-gray-800">{dtrShortDate}</p>
        </div>
        {!dtr && (
          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-600 ring-1 ring-red-200">
            No DTR
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-px bg-gray-100 sm:hidden">
        <DtrTile label="Date" value={dtrShortDate} strong />
        <DtrTile label="AM In" value={formatTime(dtr?.slots?.am_in?.time)} mono />
        <DtrTile label="AM Out" value={formatTime(dtr?.slots?.am_out?.time)} mono />
        <DtrTile label="PM In" value={formatTime(dtr?.slots?.pm_in?.time)} mono />
        <DtrTile label="PM Out" value={formatTime(dtr?.slots?.pm_out?.time)} mono />
        <DtrTile label="Hours" value={dtrDuration ? String(dtrDuration.hours) : "—"} mono />
        <DtrTile label="Minutes" value={dtrDuration ? String(dtrDuration.minutes) : "—"} mono />
      </dl>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">AM In</th>
              <th className="px-4 py-2.5">AM Out</th>
              <th className="px-4 py-2.5">PM In</th>
              <th className="px-4 py-2.5">PM Out</th>
              <th className="px-4 py-2.5">Hours</th>
              <th className="px-4 py-2.5">Minutes</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-gray-800">
              <td className="px-4 py-3 font-semibold">{dtrShortDate}</td>
              <td className="px-4 py-3 font-mono">{formatTime(dtr?.slots?.am_in?.time)}</td>
              <td className="px-4 py-3 font-mono">{formatTime(dtr?.slots?.am_out?.time)}</td>
              <td className="px-4 py-3 font-mono">{formatTime(dtr?.slots?.pm_in?.time)}</td>
              <td className="px-4 py-3 font-mono">{formatTime(dtr?.slots?.pm_out?.time)}</td>
              <td className="px-4 py-3 font-mono">{dtrDuration ? dtrDuration.hours : "—"}</td>
              <td className="px-4 py-3 font-mono">{dtrDuration ? dtrDuration.minutes : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {!dtr && (
        <p className="border-t border-red-100 bg-red-50/50 px-4 py-2.5 text-xs font-semibold text-red-600">
          No photo DTR record for this date.
        </p>
      )}
    </section>
  );

  return (
    <InternLayout>
      <div className="flex items-center gap-3">
        <Link
          to="/intern/journals"
          aria-label="Back to journal calendar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-green-300 hover:text-green-700 active:scale-95"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold text-green-950 sm:text-2xl">
            {readOnly ? "Journal entry" : entry ? "Edit journal" : "New journal"}
          </h1>
          <p className="flex items-center gap-1.5 truncate text-sm text-gray-500">
            <CalendarDays size={13} className="shrink-0" />
            {prettyDate || dateParam}
          </p>
        </div>
        {entry && (
          <div className="ml-auto shrink-0">
            <StatusBadge status={entry.status} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-green-600" />
        </div>
      ) : !validDate || isFuture ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
            <CalendarDays size={20} />
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {!validDate ? "Invalid date" : "This date is not available"}
          </p>
          <p className="max-w-xs text-xs text-gray-400">
            Journal entries can only be written for today or past dates.
          </p>
          <Button asChild className="mt-3 h-11 rounded-xl bg-green-600 font-semibold hover:bg-green-700">
            <Link to="/intern/journals">Back to calendar</Link>
          </Button>
        </div>
      ) : ojtStatus === "hours_completed" ? (
        <div className="mt-6 space-y-5">
          <div className="flex items-start gap-2.5 rounded-xl bg-indigo-50 p-3.5 ring-1 ring-indigo-100">
            <FileClock size={16} className="mt-0.5 shrink-0 text-indigo-600" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">
                Hours completed — read only
              </p>
              <p className="mt-0.5 text-sm text-indigo-800">
                You have completed your required OJT hours. Your records are now being reviewed by your HTE and
                instructor.
              </p>
            </div>
          </div>

          {dtrCard}

          {!entry ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white py-12 text-center shadow-sm ring-1 ring-gray-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <FileClock size={20} />
              </div>
              <p className="text-sm font-semibold text-gray-700">No journal entry for this date</p>
              <p className="max-w-xs text-xs text-gray-400">
                You can no longer write entries — your OJT hours are complete and your records are under review.
              </p>
              <Button asChild className="mt-3 h-11 rounded-xl bg-green-600 font-semibold hover:bg-green-700">
                <Link to="/intern/journals">Back to calendar</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-end">
                <StatusBadge status={entry.status} />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Title</p>
                <p className="mt-1.5 font-heading text-base font-bold text-gray-800">{entry.title}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-400">Journal</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{entry.journal}</p>
              </div>

              {entry.photos?.length > 0 && (
                <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Photos</p>
                  <ul className="mt-4 grid grid-cols-3 gap-2.5">
                    {entry.photos.map((photo) => (
                      <li key={photo.id} className="relative aspect-square">
                        <button
                          type="button"
                          onClick={() => setViewPhoto(photo.photo_url)}
                          aria-label="View photo"
                          className="block h-full w-full cursor-zoom-in overflow-hidden rounded-xl ring-2 ring-gray-100"
                        >
                          <img src={photo.photo_url} alt="Journal" className="h-full w-full object-cover" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      ) : ojtStatus === "completed" ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <FileClock size={20} />
          </div>
          <p className="text-sm font-semibold text-blue-800">OJT completed</p>
          <p className="max-w-sm text-xs text-blue-700/80">
            Congratulations! You have completed your OJT.
          </p>
        </div>
      ) : ojtStatus === "pending" || ojtStatus === "" ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <FileClock size={20} />
          </div>
          <p className="text-sm font-semibold text-amber-800">Not deployed yet</p>
          <p className="max-w-sm text-xs text-amber-700/80">
            You can start writing your daily journal once the coordinator deploys you to your host training
            establishment.
          </p>
        </div>
      ) : !dtr && !entry ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <Clock3 size={20} />
          </div>
          <p className="text-sm font-semibold text-gray-700">No photo DTR record for this date</p>
          <p className="max-w-xs text-xs text-gray-400">
            You can only write a journal entry for a date with a photo DTR record. Clock in on the Photo DTR page
            first.
          </p>
          <Button asChild className="mt-3 h-11 rounded-xl bg-green-600 font-semibold hover:bg-green-700">
            <Link to="/intern/journals">Back to calendar</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {entry?.status === "approved" && (
            <div className="flex items-start gap-2.5 rounded-xl bg-green-50 p-3.5 ring-1 ring-green-100">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
              <p className="text-sm text-green-800">
                This entry was approved. Editing it will send it back for review.
              </p>
            </div>
          )}
          {locked && (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-3.5 ring-1 ring-amber-100">
              <Lock size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Entry locked</p>
                <p className="mt-0.5 text-sm text-amber-800">
                  This entry has been {lockedLabel.toLowerCase()}. You can no longer edit or delete it.
                </p>
              </div>
            </div>
          )}
          {entry?.status === "rejected" && entry.remarks && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 ring-1 ring-red-100">
              <X size={16} className="mt-0.5 shrink-0 text-red-600" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-red-700">Rejection reason</p>
                <p className="mt-0.5 text-sm text-red-800">{entry.remarks}</p>
              </div>
            </div>
          )}

          {dtrCard}

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <label htmlFor="journal-title" className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Title
            </label>
            <Input
              id="journal-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. First day of OJT — inventory system orientation"
              maxLength={255}
              disabled={locked}
              className="mt-1.5 h-12 rounded-xl text-sm font-medium"
            />
            <label htmlFor="journal-content" className="mt-4 block text-xs font-bold uppercase tracking-wider text-gray-400">
              Journal
            </label>
            <Textarea
              id="journal-content"
              value={journal}
              onChange={(event) => setJournal(event.target.value)}
              placeholder="What did you do today? What did you learn?"
              rows={8}
              disabled={locked}
              className="mt-1.5 rounded-xl text-sm leading-relaxed"
            />
          </div>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Photos</p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {photoSlotsLeft > 0
                    ? `${photoSlotsLeft} of ${MAX_PHOTOS} slots available`
                    : "Photo limit reached (6 max)"}
                </p>
              </div>
              {!locked && photoSlotsLeft > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-600 transition-colors hover:border-green-300 hover:text-green-700 active:scale-95"
                  >
                    <Upload size={15} /> Upload
                  </button>
                  <button
                    type="button"
                    onClick={openCamera}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-green-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 active:scale-95"
                  >
                    <Camera size={15} /> Camera
                  </button>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                  />
                </div>
              )}
            </div>

            {(existingPhotos.length > 0 || newPhotos.length > 0) && (
              <ul className="mt-4 grid grid-cols-3 gap-2.5">
                {existingPhotos.map((photo) => {
                  const removed = removedIds.has(photo.id);
                  return (
                    <li key={photo.id} className="relative aspect-square">
                      <button
                        type="button"
                        onClick={() => setViewPhoto(photo.photo_url)}
                        aria-label="View photo"
                        className={cn(
                          "block h-full w-full cursor-zoom-in overflow-hidden rounded-xl ring-2 transition-opacity",
                          removed ? "opacity-40 ring-red-300" : "ring-gray-100"
                        )}
                      >
                        <img src={photo.photo_url} alt="Journal" className="h-full w-full object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRemovedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(photo.id)) next.delete(photo.id);
                            else next.add(photo.id);
                            return next;
                          });
                        }}
                        disabled={locked}
                        aria-label={removed ? "Keep photo" : "Remove photo"}
                        className={cn(
                          "absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-colors",
                          removed
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-black/60 text-white hover:bg-red-600"
                        )}
                      >
                        {removed ? <Check size={14} /> : <X size={14} />}
                      </button>
                    </li>
                  );
                })}
                {newPhotos.map((photo, index) => (
                  <li key={`${photo.url}-${index}`} className="relative aspect-square">
                    <button
                      type="button"
                      onClick={() => setViewPhoto(photo.url)}
                      aria-label="View photo"
                      className="block h-full w-full cursor-zoom-in overflow-hidden rounded-xl ring-2 ring-green-200"
                    >
                      <img src={photo.url} alt="Journal" className="h-full w-full object-cover" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(photo.url);
                        setNewPhotos((prev) => prev.filter((item) => item !== photo));
                      }}
                      disabled={locked}
                      aria-label="Remove photo"
                      className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-sm transition-colors hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!locked && existingPhotos.length === 0 && newPhotos.length === 0 && (
              <button
                type="button"
                onClick={openCamera}
                className="mt-4 flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 text-gray-400 transition-colors hover:border-green-400 hover:bg-green-50/50 hover:text-green-600"
              >
                <ImagePlus size={22} />
                <span className="text-xs font-semibold">Add photos with the camera or upload</span>
              </button>
            )}
          </section>

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || photoSlotsLeft < 0 || locked}
              className="h-11 w-full rounded-xl bg-green-600 px-6 text-sm font-semibold shadow-sm hover:bg-green-700 active:scale-[0.99] sm:w-auto"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving…" : entry ? "Save changes" : "Submit journal"}
            </Button>
            {entry && (
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving || locked}
                variant={deleteArmed ? "destructive" : "outline"}
                className={cn(
                  "h-11 w-full rounded-xl px-6 text-sm font-semibold sm:w-auto",
                  deleteArmed ? "bg-red-600 text-white hover:bg-red-700" : "border-red-200 text-red-600 hover:bg-red-50"
                )}
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {deleting ? "Deleting…" : deleteArmed ? "Tap again to confirm" : "Delete entry"}
              </Button>
            )}
          </div>
        </div>
      )}

      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {capturedUrl ? (
            <img src={capturedUrl} alt="Captured journal photo" className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 pb-10 pt-4">
            <button
              type="button"
              onClick={closeCamera}
              disabled={capturing}
              aria-label="Close camera"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur disabled:opacity-50"
            >
              <X size={20} />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Journal photo</p>
              <p className="truncate text-sm font-bold text-white">
                {capturedUrl ? "Review your photo" : "Take a photo of your OJT day"}
              </p>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-6 pb-10 pt-20">
            {cameraError && !capturedUrl ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm font-semibold text-white">{cameraError}</p>
                <input
                  ref={fallbackInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) {
                      const downscaled = await downscaleImageFile(file);
                      setCapturedFile(downscaled);
                      setCapturedUrl(URL.createObjectURL(downscaled));
                      stopStream();
                    }
                  }}
                />
                <Button
                  type="button"
                  className="h-11 rounded-full bg-white font-semibold text-gray-900 hover:bg-gray-100"
                  onClick={() => fallbackInputRef.current?.click()}
                >
                  <Upload size={15} /> Choose photo
                </Button>
              </div>
            ) : capturedUrl ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => (cameraError ? fallbackInputRef.current?.click() : retake())}
                  disabled={capturing}
                  className="inline-flex h-14 items-center gap-2 rounded-full bg-white/15 px-7 text-sm font-bold text-white ring-1 ring-white/40 backdrop-blur transition-transform active:scale-95 disabled:opacity-60"
                >
                  {cameraError ? <Upload size={18} /> : <RefreshCw size={18} />}
                  {cameraError ? "Choose another" : "Retake"}
                </button>
                <button
                  type="button"
                  onClick={saveCaptured}
                  disabled={capturing}
                  className="inline-flex h-14 items-center gap-2 rounded-full bg-green-500 px-7 text-sm font-bold text-white shadow-lg shadow-green-900/40 transition-transform active:scale-95 disabled:opacity-60"
                >
                  <Check size={18} />
                  Use photo
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={capture}
                  disabled={capturing || !streamReady}
                  aria-label="Capture photo"
                  className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 text-white backdrop-blur transition-transform active:scale-95 disabled:opacity-60"
                >
                  {capturing || !streamReady ? <Loader2 size={30} className="animate-spin" /> : <Camera size={30} />}
                </button>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
                  {capturing ? "Capturing…" : streamReady ? "Tap to capture" : "Starting camera…"}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {viewPhoto && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" onClick={() => setViewPhoto(null)}>
          <button
            type="button"
            onClick={() => setViewPhoto(null)}
            aria-label="Close photo"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur"
          >
            <X size={20} />
          </button>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <img
              src={viewPhoto}
              alt="Journal photo"
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
          <div className="pb-6 pt-2 text-center">
            <p className="text-sm font-bold text-white">{prettyDate}</p>
          </div>
        </div>
      )}
    </InternLayout>
  );
}