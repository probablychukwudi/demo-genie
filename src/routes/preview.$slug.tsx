import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icons";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getGenerationBySlug, incrementViewCount } from "@/lib/generations.functions";
import { rowToGeneration, seedGenerationRows } from "@/lib/mockData";
import type { Generation } from "@/lib/types";
import { copyText, exportVideo } from "@/lib/videoExport";

export const Route = createFileRoute("/preview/$slug")({
  loader: async ({ params }) => {
    const { row } = await getGenerationBySlug({ data: { slug: params.slug } }).catch(() => ({
      row: seedGenerationRows().find((seed) => seed.slug === params.slug) ?? null,
    }));
    if (!row) throw notFound();
    const gen = rowToGeneration(row as Record<string, unknown>);
    if (gen.status !== "success" || !gen.videoUrl) throw notFound();
    return { gen };
  },
  head: ({ loaderData }) => {
    const g = loaderData?.gen;
    const title = g ? `${g.productName} — Demo by DemoGenie` : "Demo — DemoGenie";
    const description = g?.brief
      ? g.brief.split(/(?<=\.)\s/)[0]
      : "Watch this 90-second product demo.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "video.other" },
        { property: "og:image", content: "/brand/demogenie-social-card.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "/brand/demogenie-social-card.png" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Demo not found</h1>
      <p className="mt-2 text-muted-foreground">This demo link doesn't exist or was deleted.</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground hover:bg-accent-hover"
      >
        <Icon.Wand className="h-4 w-4" /> Make your own
      </Link>
    </div>
  ),
  component: PreviewPage,
});

function PreviewPage() {
  const { gen } = Route.useLoaderData();
  const [views, setViews] = useState<number>(gen.viewCount);
  const [openScene, setOpenScene] = useState<string | null>(null);

  // increment view on first paint
  useEffect(() => {
    incrementViewCount({ data: { slug: gen.slug } })
      .then((r) => setViews(r.viewCount))
      .catch(() => undefined);
  }, [gen.slug]);

  // Mock-mode periodic increment for the "live" feel on the preview page
  useEffect(() => {
    const id = window.setInterval(() => {
      setViews((v) => v + 1);
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  const tagline = gen.brief?.split(/(?<=\.)\s/)[0] ?? "";

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6">
      {/* Slim header */}
      <header className="flex h-12 items-center justify-between border-b border-border/40">
        <Link
          to="/"
          className="rounded-lg bg-black px-2 py-1.5 transition hover:opacity-90"
          aria-label="DemoGenie"
        >
          <BrandLogo variant="wordmark" className="h-6 w-auto max-w-[150px]" />
        </Link>
        <Link to="/" className="text-xs text-muted-foreground transition hover:text-foreground">
          Made with DemoGenie →
        </Link>
      </header>

      <h1 className="mt-5 text-4xl font-bold tracking-tight">{gen.productName}</h1>
      {tagline && <p className="mt-2 text-base leading-6 text-muted-foreground">{tagline}</p>}

      <div className="mt-4">
        <VideoPlayer src={gen.videoUrl ?? ""} />
      </div>

      {gen.productUrl && gen.ctaText && (
        <a
          href={gen.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="deploy-action mt-4 flex h-12 w-full items-center justify-center rounded-md bg-accent text-base font-medium text-accent-foreground transition hover:bg-accent-hover"
        >
          {gen.ctaText}
        </a>
      )}

      <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="flex-1 border-t border-border" />
        What's covered
        <span className="flex-1 border-t border-border" />
      </div>

      <div className="mt-4 space-y-2">
        {gen.scenePlan.map((s) => {
          const isOpen = openScene === s.number;
          return (
            <button
              key={s.number}
              type="button"
              onClick={() => setOpenScene(isOpen ? null : s.number)}
              className="block w-full rounded-md border border-border bg-card px-3 py-2.5 text-left transition hover:border-accent/50"
            >
              <span className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-md bg-accent-glow px-2 py-0.5 text-xs font-medium text-accent">
                  {s.number}
                </span>
                <span className="flex-1 text-sm font-medium">{s.title}</span>
                <span className="text-xs text-muted-foreground">{s.duration}</span>
                <Icon.ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
              </span>
              {isOpen && (
                <span className="mt-3 block border-t border-border pt-3">
                  <span className="block text-sm leading-5 text-muted-foreground">
                    {s.description}
                  </span>
                  <span className="mt-3 block rounded-md bg-elevated p-3 text-sm leading-6 text-foreground/90">
                    {s.script ?? "Script detail was not captured for this scene."}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">What's next</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Export, share, or bring this demo back into the workspace.
            </p>
          </div>
          <span className="rounded-md bg-accent-glow px-2 py-1 text-xs text-accent">
            {gen.generationMode === "live" ? "HeyGen live render" : "DemoGenie preview"}
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <ActionButton
            icon="Download"
            label="Export video"
            onClick={() => void exportVideo(gen.videoUrl ?? "", gen.productName)}
          />
          <ActionButton
            icon="Copy"
            label="Copy link"
            onClick={async () => {
              const ok = await copyText(window.location.href);
              toast[ok ? "success" : "error"](ok ? "Link copied!" : "Copy failed");
            }}
          />
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-elevated"
          >
            <Icon.Refresh className="h-4 w-4" />
            Regenerate
          </Link>
          <button
            type="button"
            onClick={() =>
              toast.info("Translation remix is queued for the HeyGen translation pass.")
            }
            title="Translation remix is a recommended next integration."
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-elevated"
          >
            <Icon.Languages className="h-4 w-4" />
            Remix later
          </button>
          {gen.productUrl && (
            <a
              href={gen.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-elevated"
            >
              <Icon.External className="h-4 w-4" />
              Product
            </a>
          )}
        </div>
      </section>

      <footer className="mt-auto flex items-center justify-between py-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Powered by DemoGenie
        </Link>
        <span>
          {views} view{views === 1 ? "" : "s"}
        </span>
      </footer>
    </div>
  );
}

export type PreviewPageData = { gen: Generation };

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: keyof typeof Icon;
  label: string;
  onClick: () => void;
}) {
  const IconC = Icon[icon];
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition hover:bg-elevated"
    >
      <IconC className="h-4 w-4" />
      {label}
    </button>
  );
}
