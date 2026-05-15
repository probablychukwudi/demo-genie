export type Tone = "Confident" | "Friendly" | "Technical";
export type Language = "English" | "Spanish" | "French" | "German" | "Japanese";
export type Template = "Product Launch" | "Feature Update" | "API Demo";
export type GenerationStatus = "success" | "stopped" | "failed" | "pending";
export type GenerationMode = "mock" | "live";

export interface Scene {
  number: string;
  title: string;
  duration: string;
  description: string;
  script?: string;
}

export interface GenerationInputs {
  url: string;
  readme: string;
  changelog: string;
  brief: string;
  ctaText: string;
  audience: string;
  tone: Tone;
  language: Language;
  template: Template;
  productName?: string;
}

export interface Generation {
  id: string;
  slug: string;
  productName: string;
  productUrl: string | null;
  brief: string | null;
  ctaText: string | null;
  audience: string | null;
  tone: string | null;
  language: string | null;
  template: string | null;
  scenePlan: Scene[];
  scriptText: string | null;
  videoUrl: string | null;
  status: GenerationStatus;
  generationMode: GenerationMode;
  costUsd: number | null;
  heygenSessionId: string | null;
  heygenVideoId: string | null;
  viewCount: number;
  durationSeconds: number | null;
  createdAt: string;
}

export const AGENT_STEPS = [
  "→ Fetching product context from URL...",
  "→ Parsing README and changelog signals...",
  "→ Synthesizing audience, CTA, launch angle, and proof points...",
  "→ Designing avatar-led scene plan with product, motion, and share context...",
  "→ Generating {{tone}} script with voice, caption, and remix notes...",
  "→ Queuing HeyGen Video Agent render job...",
] as const;

export const MOCK_VIDEO_URL = "/generated/heygen-8f382361f7504ffca5603593ef1b29de.mp4";
