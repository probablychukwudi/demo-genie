import { create } from "zustand";

export type AppTheme = "dark" | "light";

const THEME_STORAGE_KEY = "demogenie:theme";

export function applyAppTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

function readInitialTheme(): AppTheme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
}

function persistTheme(theme: AppTheme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

interface AppState {
  liveSlug: string | null;
  setLiveSlug: (slug: string | null) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Default to the most recent seeded demo so "Live Preview" is never dead.
  liveSlug: "heygen-demo",
  setLiveSlug: (slug) => set({ liveSlug: slug }),
  theme: readInitialTheme(),
  setTheme: (theme) => {
    persistTheme(theme);
    applyAppTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    persistTheme(next);
    applyAppTheme(next);
    set({ theme: next });
  },
}));
