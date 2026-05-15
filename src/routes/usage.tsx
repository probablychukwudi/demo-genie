import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icons";
import { seedGenerationRows } from "@/lib/mockData";
import { getUsageSummary, type UsageSummary } from "@/lib/usage.functions";

export const Route = createFileRoute("/usage")({
  head: () => ({
    meta: [
      { title: "DemoGenie — Usage" },
      {
        name: "description",
        content: "Track DemoGenie live HeyGen spend and hackathon budget usage.",
      },
    ],
  }),
  component: UsagePage,
});

function UsagePage() {
  const getUsage = useServerFn(getUsageSummary);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUsage({})
      .then(setSummary)
      .catch(() => {
        const liveRows = seedGenerationRows().filter((row) => row.generation_mode === "live");
        const liveSpend = liveRows.reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0);
        const spentUsd = Number((1.37 + liveSpend).toFixed(2));
        setSummary({
          budgetUsd: 50,
          spentUsd,
          remainingUsd: Number(Math.max(0, 50 - spentUsd).toFixed(2)),
          liveGenerations: liveRows.length,
          lastGenerationCostUsd: liveRows.length ? Number(liveRows[0].cost_usd ?? 0) : null,
          mockMode: true,
          heygenConfigured: false,
        });
        setError(null);
      });
  }, [getUsage]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-8 py-10">
        <div className="rounded-xl border border-error/40 bg-card p-5 text-error">{error}</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="mx-auto max-w-4xl px-8 py-10">
        <div className="h-10 w-48 animate-pulse rounded bg-card" />
        <div className="mt-8 h-52 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    );
  }

  const percent = Math.min(100, (summary.spentUsd / summary.budgetUsd) * 100);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="mb-8 flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-md bg-accent-glow text-accent">
          <Icon.Usage className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Usage</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Track live HeyGen generations against the hackathon credit budget.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Hackathon budget</div>
            <div className="mt-2 text-4xl font-semibold tracking-tight">
              ${summary.spentUsd.toFixed(2)}
              <span className="text-lg font-medium text-muted-foreground">
                {" "}
                of ${summary.budgetUsd.toFixed(2)} spent
              </span>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
              summary.mockMode ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
            }`}
          >
            {summary.mockMode ? (
              <Icon.Check className="h-3 w-3" />
            ) : (
              <Icon.Alert className="h-3 w-3" />
            )}
            {summary.mockMode ? "Mock mode active" : "Live mode active"}
          </span>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-elevated">
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Remaining" value={`$${summary.remainingUsd.toFixed(2)}`} />
          <Metric label="Live generations" value={`${summary.liveGenerations}`} />
          <Metric
            label="Last generation"
            value={
              summary.lastGenerationCostUsd === null
                ? "—"
                : `$${summary.lastGenerationCostUsd.toFixed(2)}`
            }
          />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Live generation readiness</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              DemoGenie keeps the HeyGen key server-side and uses mock mode until live generation is
              enabled in Settings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-md px-2 py-1 text-xs font-medium ${
                summary.heygenConfigured
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              }`}
            >
              {summary.heygenConfigured ? "HeyGen key configured" : "Server key missing"}
            </span>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-elevated"
            >
              <Icon.Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
