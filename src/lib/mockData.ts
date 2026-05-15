import type { Generation, GenerationInputs, Scene } from "./types";
import { MOCK_VIDEO_URL } from "./types";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function makeSlug(): string {
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

function inferProductName(url: string, brief: string): string {
  if (url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      const root = host.split(".")[0];
      return root.charAt(0).toUpperCase() + root.slice(1);
    } catch {
      // fall through
    }
  }
  const first = brief.split(/[.\s]/)[0];
  return first || "Untitled Product";
}

function tagline(brief: string): string {
  return brief.split(/(?<=\.)\s/)[0] || brief;
}

export function buildScenePlan(inputs: GenerationInputs): Scene[] {
  const tag = tagline(inputs.brief);
  const product = inputs.productName ?? inferProductName(inputs.url, inputs.brief);
  return [
    {
      number: "01",
      title: "The Problem",
      duration: "~18s",
      description: `The pain ${inputs.audience.split(",")[0] || "your users"} feel today.`,
      script:
        `Open on ${inputs.audience.toLowerCase() || "developers"} stuck in the same loop — manual setup, ` +
        `weeks of integration work, and tooling that breaks at scale. ` +
        `That friction is the gap ${product} closes.`,
    },
    {
      number: "02",
      title: "The Solution",
      duration: "~24s",
      description: tag,
      script:
        `${product} delivers the core promise: ${tag} ` +
        `Built with a ${inputs.tone.toLowerCase()} approach for ${inputs.audience.toLowerCase()}. ` +
        `Drop-in SDKs, sane defaults, and observability that actually helps.`,
    },
    {
      number: "03",
      title: "The Close",
      duration: "~12s",
      description: `${inputs.ctaText} — ship today.`,
      script:
        `Stop wiring the same plumbing. ${inputs.ctaText} at ${inputs.url || product.toLowerCase() + ".com"} ` +
        `and ship the demo your team has been promising for months.`,
    },
  ];
}

export function buildScriptText(inputs: GenerationInputs, scenes: Scene[]): string {
  const product = inputs.productName ?? inferProductName(inputs.url, inputs.brief);
  return `${product} — Demo Script (${inputs.tone}, ${inputs.language})\n\n` +
    scenes
      .map((s) => `Scene ${s.number} — ${s.title} (${s.duration})\n${s.script ?? s.description}`)
      .join("\n\n") +
    `\n\nCTA: ${inputs.ctaText}\n`;
}

export interface MockGenerationDraft {
  slug: string;
  productName: string;
  scenePlan: Scene[];
  scriptText: string;
  videoUrl: string;
  agentSteps: string[];
}

export function generateMockGeneration(inputs: GenerationInputs): MockGenerationDraft {
  const productName = inputs.productName ?? inferProductName(inputs.url, inputs.brief);
  const scenePlan = buildScenePlan({ ...inputs, productName });
  return {
    slug: makeSlug(),
    productName,
    scenePlan,
    scriptText: buildScriptText({ ...inputs, productName }, scenePlan),
    videoUrl: MOCK_VIDEO_URL,
    agentSteps: [],
  };
}

// Mock URL fetch — returns synthesized brief from URL
export function mockFetchProduct(url: string): { productName: string; brief: string } {
  const productName = inferProductName(url, "");
  return {
    productName,
    brief: `${productName} lets developers integrate the platform in under 10 minutes ` +
      `with one SDK, zero backend configuration, and enterprise-grade reliability.`,
  };
}

// Default seed values for first mount of workspace
export const SEED_INPUTS: GenerationInputs = {
  url: "https://acme-api.dev",
  readme:
    "# Acme API\nProduction-grade payment processing API. " +
    "Supports 40+ gateways including Stripe and PayPal. " +
    "Sub-100ms latency. 99.99% uptime SLA.",
  changelog:
    "v2.4.0 — Webhook retry logic with exponential backoff. " +
    "Latency reduced 40%. New analytics dashboard for transaction insights.",
  brief:
    "Acme API lets developers integrate payments in under 10 minutes " +
    "with one SDK, zero backend configuration, and enterprise-grade reliability.",
  ctaText: "Start building free",
  audience: "Backend developers and technical founders",
  tone: "Confident",
  language: "English",
  template: "Product Launch",
  productName: "Acme API",
};

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  const w = Math.floor(d / 7);
  return `${w} week${w === 1 ? "" : "s"} ago`;
}

export function rowToGeneration(row: Record<string, unknown>): Generation {
  return {
    id: row.id as string,
    slug: row.slug as string,
    productName: row.product_name as string,
    productUrl: (row.product_url as string | null) ?? null,
    brief: (row.brief as string | null) ?? null,
    ctaText: (row.cta_text as string | null) ?? null,
    audience: (row.audience as string | null) ?? null,
    tone: (row.tone as string | null) ?? null,
    language: (row.language as string | null) ?? null,
    template: (row.template as string | null) ?? null,
    scenePlan: (row.scene_plan as Scene[]) ?? [],
    scriptText: (row.script_text as string | null) ?? null,
    videoUrl: (row.video_url as string | null) ?? null,
    status: row.status as Generation["status"],
    viewCount: (row.view_count as number) ?? 0,
    durationSeconds: (row.duration_seconds as number | null) ?? null,
    createdAt: row.created_at as string,
  };
}
