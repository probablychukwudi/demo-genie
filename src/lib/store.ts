import { create } from "zustand";

interface AppState {
  liveSlug: string | null;
  setLiveSlug: (slug: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Default to the most recent seeded demo so "Live Preview" is never dead.
  liveSlug: "acme-x42z",
  setLiveSlug: (slug) => set({ liveSlug: slug }),
}));
