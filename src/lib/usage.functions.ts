import { createServerFn } from "@tanstack/react-start";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { seedGenerationRows } from "@/lib/mockData";

const HACKATHON_BUDGET_USD = 50;
const INITIAL_SPEND_USD = 1.37;

function hasSupabaseAdminEnv() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function summarizeLiveRows(rows: Array<Record<string, unknown>>) {
  const liveRows = rows.filter((row) => row.generation_mode === "live");
  return {
    liveGenerations: liveRows.length,
    liveSpend: liveRows.reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0),
    lastGenerationCostUsd: liveRows.length ? Number(liveRows[0].cost_usd ?? 0) : null,
  };
}

export interface UsageSummary {
  budgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  liveGenerations: number;
  lastGenerationCostUsd: number | null;
  mockMode: boolean;
  heygenConfigured: boolean;
}

export const getUsageSummary = createServerFn({ method: "GET" }).handler(
  async (): Promise<UsageSummary> => {
    let liveSpend = 0;
    let liveGenerations = 0;
    let lastGenerationCostUsd: number | null = null;
    let mockMode = true;

    if (hasSupabaseAdminEnv()) {
      const [{ data: generations }, { data: settings }] = await Promise.all([
        supabaseAdmin
          .from("generations")
          .select("cost_usd, generation_mode, created_at")
          .eq("generation_mode", "live")
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("settings").select("mock_mode").eq("id", "global").maybeSingle(),
      ]);

      const rows = generations ?? [];
      const summary = summarizeLiveRows(rows.length ? rows : seedGenerationRows());
      liveGenerations = summary.liveGenerations;
      liveSpend = summary.liveSpend;
      lastGenerationCostUsd = summary.lastGenerationCostUsd;
      mockMode = settings?.mock_mode ?? true;
    } else {
      const summary = summarizeLiveRows(seedGenerationRows());
      liveGenerations = summary.liveGenerations;
      liveSpend = summary.liveSpend;
      lastGenerationCostUsd = summary.lastGenerationCostUsd;
    }

    const spentUsd = Number((INITIAL_SPEND_USD + liveSpend).toFixed(2));
    const remainingUsd = Number(Math.max(0, HACKATHON_BUDGET_USD - spentUsd).toFixed(2));

    return {
      budgetUsd: HACKATHON_BUDGET_USD,
      spentUsd,
      remainingUsd,
      liveGenerations,
      lastGenerationCostUsd,
      mockMode,
      heygenConfigured: Boolean(process.env.HEYGEN_API_KEY),
    };
  },
);
