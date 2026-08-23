import { useEffect, useState } from "react";
import { Share, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoBadge } from "@/components/Logo.jsx";

const DISMISS_KEY = "smartlog_install_dismissed_at";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000;

let deferredPrompt = null;
let promptCaptured = false;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    promptCaptured = true;
    window.dispatchEvent(new Event("smartlog:pwa-installable"));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event("smartlog:pwa-installed"));
  });
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function InstallAppPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState("android");

  useEffect(() => {
    if (isStandalone()) return undefined;

    const recentlyDismissed =
      Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_TTL;
    if (recentlyDismissed) return undefined;

    if (isIos()) {
      setPlatform("ios");
      setVisible(true);
      return undefined;
    }

    if (promptCaptured) {
      setVisible(true);
      return undefined;
    }

    const onAvailable = () => setVisible(true);
    window.addEventListener("smartlog:pwa-installable", onAvailable);
    return () => window.removeEventListener("smartlog:pwa-installable", onAvailable);
  }, []);

  useEffect(() => {
    const onInstalled = () => setVisible(false);
    window.addEventListener("smartlog:pwa-installed", onInstalled);
    return () => window.removeEventListener("smartlog:pwa-installed", onInstalled);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function installClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      /* user dismissed the native dialog */
    }
    deferredPrompt = null;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] px-3 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-sm"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      role="dialog"
      aria-label="Install SMARTLOG"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_12px_40px_rgba(15,23,42,0.25)]">
        <LogoBadge size={42} className="shrink-0 drop-shadow-sm" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-bold leading-tight text-green-950">Install SMARTLOG</p>
          {platform === "ios" ? (
            <p className="mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-gray-500">
              <Share size={11} className="mt-0.5 shrink-0 text-green-600" />
              Tap <span className="font-semibold text-gray-700">Share</span> below, then{" "}
              <span className="font-semibold text-gray-700">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
              Add to your home screen for a full-screen app.
            </p>
          )}
        </div>
        {platform !== "ios" && (
          <Button
            type="button"
            size="sm"
            onClick={installClick}
            className="h-10 shrink-0 rounded-xl bg-green-600 px-3.5 font-semibold text-white hover:bg-green-700"
          >
            <Download size={15} /> Install
          </Button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
