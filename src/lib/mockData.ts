import type { Generation, GenerationInputs, Scene } from "./types";
import { MOCK_VIDEO_URL } from "./types";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const LIVE_LIBRARY_COST_USD = 1.37;

const LIVE_LIBRARY_VIDEOS: Record<
  string,
  {
    videoUrl: string;
    durationSeconds: number;
    heygenSessionId: string;
    heygenVideoId: string;
  }
> = {
  "heygen-demo": {
    videoUrl: "/generated/heygen-demo-heygen-live.mp4",
    durationSeconds: 32,
    heygenSessionId: "beb2458975a74a85829428e727df2c79",
    heygenVideoId: "ab23d01633584ba98a6a08396aed109a",
  },
  "prisma-api": {
    videoUrl: "/generated/prisma-api-heygen-live.mp4",
    durationSeconds: 33,
    heygenSessionId: "aed3ce2df61d42a688b164951dfdff8e",
    heygenVideoId: "ab64f1974fb64bd4b1601ec2627bdef4",
  },
  "linear-ai": {
    videoUrl: "/generated/linear-ai-heygen-live.mp4",
    durationSeconds: 26,
    heygenSessionId: "8129118827324ae3a72c2e2d433a2eb7",
    heygenVideoId: "283c9939f1ed46e3a4dfa56e34a27969",
  },
  "supportflow-training": {
    videoUrl: "/generated/supportflow-training-heygen-live.mp4",
    durationSeconds: 27,
    heygenSessionId: "ef8751fecbd34b3782906b31b7762947",
    heygenVideoId: "d12dc9ad30dd48b4ad4073c0296ce8cc",
  },
  "venturedeck-investor": {
    videoUrl: "/generated/venturedeck-investor-heygen-live.mp4",
    durationSeconds: 27,
    heygenSessionId: "bab1ba49e6af4df9ace6a06cf2b1dcaa",
    heygenVideoId: "6368f5e03daa4d6fb3580bb3ff34b57b",
  },
};

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
  const audience = inputs.audience || "your target users";
  const audienceLead = audience.split(",")[0] || "your users";
  const tone = inputs.tone.toLowerCase();
  return [
    {
      number: "01",
      title: "The Problem",
      duration: "~18s",
      description: `The moment ${audienceLead} realize the old way is too slow to explain.`,
      script:
        `Open with a human presenter and tight product visuals: ${audience.toLowerCase()} are shipping updates faster than they can explain them. ` +
        `Docs, changelogs, support notes, and sales context all exist, but the demo still takes days. ` +
        `That communication gap is the exact moment ${product} needs to own.`,
    },
    {
      number: "02",
      title: "The Solution",
      duration: "~24s",
      description: tag,
      script:
        `${product} delivers the core promise: ${tag} ` +
        `The video should feel ${tone}: avatar-led narration, crisp captions, product cutaways, and scene pacing that matches ${audience.toLowerCase()}. ` +
        `DemoGenie packages the source material into a HeyGen-ready story instead of a generic script.`,
    },
    {
      number: "03",
      title: "The Close",
      duration: "~12s",
      description: `${inputs.ctaText} — ship today.`,
      script:
        `Close with the practical next step: ${inputs.ctaText}. ` +
        `The finished asset is ready to share as a public page, export as MP4, localize or remix later, and track against the team's generation budget.`,
    },
  ];
}

export function buildScriptText(inputs: GenerationInputs, scenes: Scene[]): string {
  const product = inputs.productName ?? inferProductName(inputs.url, inputs.brief);
  return (
    `${product} — Demo Script (${inputs.tone}, ${inputs.language})\n\n` +
    scenes
      .map((s) => `Scene ${s.number} — ${s.title} (${s.duration})\n${s.script ?? s.description}`)
      .join("\n\n") +
    `\n\nCTA: ${inputs.ctaText}\n`
  );
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
    brief:
      `${productName} lets developers integrate the platform in under 10 minutes ` +
      `with one SDK, zero backend configuration, and enterprise-grade reliability.`,
  };
}

// Default seed values for first mount of workspace
export const SEED_INPUTS: GenerationInputs = {
  url: "https://www.heygen.com/",
  readme:
    "# HeyGen\nAI video generation for businesses. Create studio-quality avatar videos, translate videos, clone voices, and turn scripts into polished product demos without a production crew.",
  changelog:
    "Spring release — Video Agent creates demos from prompts, Brand Kits keep generated videos on-brand, and translation/lipsync workflows make product launches multilingual.",
  brief:
    "HeyGen helps teams create studio-quality avatar videos from scripts, product context, brand assets, and translation workflows, so every launch can ship with a human demo instead of a static README.",
  ctaText: "Create your first AI video",
  audience: "Founders, product marketers, and DevRel teams",
  tone: "Confident",
  language: "English",
  template: "Product Launch",
  productName: "HeyGen",
};

interface SeedGenerationSpec {
  id: string;
  slug: string;
  productName: string;
  productUrl: string;
  brief: string;
  ctaText: string;
  audience: string;
  tone: GenerationInputs["tone"];
  template: GenerationInputs["template"];
  viewCount: number;
  durationSeconds: number;
  createdAt: string;
}

function buildSeedGenerationRow(spec: SeedGenerationSpec): Record<string, unknown> {
  const liveVideo = LIVE_LIBRARY_VIDEOS[spec.slug];
  const inputs: GenerationInputs = {
    ...SEED_INPUTS,
    url: spec.productUrl,
    brief: spec.brief,
    ctaText: spec.ctaText,
    audience: spec.audience,
    tone: spec.tone,
    template: spec.template,
    productName: spec.productName,
  };
  const scenePlan = buildScenePlan(inputs);

  return {
    id: spec.id,
    slug: spec.slug,
    product_name: spec.productName,
    product_url: spec.productUrl,
    brief: spec.brief,
    cta_text: spec.ctaText,
    audience: spec.audience,
    tone: spec.tone,
    language: inputs.language,
    template: spec.template,
    scene_plan: scenePlan,
    script_text: buildScriptText(inputs, scenePlan),
    video_url: liveVideo?.videoUrl ?? MOCK_VIDEO_URL,
    status: "success",
    generation_mode: liveVideo ? "live" : "mock",
    cost_usd: liveVideo ? LIVE_LIBRARY_COST_USD : 0,
    heygen_session_id: liveVideo?.heygenSessionId ?? null,
    heygen_video_id: liveVideo?.heygenVideoId ?? null,
    view_count: spec.viewCount,
    duration_seconds: liveVideo?.durationSeconds ?? spec.durationSeconds,
    created_at: spec.createdAt,
  };
}

export function seedGenerationRows(): Record<string, unknown>[] {
  const now = Date.now();
  const hoursAgo = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString();
  return [
    buildSeedGenerationRow({
      id: "seed-heygen",
      slug: "heygen-demo",
      productName: "HeyGen",
      productUrl: "https://www.heygen.com/",
      brief: SEED_INPUTS.brief,
      ctaText: SEED_INPUTS.ctaText,
      audience: "Founders, product marketers, DevRel teams, and global launch teams",
      tone: "Confident",
      template: "Product Launch",
      viewCount: 247,
      durationSeconds: 54,
      createdAt: hoursAgo(2),
    }),
    buildSeedGenerationRow({
      id: "seed-prisma",
      slug: "prisma-api",
      productName: "Prisma ORM",
      productUrl: "https://www.prisma.io/",
      brief:
        "Prisma gives TypeScript teams a schema-first database layer with generated queries, migrations, and compile-time safety that can be explained as a crisp developer walkthrough.",
      ctaText: "Try Prisma",
      audience: "TypeScript developers and backend teams",
      tone: "Technical",
      template: "API Demo",
      viewCount: 84,
      durationSeconds: 54,
      createdAt: hoursAgo(26),
    }),
    buildSeedGenerationRow({
      id: "seed-linear",
      slug: "linear-ai",
      productName: "Linear AI",
      productUrl: "https://linear.app/",
      brief:
        "Linear AI turns product work into concise issue summaries, release updates, and stakeholder-ready communication for high-velocity teams.",
      ctaText: "Review the project update",
      audience: "Engineering managers and product leads",
      tone: "Confident",
      template: "Feature Update",
      viewCount: 61,
      durationSeconds: 52,
      createdAt: hoursAgo(72),
    }),
    buildSeedGenerationRow({
      id: "seed-supportflow",
      slug: "supportflow-training",
      productName: "SupportFlow Academy",
      productUrl: "https://example.com/supportflow",
      brief:
        "SupportFlow Academy turns complex product workflows into calm training videos with avatar narration, captions, and repeatable enablement paths.",
      ctaText: "Open the training guide",
      audience: "Support teams, onboarding teams, and customer success leaders",
      tone: "Friendly",
      template: "Feature Update",
      viewCount: 132,
      durationSeconds: 57,
      createdAt: hoursAgo(122),
    }),
    buildSeedGenerationRow({
      id: "seed-venturedeck",
      slug: "venturedeck-investor",
      productName: "VentureDeck AI",
      productUrl: "https://example.com/venturedeck",
      brief:
        "VentureDeck AI turns product traction, roadmap context, and customer proof into a sharp investor-facing product narrative.",
      ctaText: "View the investor brief",
      audience: "Investors, advisors, and strategic partners",
      tone: "Confident",
      template: "Product Launch",
      viewCount: 39,
      durationSeconds: 55,
      createdAt: hoursAgo(168),
    }),
  ];
}

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
    generationMode: ((row.generation_mode as Generation["generationMode"] | null) ??
      "mock") as Generation["generationMode"],
    costUsd: row.cost_usd == null ? null : Number(row.cost_usd),
    heygenSessionId: (row.heygen_session_id as string | null) ?? null,
    heygenVideoId: (row.heygen_video_id as string | null) ?? null,
    viewCount: (row.view_count as number) ?? 0,
    durationSeconds: (row.duration_seconds as number | null) ?? null,
    createdAt: row.created_at as string,
  };
}
