import { useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "eventfuse-theme";
const listeners = new Set<() => void>();

function getMedia(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia("(prefers-color-scheme: dark)");
}

export function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // localStorage may be disabled or restricted
  }
  return "system";
}

export function getResolvedTheme(): ResolvedTheme {
  const pref = getStoredPreference();
  if (pref === "dark" || pref === "light") {
    return pref;
  }
  const media = getMedia();
  return media?.matches ? "dark" : "light";
}

function applyDomTheme(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = resolved === "dark";
  root.classList.toggle("dark", isDark);
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

export function setStoredPreference(next: ThemePreference): void {
  try {
    if (next === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
    }
  } catch {
    // localStorage may be unavailable
  }
  applyDomTheme(getResolvedTheme());
  notify();
}

export function toggleTheme(): void {
  const current = getResolvedTheme();
  const next: ResolvedTheme = current === "dark" ? "light" : "dark";
  setStoredPreference(next);
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);

  // Initialize DOM on first subscriber
  if (listeners.size === 1 && typeof window !== "undefined") {
    applyDomTheme(getResolvedTheme());

    const media = getMedia();
    const handleMediaChange = () => {
      if (getStoredPreference() === "system") {
        applyDomTheme(getResolvedTheme());
        notify();
      }
    };
    media?.addEventListener("change", handleMediaChange);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        applyDomTheme(getResolvedTheme());
        notify();
      }
    };
    window.addEventListener("storage", handleStorageChange);
  }

  return () => {
    listeners.delete(listener);
  };
}

export function useTheme(): {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  toggleTheme: () => void;
} {
  const preference = useSyncExternalStore(
    subscribeTheme,
    getStoredPreference,
    () => "system" as const,
  );
  const resolvedTheme = useSyncExternalStore(
    subscribeTheme,
    getResolvedTheme,
    () => "light" as const,
  );

  return {
    preference,
    resolvedTheme,
    setPreference: setStoredPreference,
    toggleTheme,
  };
}
