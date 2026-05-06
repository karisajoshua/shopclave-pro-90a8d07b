import { useEffect, useState } from "react";
import { X, Share } from "lucide-react";
import { useIsIOS } from "@/hooks/use-ios";

const STORAGE_KEY = "barakaz_ios_install_hint_dismissed";

const IOSInstallHint = () => {
  const isIOS = useIsIOS();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIOS) return;
    // Hide if already running as installed PWA
    const standalone =
      // @ts-ignore - iOS Safari
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, [isIOS]);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  return (
    <div className="md:hidden mx-3 mt-3 mb-1 rounded-2xl bg-card border border-border p-3 flex items-start gap-3 shadow-sm animate-fade-in">
      <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
        <Share className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Install Barakaz on your iPhone
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tap <span className="font-semibold">Share</span> then{" "}
          <span className="font-semibold">Add to Home Screen</span> for the full app experience.
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="p-1 -m-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default IOSInstallHint;
