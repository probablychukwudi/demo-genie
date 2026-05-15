import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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
  durationSeconds: z.number().nullable().optional(),
});

export const saveGeneration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveGenerationSchema.parse(input))
  .handler(async ({ data }) => {
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
        duration_seconds: data.durationSeconds ?? null,
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return { id: row!.id as string, slug: row!.slug as string };
  });

export const listGenerations = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabaseAdmin
      .from("generations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  }
);

export const getGenerationBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(16) }).parse(input)
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("generations")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { row };
  });

export const incrementViewCount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(16) }).parse(input)
  )
  .handler(async ({ data }) => {
    const { data: cur } = await supabaseAdmin
      .from("generations")
      .select("view_count")
      .eq("slug", data.slug)
      .maybeSingle();
    const next = ((cur?.view_count as number | undefined) ?? 0) + 1;
    await supabaseAdmin
      .from("generations")
      .update({ view_count: next })
      .eq("slug", data.slug);
    return { viewCount: next };
  });
