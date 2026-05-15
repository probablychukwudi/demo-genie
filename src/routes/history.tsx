import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icons";
import { listGenerations } from "@/lib/generations.functions";
import { rowToGeneration, relativeTime } from "@/lib/mockData";
import type { Generation } from "@/lib/types";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "DemoGenie — Past Demos" },
      {
        name: "description",
        content: "Every demo you've generated, with quick links to preview and republish.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const listFn = useServerFn(listGenerations);
  const [rows, setRows] = useState<Generation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFn({})
      .then((res) =>
        setRows((res.rows as Record<string, unknown>[]).map(rowToGeneration))
      )
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [listFn]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-glow text-accent">
          <Icon.Clock className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Past Demos</h1>
      </header>

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
          {rows.map((g) => (
            <HistoryCard key={g.id} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ g }: { g: Generation }) {
  const dur = g.durationSeconds ? `${g.durationSeconds}s` : "—";
  return (
    <div className="flex items-stretch gap-4 rounded-xl border border-border bg-card p-3 transition hover:border-foreground/20">
      <div className="relative flex h-20 w-36 shrink-0 items-center justify-center overflow-hidden rounded-md"
           style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2d1b69 100%)" }}>
        <Icon.Play className="h-6 w-6 text-foreground/80" />
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <div className="font-semibold">{g.productName}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {g.template && (
            <span className="rounded-md border border-border px-2 py-0.5">{g.template}</span>
          )}
          <span>{g.scenePlan.length || 3} scenes · {dur}</span>
          <span>·</span>
          <span>{relativeTime(g.createdAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusChip status={g.status} />
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
          aria-label="Open in new tab"
        >
          <Icon.External className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: Generation["status"] }) {
  const map = {
    success: { label: "Success", cls: "bg-success/15 text-success" },
    stopped: { label: "Stopped", cls: "bg-warning/15 text-warning" },
    failed: { label: "Failed", cls: "bg-error/15 text-error" },
    pending: { label: "Pending", cls: "bg-muted text-muted-foreground" },
  } as const;
  const m = map[status] ?? map.pending;
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-medium ${m.cls}`}>{m.label}</span>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <rect x="14" y="22" width="44" height="36" rx="4" stroke="#7c3aed" strokeWidth="1.5" />
        <path d="M58 32 L70 26 L70 54 L58 48 Z" stroke="#7c3aed" strokeWidth="1.5" />
        <path d="M62 12 L64 17 L69 19 L64 21 L62 26 L60 21 L55 19 L60 17 Z" fill="#7c3aed" opacity="0.5" />
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
