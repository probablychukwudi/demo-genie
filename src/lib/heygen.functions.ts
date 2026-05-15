import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { AGENT_STEPS, type GenerationInputs, type Scene } from "@/lib/types";

const LIVE_GENERATION_COST_USD = 1.37;
const HEYGEN_API_BASE = "https://api.heygen.com";

const LiveGenerationSchema = z.object({
  inputs: z.object({
    url: z.string(),
    readme: z.string(),
    changelog: z.string(),
    brief: z.string(),
    ctaText: z.string(),
    audience: z.string(),
    tone: z.string(),
    language: z.string(),
    template: z.string(),
    productName: z.string().optional(),
  }),
  scenePlan: z.array(
    z.object({
      number: z.string(),
      title: z.string(),
      duration: z.string(),
      description: z.string(),
      script: z.string().optional(),
    }),
  ),
  scriptText: z.string(),
});

interface HeyGenCreateResponse {
  data?: {
    session_id?: string;
    video_id?: string;
    status?: string;
    created_at?: number;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

interface HeyGenVideoResponse {
  data?: {
    id?: string;
    status?: string;
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    failure_message?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

function buildVideoAgentPrompt(inputs: GenerationInputs, scenePlan: Scene[], scriptText: string) {
  return [
    `Create a polished product demo video for ${inputs.productName || "this product"}.`,
    `Product URL: ${inputs.url || "not provided"}`,
    `Audience: ${inputs.audience}`,
    `Tone: ${inputs.tone}`,
    `Language: ${inputs.language}`,
    `Template: ${inputs.template}`,
    `CTA: ${inputs.ctaText}`,
    "",
    "Product brief:",
    inputs.brief,
    "",
    "README / docs context:",
    inputs.readme,
    "",
    "Changelog context:",
    inputs.changelog,
    "",
    "Scene plan:",
    scenePlan
      .map((scene) => `${scene.number}. ${scene.title} (${scene.duration}) — ${scene.script}`)
      .join("\n"),
    "",
    "Use this script as the source of truth:",
    scriptText,
    "",
    "Creative direction:",
    "- Use a professional avatar presenter as the human anchor.",
    "- Mix presenter narration with product-style visual beats, captions, and clear section pacing.",
    "- Make the demo feel launch-ready, not like a generic explainer.",
    "- Preserve the CTA and keep the final video suitable for a public product preview page.",
    "- If the generation system supports style, brand, captions, or multilingual-friendly composition, prefer those choices.",
    "",
    "Make the result concise, polished, and impressive enough for a live hackathon judging demo.",
  ].join("\n");
}

async function heygenFetch<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new Error("HEYGEN_API_KEY is not configured on the server.");
  }

  const response = await fetch(`${HEYGEN_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(init.headers ?? {}),
    },
  });
  const json = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(json.error?.message || `HeyGen request failed (${response.status})`);
  }
  return json;
}

export const createHeyGenLiveGeneration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LiveGenerationSchema.parse(input))
  .handler(async ({ data }) => {
    const prompt = buildVideoAgentPrompt(
      data.inputs as GenerationInputs,
      data.scenePlan as Scene[],
      data.scriptText,
    );

    const create = await heygenFetch<HeyGenCreateResponse>("/v3/video-agents", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        title: `${data.inputs.productName || "DemoGenie"} product demo`,
      }),
    });

    const sessionId = create.data?.session_id ?? null;
    const videoId = create.data?.video_id ?? null;
    let status = create.data?.status ?? "pending";
    let videoUrl: string | null = null;
    let durationSeconds: number | null = null;

    if (videoId) {
      const started = Date.now();
      while (Date.now() - started < 75_000) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        const video = await heygenFetch<HeyGenVideoResponse>(`/v3/videos/${videoId}`, {
          method: "GET",
        });
        status = video.data?.status ?? status;
        if (video.data?.duration) durationSeconds = Math.round(video.data.duration);
        if (video.data?.status === "completed" && video.data.video_url) {
          videoUrl = video.data.video_url;
          status = "success";
          break;
        }
        if (video.data?.status === "failed") {
          throw new Error(video.data.failure_message || "HeyGen video generation failed.");
        }
      }
    }

    return {
      sessionId,
      videoId,
      status,
      videoUrl,
      durationSeconds,
      estimatedCostUsd: LIVE_GENERATION_COST_USD,
      agentSteps: [
        ...AGENT_STEPS.map((step) => step.replace("{{tone}}", data.inputs.tone)),
        videoUrl
          ? "✓ HeyGen render complete."
          : "→ HeyGen render is still processing. Reopen History to refresh when complete.",
      ],
    };
  });
