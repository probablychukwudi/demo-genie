const HEYGEN_API_BASE = "https://api.heygen.com";

async function heygenFetch(path) {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    throw new Error("HEYGEN_API_KEY is not configured on the server.");
  }

  const response = await fetch(`${HEYGEN_API_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.message || `HeyGen request failed (${response.status})`);
  }
  return json;
}

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const videoId = event.queryStringParameters?.videoId;
    if (!videoId) return json(400, { error: "Missing videoId." });

    const video = await heygenFetch(`/v3/videos/${encodeURIComponent(videoId)}`);
    if (video.data?.status === "failed") {
      throw new Error(video.data.failure_message || "HeyGen video generation failed.");
    }

    return json(200, {
      status: video.data?.status ?? "pending",
      videoUrl: video.data?.video_url ?? null,
      durationSeconds: video.data?.duration ? Math.round(video.data.duration) : null,
    });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : "Status check failed." });
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
