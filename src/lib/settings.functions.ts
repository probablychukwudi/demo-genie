import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export interface PublicSettings {
  heygenKeyConfigured: boolean;
  heygenKeyLast4: string | null;
  mockMode: boolean;
  defaultTone: string;
  defaultLanguage: string;
  defaultTemplate: string;
}

async function ensureSettingsRow() {
  await supabaseAdmin
    .from("settings")
    .upsert({ id: "global" }, { onConflict: "id", ignoreDuplicates: true });
}

export const getSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSettings> => {
    await ensureSettingsRow();
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("id", "global")
      .single();
    if (error) throw new Error(error.message);
    // Server-side env-key takes precedence: if present, treat as configured.
    const envKey = process.env.HEYGEN_API_KEY;
    const envLast4 = envKey ? envKey.slice(-4) : null;
    return {
      heygenKeyConfigured: Boolean(envKey) || (data.heygen_key_configured as boolean),
      heygenKeyLast4: envLast4 ?? (data.heygen_key_last4 as string | null),
      mockMode: data.mock_mode as boolean,
      defaultTone: data.default_tone as string,
      defaultLanguage: data.default_language as string,
      defaultTemplate: data.default_template as string,
    };
  }
);

const SaveSettingsSchema = z.object({
  mockMode: z.boolean().optional(),
  defaultTone: z.string().min(1).max(40).optional(),
  defaultLanguage: z.string().min(1).max(40).optional(),
  defaultTemplate: z.string().min(1).max(60).optional(),
  // If provided, store metadata only — never the raw key in DB
  heygenKey: z.string().min(8).max(200).optional(),
});

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SaveSettingsSchema.parse(input))
  .handler(async ({ data }): Promise<PublicSettings> => {
    await ensureSettingsRow();
    const update: Record<string, unknown> = {};
    if (data.mockMode !== undefined) update.mock_mode = data.mockMode;
    if (data.defaultTone) update.default_tone = data.defaultTone;
    if (data.defaultLanguage) update.default_language = data.defaultLanguage;
    if (data.defaultTemplate) update.default_template = data.defaultTemplate;
    if (data.heygenKey) {
      // NOTE: For v1, the HeyGen key is configured server-side via the
      // HEYGEN_API_KEY secret. This UI path only records "configured" + last4.
      update.heygen_key_configured = true;
      update.heygen_key_last4 = data.heygenKey.slice(-4);
    }

    if (Object.keys(update).length > 0) {
      const { error } = await supabaseAdmin
        .from("settings")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(update as any)
        .eq("id", "global");
      if (error) throw new Error(error.message);
    }

    // Return fresh state via getSettings logic (re-read)
    const { data: row, error: e2 } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("id", "global")
      .single();
    if (e2) throw new Error(e2.message);

    const envKey = process.env.HEYGEN_API_KEY;
    return {
      heygenKeyConfigured: Boolean(envKey) || (row.heygen_key_configured as boolean),
      heygenKeyLast4: envKey ? envKey.slice(-4) : (row.heygen_key_last4 as string | null),
      mockMode: row.mock_mode as boolean,
      defaultTone: row.default_tone as string,
      defaultLanguage: row.default_language as string,
      defaultTemplate: row.default_template as string,
    };
  });
