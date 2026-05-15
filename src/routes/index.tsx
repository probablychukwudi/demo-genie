import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { Icon } from "@/components/Icons";
import { VideoPlayer } from "@/components/VideoPlayer";
import {
  AGENT_STEPS,
  MOCK_VIDEO_URL,
  type GenerationInputs,
  type Scene,
  type Tone,
  type Language,
  type Template,
} from "@/lib/types";
import {
  SEED_INPUTS,
  buildScenePlan,
  buildScriptText,
  generateMockGeneration,
  makeSlug,
  mockFetchProduct,
} from "@/lib/mockData";
import { saveGeneration } from "@/lib/generations.functions";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DemoGenie — Workspace" },
      {
        name: "description",
        content:
          "Generate a shareable product demo video from any URL in 90 seconds.",
      },
    ],
  }),
  component: Workspace,
});

type Phase = "idle" | "running" | "stopped" | "success" | "error";

function Workspace() {
  const setLiveSlug = useAppStore((s) => s.setLiveSlug);
  const saveGenerationFn = useServerFn(saveGeneration);

  const [inputs, setInputs] = useState<GenerationInputs>(SEED_INPUTS);
  const [fetching, setFetching] = useState(false);

  // Seed the right panel with a fully-completed mock generation so all states
  // (agent log, scene plan, video, publish receipt) are visible on first load.
  const seededScenes = useMemo(() => buildScenePlan(SEED_INPUTS), []);
  const seededScript = useMemo(
    () => buildScriptText(SEED_INPUTS, seededScenes),
    [seededScenes]
  );
  const seededLog = useMemo(
    () => [
      ...AGENT_STEPS.map((s) => s.replace("{{tone}}", SEED_INPUTS.tone)),
      "✓ Generation complete. Duration: 8.3s",
    ],
    []
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [logLines, setLogLines] = useState<string[]>(seededLog);
  const [scenePlan, setScenePlan] = useState<Scene[]>(seededScenes);
  const [scenesScripted, setScenesScripted] = useState(true);
  const [videoReady, setVideoReady] = useState(true);
  const [scriptText, setScriptText] = useState<string>(seededScript);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);

  const [published, setPublished] = useState<{ slug: string; views: number } | null>({
    slug: "acme-x42z",
    views: 247,
  });

  const [drawerScene, setDrawerScene] = useState<Scene | null>(null);
  const [splitPct, setSplitPct] = useState(42);

  const stopRef = useRef(false);
  const logBoxRef = useRef<HTMLDivElement>(null);

  // ----- View counter for the published demo (tick every 7s for "live" feel) -----
  useEffect(() => {
    if (!published) return;
    const id = window.setInterval(() => {
      setPublished((p) => (p ? { ...p, views: p.views + 1 } : p));
    }, 7000);
    return () => window.clearInterval(id);
  }, [published]);

  // Auto-scroll the log
  useEffect(() => {
    const el = logBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logLines]);

  function setField<K extends keyof GenerationInputs>(key: K, value: GenerationInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFetchUrl() {
    if (!inputs.url) {
      toast.error("Add a product URL first.");
      return;
    }
    setFetching(true);
    await new Promise((r) => setTimeout(r, 1400));
    const out = mockFetchProduct(inputs.url);
    setInputs((prev) => ({
      ...prev,
      productName: out.productName,
      brief: out.brief,
    }));
    setFetching(false);
    toast.success(`Fetched ${out.productName}`);
  }

  function resetOutput() {
    setLogLines([]);
    setScenePlan([]);
    setScenesScripted(false);
    setVideoReady(false);
    setScriptText("");
    setStoppedAt(null);
    setPublished(null);
  }

  async function streamGeneration(): Promise<{ stopped: boolean }> {
    stopRef.current = false;
    const lines = AGENT_STEPS.map((s) => s.replace("{{tone}}", inputs.tone));
    let plannedScenes: Scene[] | null = null;
    let scriptDraft = "";

    for (let i = 0; i < lines.length; i++) {
      if (stopRef.current) {
        setStoppedAt(i);
        return { stopped: true };
      }
      // mock streaming delay
      const delay = 900 + Math.floor(Math.random() * 400);
      await new Promise((r) => setTimeout(r, delay));
      if (stopRef.current) {
        setStoppedAt(i);
        return { stopped: true };
      }
      setLogLines((prev) => [...prev, lines[i]]);

      // After "Writing scene plan" (index 3), reveal the scene cards.
      if (i === 3) {
        plannedScenes = buildScenePlan(inputs);
        setScenePlan(plannedScenes);
      }
      // After "Generating script" (index 4), flip cards to "Scripted ✓".
      if (i === 4 && plannedScenes) {
        scriptDraft = buildScriptText(inputs, plannedScenes);
        setScriptText(scriptDraft);
        setScenesScripted(true);
      }
      // After last step, reveal the video.
      if (i === 5) {
        setVideoReady(true);
      }
    }
    setLogLines((prev) => [...prev, "✓ Generation complete. Duration: 8.3s"]);
    return { stopped: false };
  }

  async function handleGenerate() {
    if (phase === "running") return;
    resetOutput();
    setPhase("running");

    try {
      const { stopped } = await streamGeneration();
      if (stopped) {
        setPhase("stopped");
        toast.warning("Generation stopped");
        return;
      }
      setPhase("success");
      // Brief green flash via phase
      window.setTimeout(() => setPhase("idle"), 700);
    } catch {
      setPhase("error");
      toast.error("Generation failed. Check your inputs.");
    }
  }

  function handleStop() {
    stopRef.current = true;
  }

  function handleRestart() {
    void handleGenerate();
  }

  async function handlePublish() {
    if (!videoReady || scenePlan.length === 0) return;
    const draft = generateMockGeneration(inputs);
    try {
      const result = await saveGenerationFn({
        data: {
          slug: draft.slug,
          productName: draft.productName,
          productUrl: inputs.url || null,
          brief: inputs.brief,
          ctaText: inputs.ctaText,
          audience: inputs.audience,
          tone: inputs.tone,
          language: inputs.language,
          template: inputs.template,
          scenePlan: scenePlan,
          scriptText: scriptText,
          videoUrl: MOCK_VIDEO_URL,
          status: "success",
          durationSeconds: 54,
        },
      });
      setPublished({ slug: result.slug, views: 0 });
      setLiveSlug(result.slug);
      toast.success("Demo published — Open Preview ↗", {
        action: {
          label: "Open",
          onClick: () =>
            window.open(`/preview/${result.slug}`, "_blank", "noopener,noreferrer"),
        },
        duration: 4000,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Publish failed";
      toast.error(message);
    }
  }

  function handleDownloadScript() {
    const text =
      `${inputs.productName ?? "Demo"} — Scene Plan\n\n` +
      scenePlan.map((s) => `${s.number} — ${s.title} (${s.duration})\n${s.description}`).join("\n\n") +
      `\n\n— Script —\n\n${scriptText}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(inputs.productName ?? "demo").toLowerCase().replace(/\s+/g, "-")}-script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleShare() {
    const slug = published?.slug ?? makeSlug();
    const url = `${window.location.origin}/preview/${slug}`;
    void navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }

  // ----- Render -----
  const showLog = phase !== "idle" || logLines.length > 0 || scenePlan.length > 0 || videoReady || stoppedAt !== null;

  return (
    <div
      className="flex h-screen w-full flex-col"
      onMouseMove={(e) => {
        if (e.buttons === 1 && resizing.current) {
          const total = window.innerWidth - 56;
          const pct = ((e.clientX - 56) / total) * 100;
          setSplitPct(Math.max(28, Math.min(60, pct)));
        }
      }}
      onMouseUp={() => (resizing.current = false)}
    >
      <div className="flex h-full">
        {/* LEFT — input panel */}
        <section
          className="flex h-full flex-col overflow-y-auto border-r border-border bg-background px-8 py-8"
          style={{ width: `${splitPct}%` }}
        >
          <header className="mb-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-glow text-accent">
                <Icon.Wand className="h-4 w-4" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">New Demo</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ship a demo as fast as you ship code.
            </p>
          </header>

          <div className="space-y-5">
            {/* URL */}
            <Field label="Product URL">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={inputs.url}
                  onChange={(e) => setField("url", e.target.value)}
                  placeholder="https://yourproduct.com"
                  className={inputClass}
                />
                <button
                  onClick={handleFetchUrl}
                  disabled={fetching}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-border bg-elevated px-3 text-sm font-medium text-foreground transition hover:bg-card disabled:opacity-60"
                >
                  {fetching ? (
                    <Icon.Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon.Globe className="h-4 w-4" />
                  )}
                  Fetch
                </button>
              </div>
            </Field>

            <Field label="README / Docs">
              <textarea
                rows={5}
                value={inputs.readme}
                onChange={(e) => setField("readme", e.target.value)}
                className={`${inputClass} font-mono text-[13px] leading-relaxed`}
              />
            </Field>

            <Field label="Latest Changelog">
              <textarea
                rows={4}
                value={inputs.changelog}
                onChange={(e) => setField("changelog", e.target.value)}
                className={`${inputClass} font-mono text-[13px] leading-relaxed`}
              />
            </Field>

            <Field label="Product Brief">
              <textarea
                rows={4}
                value={inputs.brief}
                onChange={(e) => setField("brief", e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="CTA Text">
                <input
                  type="text"
                  value={inputs.ctaText}
                  onChange={(e) => setField("ctaText", e.target.value)}
                  placeholder="Start free trial"
                  className={inputClass}
                />
              </Field>
              <Field label="Target Audience">
                <input
                  type="text"
                  value={inputs.audience}
                  onChange={(e) => setField("audience", e.target.value)}
                  placeholder="Founders, PMs, DevRel teams"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Tone">
              <SegmentedTone value={inputs.tone} onChange={(t) => setField("tone", t)} />
            </Field>

            <Field label="Language">
              <select
                value={inputs.language}
                onChange={(e) => setField("language", e.target.value as Language)}
                className={inputClass}
              >
                {(["English", "Spanish", "French", "German", "Japanese"] as Language[]).map(
                  (l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Template">
              <TemplateRow
                value={inputs.template}
                onChange={(t) => setField("template", t)}
              />
            </Field>

            {/* Generate button */}
            <div className="pt-2">
              <GenerateButton
                phase={phase}
                stoppedAt={stoppedAt}
                onGenerate={handleGenerate}
                onStop={handleStop}
                onRestart={handleRestart}
              />
            </div>
          </div>
        </section>

        {/* DRAG HANDLE */}
        <div
          onMouseDown={() => (resizing.current = true)}
          className="relative w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-accent/40"
        >
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
        </div>

        {/* RIGHT — output panel */}
        <section
          className="flex h-full flex-col overflow-y-auto bg-background px-8 py-8"
          style={{ width: `${100 - splitPct}%` }}
        >
          {!showLog && <EmptyOutput />}

          {/* Section A — Agent log */}
          <AnimatePresence>
            {showLog && (
              <motion.div
                key="log"
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="rounded-xl border border-border"
                style={{ background: "#09090c" }}
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon.Activity className="h-4 w-4" />
                    Agent Trace
                    {phase === "running" && (
                      <span className="ml-1 inline-block h-2 w-2 rounded-full bg-error blink-dot" />
                    )}
                  </div>
                  {phase === "running" && (
                    <button
                      onClick={handleStop}
                      className="inline-flex items-center gap-1 rounded-md border border-error/60 px-2 py-1 text-xs text-error hover:bg-error/10"
                    >
                      <Icon.Stop className="h-3 w-3" /> Stop
                    </button>
                  )}
                </div>
                <div
                  ref={logBoxRef}
                  className="mono-log max-h-[180px] min-h-[180px] overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-mono"
                >
                  {logLines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.18 }}
                      className={
                        line.startsWith("✓") ? "text-success" : "text-mono"
                      }
                    >
                      {line}
                    </motion.div>
                  ))}
                  {stoppedAt !== null && (
                    <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs text-warning">
                      ⏹ Stopped at step {stoppedAt + 1}
                      <button
                        onClick={handleRestart}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        Restart
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section B — Scene plan */}
          <AnimatePresence>
            {scenePlan.length > 0 && (
              <motion.div
                key="scenes"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="mt-6"
              >
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Icon.Film className="h-4 w-4" /> Scene Plan
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {scenePlan.map((s, i) => (
                    <motion.button
                      key={s.number}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.12 }}
                      onClick={() => setDrawerScene(s)}
                      className="group relative flex w-72 shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition hover:border-accent/60"
                    >
                      <div className="inline-flex w-fit items-center gap-1 rounded-md bg-accent-glow px-2 py-0.5 text-xs font-medium text-accent">
                        {s.number}
                      </div>
                      <div className="text-base font-semibold">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.duration}</div>
                      <p className="text-sm text-foreground/85">{s.description}</p>
                      <div className="mt-1">
                        {scenesScripted ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-xs text-success">
                            <Icon.Check className="h-3 w-3" /> Scripted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-elevated px-2 py-0.5 text-xs text-muted-foreground">
                            <Icon.Loader className="h-3 w-3 animate-spin" /> Scripting...
                          </span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section C — Video preview */}
          <AnimatePresence>
            {videoReady && (
              <motion.div
                key="video"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                <VideoPlayer src={MOCK_VIDEO_URL} />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handlePublish}
                    className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover"
                  >
                    <Icon.Upload className="h-4 w-4" /> Publish Demo
                  </button>
                  <button
                    onClick={handleRestart}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm transition hover:bg-card"
                  >
                    <Icon.Refresh className="h-4 w-4" /> Regenerate
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    <Icon.Download className="h-4 w-4" /> Download Script
                  </button>
                  <button
                    onClick={handleShare}
                    className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:text-foreground"
                    aria-label="Copy share link"
                  >
                    <Icon.Share className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section D — Publish confirmation */}
          <AnimatePresence>
            {published && (
              <motion.div
                key="pub"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-success/60 bg-card p-5"
              >
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Icon.Check className="h-5 w-5 text-success" /> Demo published
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-md bg-elevated px-3 py-2 font-mono text-sm">
                  demogenie.app/preview/{published.slug}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <a
                    href={`/preview/${published.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition hover:bg-elevated"
                  >
                    <Icon.External className="h-4 w-4" /> Open Preview
                  </a>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        `${window.location.origin}/preview/${published.slug}`
                      );
                      toast.success("Link copied!");
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-elevated"
                  >
                    <Icon.Copy className="h-4 w-4" /> Copy URL
                  </button>
                  <span className="ml-auto text-sm text-muted-foreground">
                    {published.views} view{published.views === 1 ? "" : "s"}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Scene script drawer */}
      <AnimatePresence>
        {drawerScene && (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerScene(null)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 flex h-full w-[400px] flex-col bg-elevated p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Scene {drawerScene.number}
                  </div>
                  <div className="text-lg font-semibold">{drawerScene.title}</div>
                </div>
                <button
                  onClick={() => setDrawerScene(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <Icon.X className="h-5 w-5" />
                </button>
              </div>
              <div className="text-sm text-muted-foreground">{drawerScene.duration}</div>
              <p className="mt-4 text-sm text-foreground/85">{drawerScene.description}</p>
              <div className="mt-6 rounded-md border border-border bg-card p-4 text-sm leading-relaxed">
                {drawerScene.script ?? "Script will appear here once generated."}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Resizing ref shared across the component instance
const resizing = { current: false };

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

function SegmentedTone({
  value,
  onChange,
}: {
  value: Tone;
  onChange: (t: Tone) => void;
}) {
  const tones: Tone[] = ["Confident", "Friendly", "Technical"];
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
      {tones.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`rounded px-3 py-1.5 text-sm transition ${
            value === t
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function TemplateRow({
  value,
  onChange,
}: {
  value: Template;
  onChange: (t: Template) => void;
}) {
  const templates: { name: Template; desc: string; icon: keyof typeof Icon }[] = [
    { name: "Product Launch", desc: "Hero positioning + 3-act narrative", icon: "Sparkles" },
    { name: "Feature Update", desc: "Show what shipped this week", icon: "Refresh" },
    { name: "API Demo", desc: "Code-first walkthrough", icon: "Activity" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {templates.map((t) => {
        const IconC = Icon[t.icon];
        const selected = value === t.name;
        return (
          <button
            key={t.name}
            type="button"
            onClick={() => onChange(t.name)}
            className={`relative flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition ${
              selected
                ? "border-accent bg-accent-glow"
                : "border-border bg-card hover:border-foreground/30"
            }`}
          >
            <IconC className={`h-4 w-4 ${selected ? "text-accent" : "text-muted-foreground"}`} />
            <div className="text-sm font-medium">{t.name}</div>
            <div className="text-[11px] leading-tight text-muted-foreground">{t.desc}</div>
            {selected && (
              <span className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Icon.Check className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function GenerateButton({
  phase,
  stoppedAt,
  onGenerate,
  onStop,
  onRestart,
}: {
  phase: Phase;
  stoppedAt: number | null;
  onGenerate: () => void;
  onStop: () => void;
  onRestart: () => void;
}) {
  const ellipsis = useEllipsis(phase === "running");

  if (phase === "running") {
    return (
      <div className="flex items-center gap-2">
        <button
          disabled
          className="pulse-violet inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-accent/80 text-base font-medium text-accent-foreground"
        >
          <Icon.Sparkles className="h-4 w-4" />
          Generating{ellipsis}
        </button>
        <button
          onClick={onStop}
          className="inline-flex h-12 items-center gap-1.5 rounded-md border border-error/60 px-4 text-sm text-error hover:bg-error/10"
        >
          <Icon.Stop className="h-4 w-4" /> Stop
        </button>
      </div>
    );
  }

  if (phase === "stopped") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onGenerate}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-accent text-base font-medium text-accent-foreground hover:bg-accent-hover"
        >
          <Icon.Sparkles className="h-4 w-4" /> Generate Demo
        </button>
        <span className="inline-flex items-center gap-1 text-xs text-warning">
          ⏹ Stopped at step {(stoppedAt ?? 0) + 1}
          <button onClick={onRestart} className="underline">
            Restart
          </button>
        </span>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <button
        onClick={onGenerate}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-error bg-card text-base font-medium text-error hover:bg-error/10"
      >
        <Icon.Refresh className="h-4 w-4" /> Generation failed — retry?
      </button>
    );
  }

  return (
    <button
      onClick={onGenerate}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent text-base font-medium text-accent-foreground transition hover:bg-accent-hover ${
        phase === "success" ? "ring-2 ring-success" : ""
      }`}
    >
      <Icon.Sparkles className="h-4 w-4" /> Generate Demo
    </button>
  );
}

function useEllipsis(active: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setN((v) => (v + 1) % 4), 350);
    return () => window.clearInterval(id);
  }, [active]);
  return useMemo(() => ".".repeat(n), [n]);
}

function EmptyOutput() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-glow text-accent">
        <Icon.Sparkles className="h-6 w-6" />
      </div>
      <div className="text-lg font-medium">Your demo will appear here</div>
      <p className="max-w-sm text-sm text-muted-foreground">
        Fill the brief on the left, hit Generate, and a 90-second video walkthrough lands here.
      </p>
    </div>
  );
}
