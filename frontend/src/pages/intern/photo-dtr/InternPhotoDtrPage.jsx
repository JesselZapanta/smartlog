import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  FileClock,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import InternLayout from "@/layouts/InternLayout.jsx";
import api from "@/lib/api";
import { firstErrorMessage } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SLOTS = [
  { key: "am_in", label: "AM In" },
  { key: "am_out", label: "AM Out" },
  { key: "pm_in", label: "PM In" },
  { key: "pm_out", label: "PM Out" },
];

const MAX_PHOTO_DIMENSION = 1080;

async function downscaleImageFile(file) {
  if (!file || !file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not load image"));
      el.src = url;
    });
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function formatTime(value) {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusPill({ status }) {
  const tones = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    verified: "bg-green-50 text-green-700 ring-green-200",
    checked: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    disapproved: "bg-red-50 text-red-600 ring-red-200",
  };
  const labels = {
    pending: "Pending",
    verified: "Verified by HTE",
    checked: "Checked by instructor",
    disapproved: "Disapproved",
  };
  return (
    <Badge className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${tones[status] || tones.pending}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status] || status}
    </Badge>
  );
}

export default function InternPhotoDtrPage() {
  const [records, setRecords] = useState([]);
  const [today, setToday] = useState(null);
  const [deployed, setDeployed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [punchingSlot, setPunchingSlot] = useState(null);
  const [now, setNow] = useState(new Date());
  const [cameraSlot, setCameraSlot] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [capturedFile, setCapturedFile] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState("");
  const [viewPhoto, setViewPhoto] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fallbackInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => stopStream(), []);

  useEffect(() => {
    if (!viewPhoto && !cameraSlot) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [viewPhoto, cameraSlot]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/intern/photo-dtr");
      setRecords(res.data.data || []);
      setToday(res.data.today || null);
      setDeployed(Boolean(res.data.deployed));
    } catch (err) {
      toast.error("Failed to load DTR", { description: firstErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  async function openCamera(slotKey) {
    setCameraSlot(slotKey);
    setCameraError("");
    clearCaptured();
    stopStream();
    await startStream();
  }

  function closeCamera() {
    stopStream();
    clearCaptured();
    setCameraSlot(null);
    setCameraError("");
    setStreamReady(false);
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !cameraSlot) return;
    setCapturing(true);
    try {
      const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) {
        toast.error("Capture failed", { description: "Could not take the photo." });
        return;
      }
      const file = new File([blob], "punch.jpg", { type: "image/jpeg" });
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

  async function saveCaptured() {
    if (!capturedFile || !cameraSlot) return;
    const slotKey = cameraSlot;
    closeCamera();
    await handlePunch(slotKey, capturedFile);
  }

  async function handlePunch(slotKey, file) {
    if (!file) return;
    setPunchingSlot(slotKey);
    try {
      const body = new FormData();
      body.append("slot", slotKey);
      body.append("photo", file);
      await api.post("/intern/photo-dtr/punch", body);
      toast.success(`${SLOTS.find((s) => s.key === slotKey)?.label} recorded`);
      await load();
    } catch (err) {
      toast.error("Clock failed", { description: firstErrorMessage(err) });
    } finally {
      setPunchingSlot(null);
    }
  }

  const clockLabel = (slotKey) => (slotKey.endsWith("in") ? "Clock In" : "Clock Out");
  const clockIcon = (slotKey) => (slotKey.endsWith("in") ? LogIn : LogOut);

  return (
    <InternLayout>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-green-950 sm:text-3xl">Photo DTR</h1>
          <p className="mt-1 text-sm text-gray-500">Record your daily time in and out with a photo.</p>
        </div>
        <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
          <Clock3 size={18} className="shrink-0 text-green-600" />
          <div className="leading-tight">
            <p className="font-mono text-base font-bold text-gray-800">
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="text-[11px] font-semibold text-gray-400">{formatDate(now)}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      ) : !deployed ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <FileClock size={20} />
          </div>
          <p className="text-sm font-semibold text-amber-800">Not deployed yet</p>
          <p className="max-w-sm text-xs text-amber-700/80">
            You can start recording your photo DTR once the coordinator deploys you to your host training
            establishment.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm ring-1 ring-green-100">
            <div className="flex items-center gap-3 border-b border-green-100/70 bg-gradient-to-r from-green-700 to-green-500 px-4 py-3 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30">
                <Clock3 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-green-100">Today</p>
                <p className="truncate font-heading text-base font-bold text-white sm:text-lg">{formatDate(now)}</p>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-6">
                {[
                  { title: "Morning", slots: SLOTS.slice(0, 2) },
                  { title: "Afternoon", slots: SLOTS.slice(2) },
                ].map((group) => (
                  <div key={group.title}>
                    <div className="mb-2.5 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <p className="text-sm font-bold uppercase tracking-widest text-gray-600">{group.title}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {group.slots.map((slot) => {
                        const punched = today?.slots?.[slot.key];
                        const punching = punchingSlot === slot.key;
                        const ClockIcon = clockIcon(slot.key);
                        const hour = now.getHours();
                        let periodLocked = false;
                        let lockHint = "";
                        if (!punched?.time) {
                          if (slot.key === "am_in" && hour >= 12) {
                            periodLocked = true;
                            lockHint = "AM In is available before 12:00 PM";
                          } else if (slot.key === "am_out" && hour >= 13) {
                            periodLocked = true;
                            lockHint = "AM Out is available before 1:00 PM (grace)";
                          } else if (slot.key.startsWith("pm") && hour < 12) {
                            periodLocked = true;
                            lockHint = "PM slots are available at or after 12:00 PM";
                          }
                        }
                        return (
                          <div
                            key={slot.key}
                            className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors ${
                              punched?.time
                                ? "border-green-200 bg-green-50/50"
                                : "border-dashed border-gray-200 bg-gray-50/50"
                            }`}
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{slot.label}</p>
                            {punched?.photo_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewPhoto({
                                    url: punched.photo_url,
                                    label: slot.label,
                                    time: formatTime(punched.time),
                                  })
                                }
                                className="cursor-zoom-in"
                                aria-label={`View ${slot.label} photo`}
                              >
                                <img
                                  src={punched.photo_url}
                                  alt={`${slot.label} photo`}
                                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-green-200"
                                />
                              </button>
                            ) : (
                              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-gray-300 ring-1 ring-gray-200">
                                <Camera size={26} />
                              </div>
                            )}
                            <p className={`font-mono text-lg font-bold ${punched?.time ? "text-green-700" : "text-gray-300"}`}>
                              {punched?.time ? formatTime(punched.time) : "—:—"}
                            </p>
                            {punched?.time ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600">
                                <CheckCircle2 size={12} /> Clocked
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openCamera(slot.key)}
                                  disabled={punching || periodLocked}
                                  title={periodLocked ? lockHint : undefined}
                                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                                    periodLocked
                                      ? "bg-gray-100 text-gray-400"
                                      : "bg-green-600 text-white hover:bg-green-700"
                                  } disabled:opacity-70`}
                                >
                                  {punching ? <Loader2 size={14} className="animate-spin" /> : <ClockIcon size={14} />}
                                  {punching ? "Saving…" : clockLabel(slot.key)}
                                </button>
                                {periodLocked && (
                                  <p className="text-[10px] font-semibold text-gray-400">{lockHint}</p>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">History</h2>
            {records.length === 0 ? (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-10 text-center">
                <Clock3 size={20} className="text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">No DTR records yet</p>
                <p className="text-xs text-gray-400">Clock in to start your daily record.</p>
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ring-1 ring-gray-100">
                <div className="space-y-2.5 p-3 md:hidden">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ring-1 ring-gray-100"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-800">{formatDate(record.dtr_date)}</p>
                        <StatusPill status={record.status} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {SLOTS.map((slot) => {
                          const punched = record.slots?.[slot.key];
                          return (
                            <div
                              key={slot.key}
                              className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-2.5 py-2"
                            >
                              {punched?.photo_url ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewPhoto({
                                      url: punched.photo_url,
                                      label: slot.label,
                                      time: formatTime(punched.time),
                                    })
                                  }
                                  className="cursor-zoom-in"
                                  aria-label={`View ${slot.label} photo`}
                                >
                                  <img
                                    src={punched.photo_url}
                                    alt={`${slot.label} photo`}
                                    className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-gray-200"
                                  />
                                </button>
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-300 ring-1 ring-gray-200">
                                  <Camera size={13} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                  {slot.label}
                                </p>
                                <p className={`font-mono text-xs font-bold ${punched?.time ? "text-gray-700" : "text-gray-300"}`}>
                                  {punched?.time ? formatTime(punched.time) : "—"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {record.status === "checked" && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                          <CheckCircle2 size={14} /> Checked by {record.checked_by || "instructor"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-50 hover:bg-green-50">
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Date</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">AM In</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">AM Out</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">PM In</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">PM Out</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-green-700">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow
                          key={record.id}
                          className="group border-b border-gray-50 transition-colors last:border-0 hover:bg-green-50/40"
                        >
                          <TableCell>
                            <span className="text-sm font-bold text-gray-800">{formatDate(record.dtr_date)}</span>
                          </TableCell>
                          {SLOTS.map((slot) => {
                            const punched = record.slots?.[slot.key];
                            return (
                              <TableCell key={slot.key}>
                                {punched?.time ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setViewPhoto({
                                          url: punched.photo_url,
                                          label: slot.label,
                                          time: formatTime(punched.time),
                                        })
                                      }
                                      className="cursor-zoom-in"
                                      aria-label={`View ${slot.label} photo`}
                                    >
                                      <img
                                        src={punched.photo_url}
                                        alt={`${slot.label} photo`}
                                        className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-gray-200"
                                      />
                                    </button>
                                    <span className="font-mono text-xs font-bold text-gray-700">
                                      {formatTime(punched.time)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-300">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <StatusPill status={record.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
      {cameraSlot && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {capturedUrl ? (
            <img src={capturedUrl} alt="Captured punch" className="absolute inset-0 h-full w-full object-contain" />
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                {SLOTS.find((s) => s.key === cameraSlot)?.label || "Clock"}
              </p>
              <p className="truncate text-sm font-bold text-white">
                {capturedUrl
                  ? "Review your photo"
                  : `Take a photo to ${cameraSlot.endsWith("in") ? "clock in" : "clock out"}`}
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
                    if (file && cameraSlot) {
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
                  Save
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
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black/95"
          onClick={() => setViewPhoto(null)}
        >
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
              src={viewPhoto.url}
              alt={`${viewPhoto.label} photo`}
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
          <div className="pb-6 pt-2 text-center">
            <p className="text-sm font-bold text-white">{viewPhoto.label}</p>
            <p className="mt-0.5 font-mono text-xs text-white/60">{viewPhoto.time}</p>
          </div>
        </div>
      )}
    </InternLayout>
  );
}
