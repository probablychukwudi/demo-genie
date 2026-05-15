function hasSupabaseAdminEnv() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function rowFromPayload(data) {
  return {
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
    duration_seconds: data.durationSeconds ?? null,
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const data = event.body ? JSON.parse(event.body) : {};
    if (!data.slug || !data.productName || !Array.isArray(data.scenePlan)) {
      return json(400, { error: "Missing generation payload." });
    }

    if (!hasSupabaseAdminEnv()) {
      return json(200, { id: crypto.randomUUID(), slug: data.slug });
    }

    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/generations?select=id,slug`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(rowFromPayload(data)),
    });
    const rows = await response.json().catch(() => []);
    if (!response.ok) {
      return json(200, { id: crypto.randomUUID(), slug: data.slug });
    }
    return json(200, rows[0] ?? { id: crypto.randomUUID(), slug: data.slug });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : "Save failed." });
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}
