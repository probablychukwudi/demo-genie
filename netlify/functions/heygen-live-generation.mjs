const LIVE_GENERATION_COST_USD = 1.37;
const HEYGEN_API_BASE = "https://api.heygen.com";

function buildVideoAgentPrompt(inputs, scenePlan, scriptText) {
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
      .map((scene) => `${scene.number}. ${scene.title} (${scene.duration}) - ${scene.script}`)
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
    "",
    "Make the result concise, polished, and impressive enough for a live hackathon judging demo.",
  ].join("\n");
}

async function heygenFetch(path, init) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new Error("HEYGEN_API_KEY is not configured on the server.");
  }

  const response = await fetch(`${HEYGEN_API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(init.headers || {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || `HeyGen request failed (${response.status})`);
  }
  return json;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { inputs, scenePlan, scriptText } = body;
    if (!inputs || !Array.isArray(scenePlan) || !scriptText) {
      return json(400, { error: "Missing generation payload." });
    }

    const create = await heygenFetch("/v3/video-agents", {
      method: "POST",
      body: JSON.stringify({
        prompt: buildVideoAgentPrompt(inputs, scenePlan, scriptText),
        title: `${inputs.productName || "DemoGenie"} product demo`,
      }),
    });

    const sessionId = create.data?.session_id ?? null;
    const videoId = create.data?.video_id ?? null;
    let status = create.data?.status ?? "pending";
    let videoUrl = null;
    let durationSeconds = null;

    if (videoId) {
      await new Promise((resolve) => setTimeout(resolve, 4_000));
      const video = await heygenFetch(`/v3/videos/${videoId}`, { method: "GET" });
      status = video.data?.status ?? status;
      if (video.data?.duration) durationSeconds = Math.round(video.data.duration);
      if (video.data?.status === "completed" && video.data.video_url) {
        videoUrl = video.data.video_url;
        status = "success";
      }
      if (video.data?.status === "failed") {
        throw new Error(video.data.failure_message || "HeyGen video generation failed.");
      }
    }

    return json(200, {
      sessionId,
      videoId,
      status,
      videoUrl,
      durationSeconds,
      estimatedCostUsd: LIVE_GENERATION_COST_USD,
      agentSteps: [
        "OK Product context captured.",
        `OK ${inputs.tone} three-scene outline created.`,
        "OK Narration script generated.",
        "OK HeyGen Video Agent request submitted.",
        videoUrl
          ? "OK HeyGen render complete."
          : "-> HeyGen render is still processing. Reopen History to refresh when complete.",
      ],
    });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : "Generation failed." });
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
