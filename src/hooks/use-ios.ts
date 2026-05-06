import * as React from "react";

/** Detect iPhone / iPod (and iPadOS reporting as Mac with touch). */
export function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIPhone = /iPhone|iPod/.test(ua);
  const isIPadOS =
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  return isIPhone || isIPadOS;
}

export function useIsIOS() {
  const [isIOS, setIsIOS] = React.useState<boolean>(false);
  React.useEffect(() => {
    setIsIOS(detectIOS());
  }, []);
  return isIOS;
}

/** Apply an `ios` class to <html> for CSS targeting. Run once at app boot. */
export function applyIOSClass() {
  if (typeof document === "undefined") return;
  if (detectIOS()) {
    document.documentElement.classList.add("ios");
  }
}
