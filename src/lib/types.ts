export type Tone = "Confident" | "Friendly" | "Technical";
export type Language = "English" | "Spanish" | "French" | "German" | "Japanese";
export type Template = "Product Launch" | "Feature Update" | "API Demo";
export type GenerationStatus = "success" | "stopped" | "failed" | "pending";

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
  viewCount: number;
  durationSeconds: number | null;
  createdAt: string;
}

export const AGENT_STEPS = [
  "→ Fetching product context from URL...",
  "→ Parsing README and changelog signals...",
  "→ Identifying core value propositions...",
  "→ Writing scene plan (3 scenes)...",
  "→ Generating script with tone: {{tone}}...",
  "→ Queuing HeyGen render job...",
] as const;

export const MOCK_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
