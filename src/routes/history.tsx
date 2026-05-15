import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/Icons";
import { listGenerations } from "@/lib/generations.functions";
import { rowToGeneration, relativeTime, seedGenerationRows } from "@/lib/mockData";
import type { Generation, GenerationInputs } from "@/lib/types";
import { copyText, exportVideo } from "@/lib/videoExport";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "DemoGenie — Demo Library" },
      {
        name: "description",
        content: "Every demo output and reusable product input you've generated.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const listFn = useServerFn(listGenerations);
  const [rows, setRows] = useState<Generation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"outputs" | "inputs">("outputs");

  useEffect(() => {
    listFn({})
      .then((res) => setRows((res.rows as Record<string, unknown>[]).map(rowToGeneration)))
      .catch(() => {
        setRows(seedGenerationRows().map(rowToGeneration));
        setError(null);
      });
  }, [listFn]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="mb-8 flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-md bg-accent-glow text-accent">
          <Icon.Clock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Demo Library</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Reopen rendered videos, export outputs, or reload saved inputs into the workspace.
          </p>
        </div>
      </header>

      <div className="mb-5 inline-flex rounded-lg border border-border bg-card p-1">
        {[
          ["outputs", "Past Demo Outputs"],
          ["inputs", "Past Demo Inputs"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value as "outputs" | "inputs")}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              mode === value
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-md border border-error/40 p-4 text-error">{error}</div>}

      {rows === null && !error && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      )}

      {rows && rows.length === 0 && <Empty />}

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((g) =>
            mode === "outputs" ? (
              <HistoryOutputCard key={g.id} g={g} onViewInput={() => setMode("inputs")} />
            ) : (
              <HistoryInputCard key={g.id} g={g} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function HistoryOutputCard({ g, onViewInput }: { g: Generation; onViewInput: () => void }) {
  const dur = g.durationSeconds ? `${g.durationSeconds}s` : "—";
  const canPreview = g.status === "success" && Boolean(g.videoUrl);
  const visual = getDemoVisual(g);
  const tagline = g.brief?.split(/(?<=\.)\s/)[0] ?? "No brief captured for this render.";
  const previewUrl =
    typeof window === "undefined"
      ? `/preview/${g.slug}`
      : `${window.location.origin}/preview/${g.slug}`;

  return (
    <div className="grid gap-5 rounded-xl border border-border bg-card p-3 transition hover:border-foreground/20 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
      <DemoThumbnail g={g} visual={visual} />

      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate font-semibold">{g.productName}</div>
          {canPreview && (
            <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
              <Icon.Play className="h-3 w-3" />
              Published
            </span>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{tagline}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {g.template && (
            <span className="rounded-md border border-border px-2 py-0.5">{g.template}</span>
          )}
          <span>
            {g.scenePlan.length || 3} scenes · {dur}
          </span>
          <span>·</span>
          <span>{relativeTime(g.createdAt)}</span>
          {g.viewCount > 0 && (
            <>
              <span>·</span>
              <span>
                {g.viewCount} view{g.viewCount === 1 ? "" : "s"}
              </span>
            </>
          )}
          {g.costUsd != null && g.costUsd > 0 && (
            <>
              <span>·</span>
              <span>${g.costUsd.toFixed(2)}</span>
            </>
          )}
          <span>·</span>
          <span>{g.generationMode === "live" ? "HeyGen live" : "Mock safe"}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <StatusChip status={g.status} />
        {canPreview ? (
          <>
            <Link
              to="/preview/$slug"
              params={{ slug: g.slug }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-elevated"
            >
              Open
            </Link>
            <a
              href={`/preview/${g.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground"
              aria-label={`Open ${g.productName} preview in new tab`}
            >
              <Icon.External className="h-4 w-4" />
            </a>
            <ActionMenu
              actions={[
                {
                  label: "Export MP4",
                  icon: "Download",
                  onClick: () => void exportVideo(g.videoUrl ?? "", g.productName),
                },
                {
                  label: "Copy Link",
                  icon: "Copy",
                  onClick: async () => {
                    const ok = await copyText(previewUrl);
                    toast[ok ? "success" : "error"](ok ? "Link copied!" : "Copy failed");
                  },
                },
                {
                  label: "View Input",
                  icon: "FileText",
                  onClick: onViewInput,
                },
                {
                  label: "Regenerate",
                  icon: "Refresh",
                  onClick: () => loadInWorkspace(g, "regenerate"),
                },
              ]}
            />
          </>
        ) : (
          <span
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground"
            title="Regenerate this demo before publishing"
          >
            Needs render
          </span>
        )}
      </div>
    </div>
  );
}

function HistoryInputCard({ g }: { g: Generation }) {
  const tagline = g.brief?.split(/(?<=\.)\s/)[0] ?? "No brief captured.";

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition hover:border-foreground/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold">{g.productName}</h2>
            {g.template && (
              <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                {g.template}
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">{tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {g.productUrl && <span className="truncate">{g.productUrl}</span>}
            <span>·</span>
            <span>{g.audience ?? "Audience not set"}</span>
            <span>·</span>
            <span>{g.tone ?? "Tone not set"}</span>
            <span>·</span>
            <span>{g.language ?? "Language not set"}</span>
            <span>·</span>
            <span>{relativeTime(g.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => loadInWorkspace(g, "load")}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-elevated"
          >
            <Icon.FileText className="h-4 w-4" />
            Load in Workspace
          </button>
          <button
            type="button"
            onClick={() => loadInWorkspace(g, "generate")}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover"
          >
            <Icon.Sparkles className="h-4 w-4" />
            Generate
          </button>
          <button
            type="button"
            onClick={() => loadInWorkspace(g, "duplicate")}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-elevated"
          >
            <Icon.Copy className="h-4 w-4" />
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
}

interface ActionItem {
  label: string;
  icon: keyof typeof Icon;
  onClick: () => void;
}

function ActionMenu({ actions }: { actions: ActionItem[] }) {
  return (
    <details className="relative">
      <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-elevated hover:text-foreground">
        <Icon.More className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-elevated p-1 shadow-2xl">
        {actions.map((action) => {
          const IconC = Icon[action.icon];
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-card"
            >
              <IconC className="h-4 w-4 text-muted-foreground" />
              {action.label}
            </button>
          );
        })}
      </div>
    </details>
  );
}

function loadInWorkspace(g: Generation, action: "load" | "generate" | "duplicate" | "regenerate") {
  const inputs: GenerationInputs = {
    productName: action === "duplicate" ? `${g.productName} Copy` : g.productName,
    url: g.productUrl ?? "",
    readme: "",
    changelog: "",
    brief: g.brief ?? "",
    ctaText: g.ctaText ?? "Start now",
    audience: g.audience ?? "Product teams",
    tone: (g.tone as GenerationInputs["tone"]) ?? "Confident",
    language: (g.language as GenerationInputs["language"]) ?? "English",
    template: (g.template as GenerationInputs["template"]) ?? "Product Launch",
  };
  window.sessionStorage.setItem(
    "demogenie:workspace-intent",
    JSON.stringify({
      action,
      inputs,
    }),
  );
  window.location.href = "/";
}

function DemoThumbnail({ g, visual }: { g: Generation; visual: DemoVisual }) {
  const canPreview = g.status === "success" && Boolean(g.videoUrl);
  const sceneCount = g.scenePlan.length || (canPreview ? 3 : 1);

  return (
    <div
      className="relative flex aspect-video min-h-28 w-full overflow-hidden rounded-lg border border-white/10 shadow-inner"
      style={{
        background:
          `radial-gradient(circle at 20% 12%, ${visual.glow} 0, transparent 32%), ` +
          `linear-gradient(135deg, ${visual.from}, ${visual.to})`,
      }}
    >
      <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(90deg,#fff_1px,transparent_1px),linear-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative flex w-full flex-col justify-between p-3 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-sm font-semibold backdrop-blur">
            {getInitials(g.productName)}
          </div>
          <span className="rounded-full bg-black/25 px-2 py-1 text-[10px] font-medium uppercase tracking-wider backdrop-blur">
            {g.status}
          </span>
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
            {g.template ?? "Demo"}
          </div>
          <div className="mt-1 truncate text-lg font-semibold leading-tight">{g.productName}</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/18">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: canPreview ? "78%" : g.status === "stopped" ? "46%" : "22%" }}
              />
            </div>
            <span className="text-[11px] text-white/80">
              {sceneCount} scene{sceneCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 grid place-items-center">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white shadow-lg backdrop-blur ${
            canPreview ? "" : "opacity-70"
          }`}
        >
          {canPreview ? <Icon.Play className="h-4 w-4" /> : <Icon.Alert className="h-4 w-4" />}
        </span>
      </div>
    </div>
  );
}

interface DemoVisual {
  from: string;
  to: string;
  glow: string;
}

function getDemoVisual(g: Generation): DemoVisual {
  const visuals: DemoVisual[] = [
    { from: "#5137d9", to: "#1f7df3", glow: "rgba(125, 92, 255, 0.95)" },
    { from: "#111827", to: "#0f766e", glow: "rgba(45, 212, 191, 0.82)" },
    { from: "#312e81", to: "#f97316", glow: "rgba(251, 146, 60, 0.85)" },
    { from: "#0f172a", to: "#2563eb", glow: "rgba(96, 165, 250, 0.9)" },
    { from: "#18181b", to: "#71717a", glow: "rgba(244, 244, 245, 0.72)" },
    { from: "#581c87", to: "#be185d", glow: "rgba(244, 114, 182, 0.82)" },
  ];
  if (g.status === "failed") {
    return { from: "#3f1d24", to: "#7f1d1d", glow: "rgba(248, 113, 113, 0.65)" };
  }
  if (g.status === "stopped") {
    return { from: "#422006", to: "#92400e", glow: "rgba(251, 191, 36, 0.7)" };
  }
  const index = hashString(g.productName) % visuals.length;
  return visuals[index];
}

function hashString(value: string): number {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "DG";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function StatusChip({ status }: { status: Generation["status"] }) {
  const map = {
    success: { label: "Success", cls: "bg-success/15 text-success" },
    stopped: { label: "Stopped", cls: "bg-warning/15 text-warning" },
    failed: { label: "Failed", cls: "bg-error/15 text-error" },
    pending: { label: "Pending", cls: "bg-muted text-muted-foreground" },
  } as const;
  const m = map[status] ?? map.pending;
  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${m.cls}`}>{m.label}</span>;
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <rect x="14" y="22" width="44" height="36" rx="4" stroke="#7c3aed" strokeWidth="1.5" />
        <path d="M58 32 L70 26 L70 54 L58 48 Z" stroke="#7c3aed" strokeWidth="1.5" />
        <path
          d="M62 12 L64 17 L69 19 L64 21 L62 26 L60 21 L55 19 L60 17 Z"
          fill="#7c3aed"
          opacity="0.5"
        />
      </svg>
      <div className="text-lg font-medium">No demos yet.</div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
      >
        <Icon.Wand className="h-4 w-4" /> Generate your first
      </Link>
    </div>
  );
}
