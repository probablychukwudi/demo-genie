import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { seedGenerationRows } from "@/lib/mockData";
import { z } from "zod";
// Scene type used implicitly via SceneSchema

const SceneSchema = z.object({
  number: z.string(),
  title: z.string(),
  duration: z.string(),
  description: z.string(),
  script: z.string().optional(),
});

const SaveGenerationSchema = z.object({
  slug: z.string().min(4).max(16),
  productName: z.string().min(1).max(120),
  productUrl: z.string().max(500).nullable().optional(),
  brief: z.string().max(4000).nullable().optional(),
  ctaText: z.string().max(120).nullable().optional(),
  audience: z.string().max(200).nullable().optional(),
  tone: z.string().max(40).nullable().optional(),
  language: z.string().max(40).nullable().optional(),
  template: z.string().max(60).nullable().optional(),
  scenePlan: z.array(SceneSchema).max(10),
  scriptText: z.string().max(20000).nullable().optional(),
  videoUrl: z.string().max(1000).nullable().optional(),
  status: z.enum(["success", "stopped", "failed", "pending"]).default("success"),
  generationMode: z.enum(["mock", "live"]).default("mock"),
  costUsd: z.number().nullable().optional(),
  heygenSessionId: z.string().max(200).nullable().optional(),
  heygenVideoId: z.string().max(200).nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
});

type GenerationRow = {
  id: string;
  slug: string;
  product_name: string;
  product_url: string | null;
  brief: string | null;
  cta_text: string | null;
  audience: string | null;
  tone: string | null;
  language: string | null;
  template: string | null;
  scene_plan: z.infer<typeof SceneSchema>[];
  script_text: string | null;
  video_url: string | null;
  status: "success" | "stopped" | "failed" | "pending";
  generation_mode: "mock" | "live";
  cost_usd: number | null;
  heygen_session_id: string | null;
  heygen_video_id: string | null;
  view_count: number;
  duration_seconds: number | null;
  created_at: string;
  updated_at?: string;
};

const memoryRows = new Map<string, GenerationRow>();

function hasSupabaseAdminEnv() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function fallbackRows() {
  if (memoryRows.size === 0) {
    seedGenerationRows().forEach((row) => memoryRows.set(row.slug as string, row as GenerationRow));
  }
  return Array.from(memoryRows.values()).sort(
    (a, b) =>
      new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime(),
  );
}

function rowFromSave(
  data: z.infer<typeof SaveGenerationSchema>,
  id = crypto.randomUUID(),
): GenerationRow {
  return {
    id,
    slug: data.slug,
    product_name: data.productName,
    product_url: data.productUrl ?? null,
    brief: data.brief ?? null,
    cta_text: data.ctaText ?? null,
    audience: data.audience ?? null,
    tone: data.tone ?? null,
    language: data.language ?? null,
    template: data.template ?? null,
    scene_plan: data.scenePlan,
    script_text: data.scriptText ?? null,
    video_url: data.videoUrl ?? null,
    status: data.status ?? "success",
    generation_mode: data.generationMode ?? "mock",
    cost_usd: data.costUsd ?? null,
    heygen_session_id: data.heygenSessionId ?? null,
    heygen_video_id: data.heygenVideoId ?? null,
    view_count: 0,
    duration_seconds: data.durationSeconds ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const saveGeneration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveGenerationSchema.parse(input))
  .handler(async ({ data }) => {
    if (!hasSupabaseAdminEnv()) {
      const row = rowFromSave(data);
      memoryRows.set(row.slug, row);
      return { id: row.id as string, slug: row.slug as string };
    }

    const { error, data: row } = await supabaseAdmin
      .from("generations")
      .insert({
        slug: data.slug,
        product_name: data.productName,
        product_url: data.productUrl ?? null,
        brief: data.brief ?? null,
        cta_text: data.ctaText ?? null,
        audience: data.audience ?? null,
        tone: data.tone ?? null,
        language: data.language ?? null,
        template: data.template ?? null,
        scene_plan: data.scenePlan as unknown as never,
        script_text: data.scriptText ?? null,
        video_url: data.videoUrl ?? null,
        status: data.status,
        generation_mode: data.generationMode ?? "mock",
        cost_usd: data.costUsd ?? null,
        heygen_session_id: data.heygenSessionId ?? null,
        heygen_video_id: data.heygenVideoId ?? null,
        duration_seconds: data.durationSeconds ?? null,
      })
      .select("id, slug")
      .single();
    if (error) {
      const fallback = rowFromSave(data);
      memoryRows.set(fallback.slug, fallback);
      return { id: fallback.id as string, slug: fallback.slug as string };
    }
    return { id: row!.id as string, slug: row!.slug as string };
  });

export const listGenerations = createServerFn({ method: "GET" }).handler(async () => {
  if (!hasSupabaseAdminEnv()) return { rows: fallbackRows() };

  const { data, error } = await supabaseAdmin
    .from("generations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { rows: fallbackRows() };
  return { rows: data?.length ? data : fallbackRows() };
});

export const getGenerationBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(16) }).parse(input))
  .handler(async ({ data }) => {
    if (!hasSupabaseAdminEnv()) {
      return { row: fallbackRows().find((row) => row.slug === data.slug) ?? null };
    }

    const { data: row, error } = await supabaseAdmin
      .from("generations")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error)
      return { row: fallbackRows().find((fallback) => fallback.slug === data.slug) ?? null };
    return { row: row ?? fallbackRows().find((fallback) => fallback.slug === data.slug) ?? null };
  });

export const incrementViewCount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(16) }).parse(input))
  .handler(async ({ data }) => {
    if (!hasSupabaseAdminEnv()) {
      const rows = fallbackRows();
      const row = rows.find((item) => item.slug === data.slug);
      if (!row) return { viewCount: 1 };
      const next = ((row.view_count as number | undefined) ?? 0) + 1;
      memoryRows.set(data.slug, { ...row, view_count: next });
      return { viewCount: next };
    }

    const { data: cur } = await supabaseAdmin
      .from("generations")
      .select("view_count")
      .eq("slug", data.slug)
      .maybeSingle();
    const next = ((cur?.view_count as number | undefined) ?? 0) + 1;
    await supabaseAdmin.from("generations").update({ view_count: next }).eq("slug", data.slug);
    return { viewCount: next };
  });
