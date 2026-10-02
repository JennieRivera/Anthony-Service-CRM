"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Phase 1.5C/1.5D — CRM Accent Color. A second, independent axis from
// next-themes' light/dark/system mode (data-theme) — this one manages
// [data-accent] on <html>. Kept as its own small provider rather than
// forcing it through next-themes, since next-themes models one "theme"
// per value and these two concepts (mode vs. accent) are orthogonal.
//
// "soft-blue" was retired as a selectable preset in Phase 1.5D: it's now
// the official default primary color (Professional Soft Blue), so it's
// simply what you get with no [data-accent] attribute at all — same
// reasoning as why "navy" was never a selectable preset in 1.5C.
export const accentValues = ["sage", "teal", "gold"] as const;
export type AccentValue = (typeof accentValues)[number];

const ACCENT_STORAGE_KEY = "ams-accent";

// Inline, pre-hydration script (same flash-prevention technique
// next-themes uses internally for data-theme) so the chosen accent
// applies before first paint instead of flashing the default.
export const accentInitScript = `(function(){try{var a=localStorage.getItem("${ACCENT_STORAGE_KEY}");if(a)document.documentElement.setAttribute("data-accent",a);}catch(e){}})();`;

const AccentContext = createContext<{
  accent: AccentValue | null;
  setAccent: (value: AccentValue | null) => void;
} | null>(null);

export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentValue | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
      if (stored && (accentValues as readonly string[]).includes(stored)) {
        // Deliberate one-time sync after mount: localStorage doesn't
        // exist on the server, so this can't be read during the initial
        // render without a hydration mismatch — same reasoning as the
        // inline accentInitScript above, just for React's own state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAccentState(stored as AccentValue);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — default navy stays.
    }
  }, []);

  function setAccent(value: AccentValue | null) {
    setAccentState(value);
    if (value) {
      document.documentElement.setAttribute("data-accent", value);
      try {
        localStorage.setItem(ACCENT_STORAGE_KEY, value);
      } catch {
        // ignore
      }
    } else {
      document.documentElement.removeAttribute("data-accent");
      try {
        localStorage.removeItem(ACCENT_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}

export function useAccent() {
  const ctx = useContext(AccentContext);
  if (!ctx) throw new Error("useAccent must be used within AccentProvider");
  return ctx;
}
