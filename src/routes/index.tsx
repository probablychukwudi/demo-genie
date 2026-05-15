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
  mockFetchProduct,
} from "@/lib/mockData";
import {
  STARTER_TEMPLATES,
  buildStarterFields,
  getStarterTemplate,
  type StarterGeneratedFields,
  type StarterTemplateId,
} from "@/lib/starterTemplates";
import { saveGeneration } from "@/lib/generations.functions";
import { createHeyGenLiveGeneration } from "@/lib/heygen.functions";
import { getSettings, type PublicSettings } from "@/lib/settings.functions";
import { useAppStore } from "@/lib/store";
import { copyText, exportVideo } from "@/lib/videoExport";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DemoGenie — Workspace" },
      {
        name: "description",
        content: "Generate a shareable product demo video from any URL in 90 seconds.",
      },
    ],
  }),
  component: Workspace,
});

type Phase = "idle" | "running" | "stopped" | "success" | "error";
type GeneratedDraft = {
  inputs: GenerationInputs;
  scenePlan: Scene[];
  scriptText: string;
  videoUrl: string;
};

function Workspace() {
  const setLiveSlug = useAppStore((s) => s.setLiveSlug);
  const saveGenerationFn = useServerFn(saveGeneration);
  const getSettingsFn = useServerFn(getSettings);
  const createLiveGenerationFn = useServerFn(createHeyGenLiveGeneration);

  const [inputs, setInputs] = useState<GenerationInputs>(SEED_INPUTS);
  const [fetching, setFetching] = useState(false);
  const [selectedStarterId, setSelectedStarterId] = useState<StarterTemplateId | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [scenePlan, setScenePlan] = useState<Scene[]>([]);
  const [scenesScripted, setScenesScripted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [scriptText, setScriptText] = useState<string>("");
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null);
  const [isOutputDirty, setIsOutputDirty] = useState(false);

  const [published, setPublished] = useState<{ slug: string; views: number } | null>(null);

  const [drawerScene, setDrawerScene] = useState<Scene | null>(null);
  const [splitPct, setSplitPct] = useState(42);

  const stopRef = useRef(false);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const starterSnapshotRef = useRef<StarterGeneratedFields | null>(null);

  useEffect(() => {
    getSettingsFn({})
      .then(setSettings)
      .catch(() => setSettings(null));
  }, [getSettingsFn]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("demogenie:workspace-intent");
    if (!raw) return;
    window.sessionStorage.removeItem("demogenie:workspace-intent");
    try {
      const payload = JSON.parse(raw) as {
        action?: "load" | "generate" | "duplicate" | "regenerate";
        inputs?: GenerationInputs;
      };
      if (!payload.inputs) return;
      setInputs(payload.inputs);
      setSelectedStarterId(null);
      starterSnapshotRef.current = null;
      resetOutput();
      setPhase("idle");
      if (payload.action === "generate" || payload.action === "regenerate") {
        window.setTimeout(() => void handleGenerate(payload.inputs), 120);
      } else {
        toast.success("Input loaded into workspace");
      }
    } catch {
      toast.error("Could not load that saved input");
    }
    // One-shot bootstrap for History actions. Including handleGenerate here
    // would rerun saved intents when local workspace state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (videoReady) setIsOutputDirty(true);
  }

  function applyStarter(starterId: StarterTemplateId, announce = true) {
    const companyName = inputs.productName?.trim() || "Your product";
    const fields = buildStarterFields(starterId, companyName);
    const starter = getStarterTemplate(starterId);

    setSelectedStarterId(starterId);
    starterSnapshotRef.current = fields;
    setInputs((prev) => ({
      ...prev,
      productName: companyName,
      ...fields,
    }));
    if (videoReady) setIsOutputDirty(true);
    if (announce && starter) toast.success(`Starter applied: ${starter.label}`);
  }

  function updateCompanyNameWithStarter(
    prev: GenerationInputs,
    productName: string,
    previousStarter: StarterGeneratedFields | null,
    nextStarter: StarterGeneratedFields | null,
  ) {
    if (!previousStarter || !nextStarter) {
      return { ...prev, productName };
    }

    return {
      ...prev,
      productName,
      brief: prev.brief === previousStarter.brief ? nextStarter.brief : prev.brief,
      readme: prev.readme === previousStarter.readme ? nextStarter.readme : prev.readme,
      changelog:
        prev.changelog === previousStarter.changelog ? nextStarter.changelog : prev.changelog,
      ctaText: prev.ctaText === previousStarter.ctaText ? nextStarter.ctaText : prev.ctaText,
      audience: prev.audience === previousStarter.audience ? nextStarter.audience : prev.audience,
      tone: prev.tone === previousStarter.tone ? nextStarter.tone : prev.tone,
      language: prev.language === previousStarter.language ? nextStarter.language : prev.language,
      template: prev.template === previousStarter.template ? nextStarter.template : prev.template,
    };
  }

  function handleCompanyNameChange(productName: string) {
    const previousStarter = starterSnapshotRef.current;
    const nextStarter =
      selectedStarterId && previousStarter
        ? buildStarterFields(selectedStarterId, productName)
        : null;

    setInputs((prev) =>
      updateCompanyNameWithStarter(prev, productName, previousStarter, nextStarter),
    );
    if (nextStarter) starterSnapshotRef.current = nextStarter;
    if (videoReady) setIsOutputDirty(true);
  }

  async function handleFetchUrl() {
    if (!inputs.url) {
      toast.error("Add a product URL first.");
      return;
    }
    setFetching(true);
    await new Promise((r) => setTimeout(r, 1400));
    const out = mockFetchProduct(inputs.url);
    const previousStarter = starterSnapshotRef.current;
    const nextStarter =
      selectedStarterId && previousStarter
        ? buildStarterFields(selectedStarterId, out.productName)
        : null;
    setInputs((prev) => {
      const next = updateCompanyNameWithStarter(
        prev,
        out.productName,
        previousStarter,
        nextStarter,
      );
      if (nextStarter) return next;
      return {
        ...next,
        brief: out.brief,
      };
    });
    if (nextStarter) starterSnapshotRef.current = nextStarter;
    if (videoReady) setIsOutputDirty(true);
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
    setGeneratedDraft(null);
    setIsOutputDirty(false);
  }

  async function streamGeneration(inputOverride: GenerationInputs): Promise<{ stopped: boolean }> {
    stopRef.current = false;
    const inputSnapshot = { ...inputOverride };
    const lines = AGENT_STEPS.map((s) => s.replace("{{tone}}", inputSnapshot.tone));
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
        plannedScenes = buildScenePlan(inputSnapshot);
        setScenePlan(plannedScenes);
      }
      // After "Generating script" (index 4), flip cards to "Scripted ✓".
      if (i === 4 && plannedScenes) {
        scriptDraft = buildScriptText(inputSnapshot, plannedScenes);
        setScriptText(scriptDraft);
        setScenesScripted(true);
      }
      // After last step, reveal the video.
      if (i === 5) {
        setVideoReady(true);
        const finalScenes = plannedScenes ?? buildScenePlan(inputSnapshot);
        const finalScript = scriptDraft || buildScriptText(inputSnapshot, finalScenes);
        setGeneratedDraft({
          inputs: inputSnapshot,
          scenePlan: finalScenes,
          scriptText: finalScript,
          videoUrl: MOCK_VIDEO_URL,
        });
        setIsOutputDirty(false);
      }
    }
    setLogLines((prev) => [...prev, "✓ Generation complete. Duration: 8.3s"]);
    return { stopped: false };
  }

  async function streamLiveGeneration(
    inputOverride: GenerationInputs,
  ): Promise<{ stopped: boolean }> {
    stopRef.current = false;
    const inputSnapshot = { ...inputOverride };
    const plannedScenes = buildScenePlan(inputSnapshot);
    const scriptDraft = buildScriptText(inputSnapshot, plannedScenes);

    setLogLines([
      "→ Validating server-only HeyGen key...",
      "→ Preparing Video Agent prompt from product context...",
      "→ Estimated live render cost: $1.37...",
    ]);
    setScenePlan(plannedScenes);
    setScriptText(scriptDraft);
    setScenesScripted(true);

    if (stopRef.current) {
      setStoppedAt(2);
      return { stopped: true };
    }

    const result = await createLiveGenerationFn({
      data: {
        inputs: inputSnapshot,
        scenePlan: plannedScenes,
        scriptText: scriptDraft,
      },
    });

    if (stopRef.current) {
      setStoppedAt(3);
      return { stopped: true };
    }

    setLogLines(result.agentSteps);

    const status = result.videoUrl ? "success" : "pending";
    const draftSlug = generateMockGeneration(inputSnapshot).slug;
    const saved = await saveGenerationFn({
      data: {
        slug: draftSlug,
        productName: inputSnapshot.productName ?? "Untitled Product",
        productUrl: inputSnapshot.url || null,
        brief: inputSnapshot.brief,
        ctaText: inputSnapshot.ctaText,
        audience: inputSnapshot.audience,
        tone: inputSnapshot.tone,
        language: inputSnapshot.language,
        template: inputSnapshot.template,
        scenePlan: plannedScenes,
        scriptText: scriptDraft,
        videoUrl: result.videoUrl,
        status,
        generationMode: "live",
        costUsd: status === "success" ? result.estimatedCostUsd : null,
        heygenSessionId: result.sessionId,
        heygenVideoId: result.videoId,
        durationSeconds: result.durationSeconds ?? 54,
      },
    });

    if (result.videoUrl) {
      setVideoReady(true);
      setGeneratedDraft({
        inputs: inputSnapshot,
        scenePlan: plannedScenes,
        scriptText: scriptDraft,
        videoUrl: result.videoUrl,
      });
      setPublished({ slug: saved.slug, views: 0 });
      setLiveSlug(saved.slug);
      setIsOutputDirty(false);
      toast.success("HeyGen live render complete");
    } else {
      setVideoReady(false);
      setGeneratedDraft(null);
      toast.info("HeyGen render queued. Reopen Demo Library to check status.");
    }

    return { stopped: false };
  }

  async function handleGenerate(inputOverride?: GenerationInputs) {
    if (phase === "running") return;
    const generationInputs = inputOverride ?? inputs;
    resetOutput();
    setPhase("running");

    try {
      const liveMode = settings && !settings.mockMode;
      if (liveMode && !settings.heygenKeyConfigured) {
        throw new Error("Live mode is enabled, but HEYGEN_API_KEY is not configured server-side.");
      }
      const { stopped } = liveMode
        ? await streamLiveGeneration(generationInputs)
        : await streamGeneration(generationInputs);
      if (stopped) {
        setPhase("stopped");
        toast.warning("Generation stopped");
        return;
      }
      setPhase("success");
      // Brief green flash via phase
      window.setTimeout(() => setPhase("idle"), 700);
    } catch (e) {
      setPhase("error");
      toast.error(e instanceof Error ? e.message : "Generation failed. Check your inputs.");
    }
  }

  function handleStop() {
    stopRef.current = true;
  }

  function handleRestart() {
    void handleGenerate();
  }

  function handleExportVideo() {
    const videoUrl = generatedDraft?.videoUrl;
    if (!videoUrl) {
      toast.error("Generate a video before exporting.");
      return;
    }
    void exportVideo(videoUrl, generatedDraft.inputs.productName);
  }

  async function handlePublish() {
    if (!videoReady || !generatedDraft || scenePlan.length === 0 || isOutputDirty) {
      toast.error(
        isOutputDirty ? "Regenerate before publishing edited inputs." : "Generate a demo first.",
      );
      return;
    }
    const draft = generateMockGeneration(generatedDraft.inputs);
    try {
      const result = await saveGenerationFn({
        data: {
          slug: draft.slug,
          productName: generatedDraft.inputs.productName ?? draft.productName,
          productUrl: generatedDraft.inputs.url || null,
          brief: generatedDraft.inputs.brief,
          ctaText: generatedDraft.inputs.ctaText,
          audience: generatedDraft.inputs.audience,
          tone: generatedDraft.inputs.tone,
          language: generatedDraft.inputs.language,
          template: generatedDraft.inputs.template,
          scenePlan: generatedDraft.scenePlan,
          scriptText: generatedDraft.scriptText,
          videoUrl: generatedDraft.videoUrl,
          status: "success",
          generationMode: "mock",
          costUsd: 0,
          durationSeconds: 54,
        },
      });
      setPublished({ slug: result.slug, views: 0 });
      setLiveSlug(result.slug);
      toast.success("Demo published — Open Preview ↗", {
        action: {
          label: "Open",
          onClick: () => window.open(`/preview/${result.slug}`, "_blank", "noopener,noreferrer"),
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
      scenePlan
        .map((s) => `${s.number} — ${s.title} (${s.duration})\n${s.description}`)
        .join("\n\n") +
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
    if (!published) {
      toast.error("Publish the demo before sharing.");
      return;
    }
    const url = `${window.location.origin}/preview/${published.slug}`;
    void copyText(url).then((ok) =>
      toast[ok ? "success" : "error"](ok ? "Link copied!" : "Copy failed"),
    );
  }

  // ----- Render -----
  const showLog =
    phase !== "idle" ||
    logLines.length > 0 ||
    scenePlan.length > 0 ||
    videoReady ||
    stoppedAt !== null;
  const selectedStarter = selectedStarterId ? getStarterTemplate(selectedStarterId) : null;

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
          className="flex h-full flex-col overflow-hidden border-r border-border bg-background px-7 py-7"
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

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 pb-5">
            <div className="rounded-xl border border-border bg-card/45 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Starter kit</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pick a proven story, then customize any field.
                  </p>
                </div>
                {selectedStarter && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent/35 bg-accent-glow px-2.5 py-1 text-xs text-accent">
                    <Icon.Check className="h-3 w-3" />
                    Starter applied: {selectedStarter.label}
                  </span>
                )}
              </div>

              <div className="grid gap-3 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <Field label="Company / Product name">
                  <input
                    type="text"
                    value={inputs.productName ?? ""}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    placeholder="AcmeCloud"
                    className={inputClass}
                  />
                </Field>
                <Field label="Starter">
                  <StarterDropdown
                    value={selectedStarterId}
                    onChange={(starterId) => applyStarter(starterId)}
                  />
                </Field>
              </div>

              {selectedStarter && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Manual edits are preserved when the company name changes.</span>
                  <button
                    type="button"
                    onClick={() => applyStarter(selectedStarter.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-elevated px-2.5 py-1.5 font-medium text-foreground transition hover:bg-background"
                  >
                    <Icon.Refresh className="h-3.5 w-3.5" />
                    Reapply starter
                  </button>
                </div>
              )}
            </div>

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

            <Field label="Product Brief">
              <textarea
                rows={3}
                value={inputs.brief}
                onChange={(e) => setField("brief", e.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="grid gap-4 2xl:grid-cols-2">
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

            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.35fr)_minmax(150px,0.65fr)]">
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
                    ),
                  )}
                </select>
              </Field>
            </div>

            <Field label="Template">
              <TemplateRow value={inputs.template} onChange={(t) => setField("template", t)} />
            </Field>

            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setSourceOpen((open) => !open)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition hover:bg-elevated"
              >
                <span>
                  <span className="block text-sm font-semibold">Source context</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    README/docs and changelog. Optional, but useful for sharper scripts.
                  </span>
                </span>
                <Icon.ChevronRight
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition ${
                    sourceOpen ? "rotate-90" : ""
                  }`}
                />
              </button>

              {sourceOpen && (
                <div className="mt-3 space-y-3">
                  <Field label="README / Docs">
                    <textarea
                      rows={3}
                      value={inputs.readme}
                      onChange={(e) => setField("readme", e.target.value)}
                      className={`${inputClass} font-mono text-[13px] leading-relaxed`}
                    />
                  </Field>

                  <Field label="Latest Changelog">
                    <textarea
                      rows={2}
                      value={inputs.changelog}
                      onChange={(e) => setField("changelog", e.target.value)}
                      className={`${inputClass} font-mono text-[13px] leading-relaxed`}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-border bg-background pt-4">
            {settings && !settings.mockMode && (
              <div className="mb-3 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                <Icon.Alert className="h-3.5 w-3.5" />
                Live HeyGen mode · estimated $1.37 from the hackathon budget
              </div>
            )}
            <GenerateButton
              phase={phase}
              stoppedAt={stoppedAt}
              dirty={isOutputDirty}
              liveMode={Boolean(settings && !settings.mockMode)}
              onGenerate={handleGenerate}
              onStop={handleStop}
              onRestart={handleRestart}
            />
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
                className="agent-trace-surface rounded-xl border border-border"
              >
                <div className="agent-trace-header flex items-center justify-between border-b border-border px-4 py-2">
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
                  className="mono-log max-h-[124px] min-h-[124px] overflow-y-auto px-4 py-3 font-mono text-[12px] leading-5 text-mono"
                >
                  {logLines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.18 }}
                      className={line.startsWith("✓") ? "text-success" : "agent-trace-line"}
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
                <div className="grid gap-3 xl:grid-cols-3">
                  {scenePlan.map((s, i) => (
                    <motion.button
                      key={s.number}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.12 }}
                      onClick={() => setDrawerScene(s)}
                      className="group relative flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition hover:border-accent/60"
                    >
                      <div className="inline-flex w-fit items-center gap-1 rounded-md bg-accent-glow px-2 py-0.5 text-xs font-medium text-accent">
                        {s.number}
                      </div>
                      <div className="truncate text-base font-semibold">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.duration}</div>
                      <p className="line-clamp-2 text-sm text-foreground/85">{s.description}</p>
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
                <VideoPlayer src={generatedDraft?.videoUrl ?? MOCK_VIDEO_URL} />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handlePublish}
                    disabled={isOutputDirty || !generatedDraft}
                    data-cursor="deploy"
                    className="publish-button inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
                    onClick={handleExportVideo}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-sm transition hover:bg-card"
                  >
                    <Icon.Download className="h-4 w-4" /> Export MP4
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    <Icon.Download className="h-4 w-4" /> Download Script
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={!published}
                    className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Copy share link"
                  >
                    <Icon.Share className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isOutputDirty && videoReady && (
            <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              Inputs changed after the last render. Regenerate before publishing so the public
              preview matches the video.
            </div>
          )}

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
                      void copyText(`${window.location.origin}/preview/${published.slug}`).then(
                        (ok) =>
                          toast[ok ? "success" : "error"](ok ? "Link copied!" : "Copy failed"),
                      );
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
    <div className="block">
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function StarterDropdown({
  value,
  onChange,
}: {
  value: StarterTemplateId | null;
  onChange: (starterId: StarterTemplateId) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = value ? getStarterTemplate(value) : null;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition hover:border-foreground/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">
            {selected ? selected.label : "Choose a starter"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {selected ? selected.description : "Auto-fill the demo copy from a proven format."}
          </span>
        </span>
        <Icon.ChevronRight
          className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[340px] overflow-y-auto rounded-xl border border-border bg-elevated p-1 shadow-2xl">
          {STARTER_TEMPLATES.map((starter) => {
            const isSelected = starter.id === value;
            return (
              <button
                key={starter.id}
                type="button"
                onClick={() => {
                  onChange(starter.id);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                  isSelected ? "bg-accent-glow text-foreground" : "hover:bg-card"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    isSelected ? "border-accent bg-accent text-accent-foreground" : "border-border"
                  }`}
                >
                  {isSelected && <Icon.Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{starter.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                    {starter.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SegmentedTone({ value, onChange }: { value: Tone; onChange: (t: Tone) => void }) {
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

function TemplateRow({ value, onChange }: { value: Template; onChange: (t: Template) => void }) {
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
  dirty,
  liveMode,
  onGenerate,
  onStop,
  onRestart,
}: {
  phase: Phase;
  stoppedAt: number | null;
  dirty: boolean;
  liveMode: boolean;
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
          onClick={() => onGenerate()}
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
        onClick={() => onGenerate()}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-error bg-card text-base font-medium text-error hover:bg-error/10"
      >
        <Icon.Refresh className="h-4 w-4" /> Generation failed — retry?
      </button>
    );
  }

  return (
    <button
      onClick={() => onGenerate()}
      data-cursor="deploy"
      className={`generate-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent text-base font-medium text-accent-foreground transition hover:bg-accent-hover ${
        phase === "success" ? "ring-2 ring-success" : ""
      }`}
    >
      <Icon.Sparkles className="h-4 w-4" />{" "}
      {dirty ? "Regenerate Demo" : liveMode ? "Generate with HeyGen" : "Generate Demo"}
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
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/10">
          <div className="flex items-center justify-between border-b border-border bg-elevated/55 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-error/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
            </div>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Current session
            </span>
          </div>

          <div className="relative aspect-video bg-background">
            <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(90deg,currentColor_1px,transparent_1px),linear-gradient(currentColor_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative flex h-full flex-col items-center justify-center px-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/25 bg-accent-glow text-accent shadow-lg shadow-black/10">
                <Icon.Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">
                Demo video will appear here
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Generate a fresh HeyGen-ready preview from the inputs on the left. Finished example
                videos stay organized in Demo Library.
              </p>
            </div>
          </div>

          <div className="grid border-t border-border bg-elevated/35 text-xs text-muted-foreground sm:grid-cols-3">
            {[
              ["Scene plan", "3-act story"],
              ["Video render", "Avatar + captions"],
              ["Publish", "Share + export"],
            ].map(([label, value], index) => (
              <div
                key={label}
                className={`px-4 py-3 ${index > 0 ? "border-t border-border sm:border-l sm:border-t-0" : ""}`}
              >
                <div className="font-medium text-foreground">{label}</div>
                <div className="mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-lg text-center text-xs leading-5 text-muted-foreground">
          Tip: use a starter template to quickly test launch, API, training, investor, and feature
          update video styles.
        </p>
      </div>
    </div>
  );
}
