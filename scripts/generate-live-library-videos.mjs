import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const RESULTS_PATH = path.join(ROOT, "tmp", "heygen-library-results.json");
const HEYGEN_API_BASE = "https://api.heygen.com";
const COST_PER_VIDEO_USD = 1.37;
const RUN_ID = "20260515-library-v1";

function readEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\n/)
      .map((line) => line.match(/^([^#=]+)=(.*)$/))
      .filter(Boolean)
      .map(([, key, value]) => [
        key.trim(),
        value.trim().replace(/^['"]/, "").replace(/['"]$/, ""),
      ]),
  );
}

function loadResults() {
  if (!fs.existsSync(RESULTS_PATH)) return {};
  return JSON.parse(fs.readFileSync(RESULTS_PATH, "utf8"));
}

function saveResults(results) {
  fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });
  fs.writeFileSync(RESULTS_PATH, `${JSON.stringify(results, null, 2)}\n`);
}

const env = { ...readEnv(), ...process.env };
const API_KEY = env.HEYGEN_API_KEY;
if (!API_KEY) {
  console.error("HEYGEN_API_KEY is not configured in .env or the shell.");
  process.exit(1);
}

async function heygen(pathname, init = {}) {
  const response = await fetch(`${HEYGEN_API_BASE}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    const error = new Error(json?.error?.message || json?.message || `HeyGen ${response.status}`);
    error.status = response.status;
    error.payload = json;
    throw error;
  }
  return json;
}

function scenePlanFor(spec) {
  return [
    {
      number: "01",
      title: spec.scenes[0].title,
      duration: spec.scenes[0].duration,
      description: spec.scenes[0].description,
      script: spec.scenes[0].script,
    },
    {
      number: "02",
      title: spec.scenes[1].title,
      duration: spec.scenes[1].duration,
      description: spec.scenes[1].description,
      script: spec.scenes[1].script,
    },
    {
      number: "03",
      title: spec.scenes[2].title,
      duration: spec.scenes[2].duration,
      description: spec.scenes[2].description,
      script: spec.scenes[2].script,
    },
  ];
}

function scriptTextFor(spec) {
  return `${spec.productName} — Demo Script (${spec.tone}, ${spec.language})\n\n${spec.scenes
    .map(
      (scene, index) => `Scene 0${index + 1} — ${scene.title} (${scene.duration})\n${scene.script}`,
    )
    .join("\n\n")}\n\nCTA: ${spec.ctaText}\n`;
}

function buildPrompt(spec) {
  const scenePlan = scenePlanFor(spec);
  return [
    `Create a polished 16:9 AI avatar product demo video for ${spec.productName}.`,
    `Target runtime: 28 to 38 seconds. Keep it concise, premium, and public-launch ready.`,
    `Audience: ${spec.audience}`,
    `Tone: ${spec.tone}`,
    `Language: ${spec.language}`,
    `Demo template: ${spec.template}`,
    `Product URL: ${spec.productUrl}`,
    `CTA: ${spec.ctaText}`,
    "",
    "Product brief:",
    spec.brief,
    "",
    "README / product context:",
    spec.readme,
    "",
    "Changelog / launch signal:",
    spec.changelog,
    "",
    "Required scene plan:",
    scenePlan
      .map(
        (scene) =>
          `${scene.number}. ${scene.title} (${scene.duration}) — ${scene.description}\nScript: ${scene.script}`,
      )
      .join("\n\n"),
    "",
    "Creative direction:",
    "- Use a high-quality human avatar presenter as the anchor.",
    "- Add product-style cutaways, captions, kinetic UI cards, and clean transitions.",
    "- Make this feel like a real product demo link a founder or DevRel team could share.",
    "- Demonstrate DemoGenie's range across product launch, technical walkthrough, training, feature update, and investor storytelling.",
    "- Avoid generic filler. Use the product-specific terms and CTA above.",
    "- End with the CTA as an on-screen closing beat.",
  ].join("\n");
}

const specs = [
  {
    id: "seed-heygen",
    slug: "heygen-demo",
    styleName: "Marvel",
    productName: "HeyGen",
    productUrl: "https://www.heygen.com/",
    template: "Product Launch",
    tone: "Confident",
    language: "English",
    audience: "Founders, product marketers, DevRel teams, and global launch teams",
    ctaText: "Create your first AI video",
    brief:
      "HeyGen helps teams create studio-quality avatar videos from scripts, product context, brand assets, and translation workflows, so every launch can ship with a human demo instead of a static README.",
    readme:
      "HeyGen Video Agent turns prompts and product context into finished avatar-led videos. The platform supports avatars, voices, brand kits, video translation, lip sync, and API workflows for teams that need video at launch speed.",
    changelog:
      "Spring release — Video Agent creates demos from prompts, Brand Kits keep generated videos on-brand, and translation/lipsync workflows make product launches multilingual.",
    scenes: [
      {
        title: "Launch Bottleneck",
        duration: "~10s",
        description: "Show the gap between shipped product context and a demo people will watch.",
        script:
          "Your product shipped. The README is ready. The changelog is detailed. But the video demo still needs a script, a presenter, editing, captions, and a clean way to share it.",
      },
      {
        title: "Video Agent Workflow",
        duration: "~18s",
        description: "Show HeyGen creating a presenter-led demo from structured launch context.",
        script:
          "HeyGen turns that context into a studio-quality avatar video: a human presenter, crisp product beats, brand-aware pacing, and multilingual-ready composition generated from one focused prompt.",
      },
      {
        title: "Share the Demo",
        duration: "~8s",
        description: "Close on a public demo link and CTA.",
        script:
          "With DemoGenie, every launch ends with a shareable video page. Create your first AI video and ship the demo while the product is still fresh.",
      },
    ],
  },
  {
    id: "seed-prisma",
    slug: "prisma-api",
    styleName: "Blueprint",
    productName: "Prisma ORM",
    productUrl: "https://www.prisma.io/",
    template: "API Demo",
    tone: "Technical",
    language: "English",
    audience: "TypeScript developers and backend teams",
    ctaText: "Try Prisma",
    brief:
      "Prisma gives TypeScript teams a schema-first database layer with generated queries, migrations, and compile-time safety that can be explained as a crisp developer walkthrough.",
    readme:
      "Prisma is a next-generation ORM for Node.js and TypeScript. Define the schema once, generate a type-safe client, run migrations, and query your database with confidence across Postgres, MySQL, SQLite, SQL Server, MongoDB, and more.",
    changelog:
      "Latest release — faster generated client startup, improved migration diagnostics, and cleaner relation query hints for production teams.",
    scenes: [
      {
        title: "The Backend Drift",
        duration: "~10s",
        description: "Frame database integration as a clarity problem for engineering teams.",
        script:
          "Backend teams move fast, but schemas, migrations, and application code can drift apart. One mismatch becomes a runtime bug, a broken release, or a late-night database fix.",
      },
      {
        title: "Schema to Safe Queries",
        duration: "~18s",
        description: "Walk through schema, generated client, and type-safe query flow.",
        script:
          "Prisma starts from a single schema, generates a type-safe client, and gives developers readable queries with compile-time confidence. The demo should show schema, migration, and query cards snapping together like one workflow.",
      },
      {
        title: "Developer CTA",
        duration: "~8s",
        description: "Close with a practical developer next step.",
        script:
          "The result is less database glue and more product code. Try Prisma and turn your next API demo into something developers understand in seconds.",
      },
    ],
  },
  {
    id: "seed-linear",
    slug: "linear-ai",
    styleName: "OS X",
    productName: "Linear AI",
    productUrl: "https://linear.app/",
    template: "Feature Update",
    tone: "Confident",
    language: "English",
    audience: "Engineering managers and product leads",
    ctaText: "Review the project update",
    brief:
      "Linear AI turns product work into concise issue summaries, release updates, and stakeholder-ready communication for high-velocity teams.",
    readme:
      "Linear is the issue tracking and product development system for modern software teams. Linear AI helps turn project activity, issues, specs, and updates into clear summaries and next steps.",
    changelog:
      "New release — AI-generated issue summaries, faster project update drafts, and cleaner stakeholder handoff notes from active product work.",
    scenes: [
      {
        title: "Too Much Product Noise",
        duration: "~10s",
        description: "Show teams buried in issues, comments, and release notes.",
        script:
          "High-velocity teams do not have a shortage of work. They have a shortage of clean signal. Issues, comments, specs, and project updates pile up faster than stakeholders can follow.",
      },
      {
        title: "Linear AI Summarizes",
        duration: "~18s",
        description: "Show AI turning messy work into clear updates.",
        script:
          "Linear AI turns product activity into concise summaries, release notes, and decision-ready updates. The video should feel like a calm command center: work enters messy, communication leaves sharp.",
      },
      {
        title: "Ship the Update",
        duration: "~8s",
        description: "Close on reviewing and sharing the update.",
        script:
          "Review the project update, align the team, and keep momentum without another status meeting.",
      },
    ],
  },
  {
    id: "seed-supportflow",
    slug: "supportflow-training",
    styleName: "Eames",
    productName: "SupportFlow Academy",
    productUrl: "https://example.com/supportflow",
    template: "Feature Update",
    tone: "Friendly",
    language: "English",
    audience: "Support teams, onboarding teams, and customer success leaders",
    ctaText: "Open the training guide",
    brief:
      "SupportFlow Academy turns complex product workflows into calm training videos with avatar narration, captions, and repeatable enablement paths.",
    readme:
      "SupportFlow Academy is a training workspace for customer-facing teams. It converts SOPs, help articles, workflow notes, and support macros into short, repeatable video lessons with captions and step-by-step structure.",
    changelog:
      "Training update — new escalation path lesson, searchable SOP source context, and improved onboarding clips for new support hires.",
    scenes: [
      {
        title: "Training Drift",
        duration: "~10s",
        description: "Show support teams learning from scattered docs.",
        script:
          "Support teams learn from docs, macros, screenshots, and hallway explanations. But every update creates drift, and new teammates need the same workflow taught again.",
      },
      {
        title: "Avatar Training Path",
        duration: "~18s",
        description: "Show calm avatar narration and captioned process steps.",
        script:
          "SupportFlow Academy turns that source context into calm avatar-led training: step-by-step narration, captions, repeatable lessons, and a visual path that support teams can replay before the next customer conversation.",
      },
      {
        title: "Reusable Enablement",
        duration: "~8s",
        description: "Close on sharing the training guide.",
        script:
          "Open the training guide and make every product update teachable without scheduling another live walkthrough.",
      },
    ],
  },
  {
    id: "seed-venturedeck",
    slug: "venturedeck-investor",
    styleName: "Time",
    productName: "VentureDeck AI",
    productUrl: "https://example.com/venturedeck",
    template: "Product Launch",
    tone: "Confident",
    language: "English",
    audience: "Investors, advisors, and strategic partners",
    ctaText: "View the investor brief",
    brief:
      "VentureDeck AI turns product traction, roadmap context, and customer proof into a sharp investor-facing product narrative.",
    readme:
      "VentureDeck AI helps founders assemble investor-ready product narratives from traction metrics, roadmap notes, customer quotes, and launch context. It converts scattered proof into a concise demo story.",
    changelog:
      "Investor demo update — new traction summary blocks, roadmap proof points, and customer quote synthesis for faster fundraising communication.",
    scenes: [
      {
        title: "Scattered Proof",
        duration: "~10s",
        description: "Show traction, roadmap, and customer proof living in separate places.",
        script:
          "Founders usually have proof everywhere: dashboard metrics, customer quotes, roadmap notes, and launch wins. The problem is turning that proof into a story an investor understands quickly.",
      },
      {
        title: "Narrative Synthesis",
        duration: "~18s",
        description: "Show the product shaping proof into a confident investor demo.",
        script:
          "VentureDeck AI synthesizes traction, roadmap context, and customer evidence into a clear product narrative. The demo should feel premium, decisive, and investor-ready, with visual proof cards and a composed avatar presenter.",
      },
      {
        title: "Investor CTA",
        duration: "~8s",
        description: "Close on the investor brief.",
        script:
          "View the investor brief and share a product story that feels funded before the first meeting starts.",
      },
    ],
  },
];

async function getStyles() {
  const response = await heygen("/v3/video-agents/styles?limit=100", { method: "GET" });
  const styles = new Map();
  for (const style of response.data ?? []) {
    if (style.aspect_ratio === "16:9") styles.set(style.name, style.style_id);
  }
  return styles;
}

async function createVideoAgent(spec, styleId) {
  const titledBody = {
    prompt: buildPrompt(spec),
    title: `${spec.productName} — DemoGenie library demo`,
  };
  const baseBody = { prompt: titledBody.prompt };
  const style = styleId ? { style_id: styleId } : {};
  const attempts = [
    { ...titledBody, mode: "generate", ...style },
    { ...baseBody, mode: "generate", ...style },
    { ...baseBody, ...style },
    baseBody,
  ];

  let lastError;
  for (const body of attempts) {
    try {
      return await heygen("/v3/video-agents", {
        method: "POST",
        headers: { "Idempotency-Key": `demogenie:${RUN_ID}:${spec.slug}` },
        body: JSON.stringify(body),
      });
    } catch (error) {
      lastError = error;
      if (error.status && error.status !== 400) break;
    }
  }
  throw lastError;
}

async function getSession(sessionId) {
  return heygen(`/v3/video-agents/${sessionId}`, { method: "GET" });
}

async function getSessionVideos(sessionId) {
  return heygen(`/v3/video-agents/${sessionId}/videos`, { method: "GET" });
}

async function getVideo(videoId) {
  return heygen(`/v3/videos/${videoId}`, { method: "GET" });
}

function extractVideoIdFromSession(sessionResponse) {
  const data = sessionResponse?.data ?? {};
  return (
    data.video_id ??
    data.videoId ??
    data.output_video_id ??
    data.final_video_id ??
    data.videos?.[0]?.video_id ??
    data.videos?.[0]?.id ??
    null
  );
}

function extractStatusFromSession(sessionResponse) {
  const data = sessionResponse?.data ?? {};
  return data.status ?? data.state ?? data.phase ?? null;
}

async function pollForVideo(spec, existing) {
  const result = { ...existing };
  const started = Date.now();
  const deadlineMs = 18 * 60 * 1000;
  let lastLog = 0;

  while (Date.now() - started < deadlineMs) {
    if (result.videoId) {
      try {
        const video = await getVideo(result.videoId);
        const data = video.data ?? {};
        result.videoStatus = data.status ?? result.videoStatus;
        result.durationSeconds = data.duration ? Math.round(data.duration) : result.durationSeconds;
        result.remoteVideoUrl = data.video_url ?? result.remoteVideoUrl;
        result.thumbnailUrl = data.thumbnail_url ?? result.thumbnailUrl;
        if (data.status === "completed" && data.video_url) {
          result.status = "completed";
          return result;
        }
        if (data.status === "failed") {
          throw new Error(data.failure_message || `${spec.slug} failed`);
        }
      } catch (error) {
        result.lastVideoPollError = error.message;
      }
    }

    if (result.sessionId) {
      try {
        const session = await getSession(result.sessionId);
        result.sessionStatus = extractStatusFromSession(session) ?? result.sessionStatus;
        result.videoId = result.videoId ?? extractVideoIdFromSession(session);
      } catch (error) {
        result.lastSessionPollError = error.message;
      }

      try {
        const videos = await getSessionVideos(result.sessionId);
        const first = videos.data?.[0] ?? videos.data?.videos?.[0] ?? null;
        if (first) {
          result.videoId = result.videoId ?? first.video_id ?? first.id ?? null;
          result.remoteVideoUrl = result.remoteVideoUrl ?? first.video_url ?? first.url ?? null;
          result.videoStatus = result.videoStatus ?? first.status ?? null;
          if (result.remoteVideoUrl && (first.status === "completed" || !first.status)) {
            result.status = "completed";
            return result;
          }
        }
      } catch (error) {
        result.lastSessionVideosError = error.message;
      }
    }

    if (Date.now() - lastLog > 30_000) {
      lastLog = Date.now();
      console.log(
        `${spec.slug}: waiting (${Math.round((Date.now() - started) / 1000)}s) session=${
          result.sessionStatus ?? "-"
        } video=${result.videoStatus ?? "-"} videoId=${result.videoId ?? "-"}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 8_000));
  }

  result.status = result.remoteVideoUrl ? "completed" : "processing";
  return result;
}

async function downloadVideo(spec, result) {
  if (!result.remoteVideoUrl || result.localVideoUrl) return result;
  const response = await fetch(result.remoteVideoUrl);
  if (!response.ok) throw new Error(`Download failed for ${spec.slug}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const fileName = `${spec.slug}-heygen-live.mp4`;
  const publicDir = path.join(ROOT, "public", "generated");
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, fileName), bytes);
  return {
    ...result,
    localVideoUrl: `/generated/${fileName}`,
    fileSizeBytes: bytes.length,
  };
}

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : specs.length;
  const selected = specs.slice(0, Number.isFinite(limit) ? limit : specs.length);
  const results = loadResults();
  const styles = await getStyles();

  console.log(`Creating/polling ${selected.length} live HeyGen library demo(s).`);

  for (const spec of selected) {
    const existing = results[spec.slug];
    if (existing?.status === "completed" && existing.localVideoUrl) {
      console.log(`${spec.slug}: already completed at ${existing.localVideoUrl}`);
      continue;
    }

    if (!existing?.sessionId) {
      const styleId = styles.get(spec.styleName) ?? null;
      console.log(`${spec.slug}: creating Video Agent session (${spec.styleName})`);
      const created = await createVideoAgent(spec, styleId);
      results[spec.slug] = {
        ...(results[spec.slug] ?? {}),
        id: spec.id,
        slug: spec.slug,
        productName: spec.productName,
        productUrl: spec.productUrl,
        styleName: spec.styleName,
        styleId,
        sessionId: created.data?.session_id ?? null,
        videoId: created.data?.video_id ?? null,
        createStatus: created.data?.status ?? null,
        createdAt: new Date().toISOString(),
        costUsd: COST_PER_VIDEO_USD,
        scenePlan: scenePlanFor(spec),
        scriptText: scriptTextFor(spec),
      };
      saveResults(results);
    }
  }

  await Promise.all(
    selected.map(async (spec) => {
      if (results[spec.slug]?.status === "completed" && results[spec.slug]?.localVideoUrl) {
        return;
      }
      console.log(`${spec.slug}: polling`);
      results[spec.slug] = await pollForVideo(spec, results[spec.slug]);
      saveResults(results);

      if (results[spec.slug].remoteVideoUrl) {
        console.log(`${spec.slug}: downloading`);
        results[spec.slug] = await downloadVideo(spec, results[spec.slug]);
        saveResults(results);
      }

      console.log(
        `${spec.slug}: ${results[spec.slug].status} local=${results[spec.slug].localVideoUrl ?? "-"} remote=${
          results[spec.slug].remoteVideoUrl ? "yes" : "no"
        }`,
      );
    }),
  );

  const completed = Object.values(results).filter((result) => result.status === "completed");
  console.log(`Completed ${completed.length}/${specs.length}. Metadata: ${RESULTS_PATH}`);
}

main().catch((error) => {
  console.error(error.message);
  if (error.payload) console.error(JSON.stringify(error.payload).slice(0, 2000));
  process.exit(1);
});
