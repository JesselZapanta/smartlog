import { useState } from "react";
import { MoreVertical, Share } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clearDeferredPrompt,
  getDeferredPrompt,
  isIosDevice,
  isStandaloneDisplay,
} from "@/lib/pwaInstall";

function StepBadge({ n }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-mono text-xs font-bold text-green-700 ring-1 ring-gray-200">
      {n}
    </span>
  );
}

export default function InstallAppButton({ className = "", children, ariaLabel = "Install SMARTLOG app" }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("browser");

  async function handleClick() {
    if (isStandaloneDisplay()) {
      toast.info("Already installed", { description: "SMARTLOG is running as an installed app." });
      return;
    }
    const promptEvent = getDeferredPrompt();
    if (promptEvent) {
      promptEvent.prompt();
      try {
        await promptEvent.userChoice;
      } catch {
        /* user closed the native dialog */
      }
      clearDeferredPrompt();
      return;
    }
    setMode(isIosDevice() ? "ios" : "browser");
    setOpen(true);
  }

  return (
    <>
      <button type="button" aria-label={ariaLabel} onClick={handleClick} className={className}>
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Install SMARTLOG</DialogTitle>
            <DialogDescription>
              {mode === "ios"
                ? "iPhone and iPad install through the Safari share menu."
                : "Add SMARTLOG to your home screen through your browser menu."}
            </DialogDescription>
          </DialogHeader>
          {mode === "ios" ? (
            <ol className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <StepBadge n="1" />
                <p className="text-sm leading-relaxed text-gray-600">
                  Tap the <Share size={13} className="inline text-green-600" />{" "}
                  <span className="font-semibold text-gray-800">Share</span> icon in Safari&apos;s toolbar.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <StepBadge n="2" />
                <p className="text-sm leading-relaxed text-gray-600">
                  Scroll down and tap <span className="font-semibold text-gray-800">Add to Home Screen</span>.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <StepBadge n="3" />
                <p className="text-sm leading-relaxed text-gray-600">
                  Tap <span className="font-semibold text-gray-800">Add</span> — SMARTLOG joins your home screen.
                </p>
              </li>
            </ol>
          ) : (
            <ol className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <StepBadge n="1" />
                <p className="text-sm leading-relaxed text-gray-600">
                  Open your browser menu (<MoreVertical size={13} className="inline text-green-600" /> on Android,{" "}
                  <span className="font-semibold">⋯</span> on desktop).
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <StepBadge n="2" />
                <p className="text-sm leading-relaxed text-gray-600">
                  Tap <span className="font-semibold text-gray-800">Add to Home screen</span> or{" "}
                  <span className="font-semibold text-gray-800">Install app</span>.
                </p>
              </li>
              <li className="flex items-start gap-2.5">
                <StepBadge n="3" />
                <p className="text-sm leading-relaxed text-gray-600">
                  Confirm — SMARTLOG installs like a normal app.
                </p>
              </li>
            </ol>
          )}
          <DialogFooter className="flex-row justify-end">
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 rounded-xl bg-green-600 font-semibold text-white hover:bg-green-700"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
