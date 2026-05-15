import type { PublicSettings } from "@/lib/settings.functions";

type ServerFn<TInput, TOutput> = (args: { data?: TInput }) => Promise<TOutput>;

async function fetchJson<TOutput>(path: string, init?: RequestInit): Promise<TOutput | null> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  const json = (await response.json()) as TOutput & { error?: string };
  if (!response.ok) {
    throw new Error(json.error || `Request failed (${response.status})`);
  }
  return json;
}

export async function getRuntimeSettings(
  fallback: (args: Record<string, never>) => Promise<PublicSettings>,
) {
  const settings = await fetchJson<PublicSettings>("/api/settings").catch(() => null);
  return settings ?? fallback({});
}

export async function saveRuntimeSettings(
  patch: Partial<PublicSettings> & { heygenKey?: string },
  fallback: ServerFn<typeof patch, PublicSettings>,
) {
  const settings = await fetchJson<PublicSettings>("/api/settings", {
    method: "POST",
    body: JSON.stringify(patch),
  }).catch(() => null);
  return settings ?? fallback({ data: patch });
}

export async function createRuntimeLiveGeneration<TInput, TOutput>(
  payload: TInput,
  fallback: ServerFn<TInput, TOutput>,
) {
  const result = await fetchJson<TOutput>("/api/heygen-live-generation", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return result ?? fallback({ data: payload });
}

export async function saveRuntimeGeneration<TInput, TOutput>(
  payload: TInput,
  fallback: ServerFn<TInput, TOutput>,
) {
  const result = await fetchJson<TOutput>("/api/save-generation", {
    method: "POST",
    body: JSON.stringify(payload),
  }).catch(() => null);
  return result ?? fallback({ data: payload });
}

export async function getRuntimeHeyGenVideoStatus(videoId: string) {
  return fetchJson<{
    status: string;
    videoUrl: string | null;
    durationSeconds: number | null;
  }>(`/api/heygen-video-status?videoId=${encodeURIComponent(videoId)}`).catch(() => null);
}
