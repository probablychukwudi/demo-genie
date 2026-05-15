import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/Icons";
import { getRuntimeSettings, saveRuntimeSettings } from "@/lib/netlifyRuntime";
import { getSettings, saveSettings, type PublicSettings } from "@/lib/settings.functions";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "DemoGenie — Settings" },
      { name: "description", content: "Manage HeyGen integration, mock mode, and demo defaults." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const getFn = useServerFn(getSettings);
  const saveFn = useServerFn(saveSettings);

  const [s, setS] = useState<PublicSettings | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  useEffect(() => {
    getRuntimeSettings(getFn)
      .then(setS)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [getFn]);

  if (!s) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-10">
        <div className="h-8 w-40 animate-pulse rounded bg-card" />
      </div>
    );
  }

  async function persist(
    patch: Partial<{
      mockMode: boolean;
      defaultTone: string;
      defaultLanguage: string;
      defaultTemplate: string;
      heygenKey: string;
    }>,
  ) {
    setSaving(true);
    try {
      const next = await saveRuntimeSettings(patch, saveFn);
      setS(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveKey() {
    if (!keyInput || keyInput.length < 8) {
      toast.error("Enter a valid HeyGen key");
      return;
    }
    await persist({ heygenKey: keyInput });
    setKeyInput("");
    toast.success("Settings saved");
  }

  async function handleSaveAll() {
    if (!s) return;
    await persist({
      mockMode: s.mockMode,
      defaultTone: s.defaultTone,
      defaultLanguage: s.defaultLanguage,
      defaultTemplate: s.defaultTemplate,
    });
    toast.success("Settings saved");
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-glow text-accent">
          <Icon.Settings className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
      </header>

      {/* HeyGen */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">HeyGen</h2>
          {s.heygenKeyConfigured ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-1 text-xs text-success">
              <Icon.Check className="h-3 w-3" /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-2 py-1 text-xs text-warning">
              <Icon.Alert className="h-3 w-3" /> Not configured
            </span>
          )}
        </div>
        <label
          htmlFor="heygen-api-key"
          className="mt-4 block text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          HeyGen API Key
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="heygen-api-key"
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={
              s.heygenKeyLast4 ? `hg_live_••••${s.heygenKeyLast4}` : "hg_live_••••••••••"
            }
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleSaveKey}
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
          >
            Save key
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          All generation calls are server-side. Your key is never sent to the browser.
        </p>
      </section>

      {/* Appearance */}
      <section className="mt-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Appearance</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Switch between DemoGenie's dark and light interface.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              {theme === "dark" ? (
                <Icon.Moon className="h-4 w-4" />
              ) : (
                <Icon.Sun className="h-4 w-4" />
              )}
              {theme === "dark" ? "Dark" : "Light"}
            </span>
            <Toggle
              value={theme === "light"}
              label="Light Mode"
              onChange={(enabled) => {
                setTheme(enabled ? "light" : "dark");
                toast.success(`${enabled ? "Light" : "Dark"} mode enabled`);
              }}
            />
          </div>
        </div>
      </section>

      {/* Mock mode */}
      <section className="mt-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Mock Mode</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use mock video (no HeyGen credits)</p>
          </div>
          <Toggle
            value={s.mockMode}
            label="Mock Mode"
            onChange={(v) => {
              setS({ ...s, mockMode: v });
              void persist({ mockMode: v });
            }}
          />
        </div>
        {!s.mockMode && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-warning/10 px-3 py-1.5 text-xs text-warning">
            <Icon.Alert className="h-3 w-3" />
            Live mode uses HeyGen credits per generation
          </div>
        )}
      </section>

      {/* Defaults */}
      <section className="mt-4 rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold">Defaults</h2>

        <div className="mb-4">
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Default tone
          </div>
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            {["Confident", "Friendly", "Technical"].map((t) => (
              <button
                key={t}
                onClick={() => setS({ ...s, defaultTone: t })}
                className={`rounded px-3 py-1.5 text-sm transition ${
                  s.defaultTone === t
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Default language
          </div>
          <select
            value={s.defaultLanguage}
            onChange={(e) => setS({ ...s, defaultLanguage: e.target.value })}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {["English", "Spanish", "French", "German", "Japanese"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Default template
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Product Launch", "Feature Update", "API Demo"].map((t) => {
              const sel = s.defaultTemplate === t;
              return (
                <button
                  key={t}
                  onClick={() => setS({ ...s, defaultTemplate: t })}
                  className={`rounded-md border px-3 py-2 text-sm transition ${
                    sel
                      ? "border-accent bg-accent-glow"
                      : "border-border bg-background hover:border-foreground/30"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <button
        onClick={handleSaveAll}
        disabled={saving}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
      >
        {saving ? (
          <Icon.Loader className="h-4 w-4 animate-spin" />
        ) : (
          <Icon.Check className="h-4 w-4" />
        )}
        Save All
      </button>
    </div>
  );
}

function Toggle({
  value,
  label,
  onChange,
}: {
  value: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 rounded-full transition ${value ? "bg-accent" : "bg-elevated"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-foreground transition ${
          value ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
