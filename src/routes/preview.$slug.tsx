import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icons";
import { VideoPlayer } from "@/components/VideoPlayer";
import {
  getGenerationBySlug,
  incrementViewCount,
} from "@/lib/generations.functions";
import { rowToGeneration } from "@/lib/mockData";
import type { Generation } from "@/lib/types";

export const Route = createFileRoute("/preview/$slug")({
  loader: async ({ params }) => {
    const { row } = await getGenerationBySlug({ data: { slug: params.slug } });
    if (!row) throw notFound();
    const gen = rowToGeneration(row as Record<string, unknown>);
    return { gen };
  },
  head: ({ loaderData }) => {
    const g = loaderData?.gen;
    const title = g
      ? `${g.productName} — Demo by DemoGenie`
      : "Demo — DemoGenie";
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
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Demo not found</h1>
      <p className="mt-2 text-muted-foreground">
        This demo link doesn't exist or was deleted.
      </p>
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
    <div className="mx-auto flex min-h-screen max-w-[760px] flex-col px-6">
      {/* Slim header */}
      <header className="flex h-12 items-center justify-between border-b border-border/40">
        <Link to="/" className="flex items-center gap-1.5 font-bold tracking-tight text-accent">
          <Icon.Zap className="h-4 w-4" /> DemoGenie
        </Link>
        <Link
          to="/"
          className="text-xs text-muted-foreground transition hover:text-foreground"
        >
          Made with DemoGenie →
        </Link>
      </header>

      <h1 className="mt-8 text-4xl font-bold tracking-tight">{gen.productName}</h1>
      {tagline && <p className="mt-2 text-lg text-muted-foreground">{tagline}</p>}

      <div className="mt-6">
        <VideoPlayer src={gen.videoUrl ?? ""} />
      </div>

      {gen.productUrl && gen.ctaText && (
        <a
          href={gen.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex h-14 w-full items-center justify-center rounded-md bg-accent text-lg font-medium text-accent-foreground transition hover:bg-accent-hover"
        >
          {gen.ctaText}
        </a>
      )}

      <div className="mt-10 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
        <span className="flex-1 border-t border-border" />
        What's covered
        <span className="flex-1 border-t border-border" />
      </div>

      <div className="mt-5 space-y-2">
        {gen.scenePlan.map((s: { number: string; title: string; duration: string }) => (
          <div
            key={s.number}
            className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
          >
            <span className="inline-flex items-center justify-center rounded-md bg-accent-glow px-2 py-0.5 text-xs font-medium text-accent">
              {s.number}
            </span>
            <span className="flex-1 text-sm">{s.title}</span>
            <span className="text-xs text-muted-foreground">{s.duration}</span>
          </div>
        ))}
      </div>

      <footer className="mt-auto flex items-center justify-between py-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-foreground">
          Powered by DemoGenie
        </Link>
        <span>{views} view{views === 1 ? "" : "s"}</span>
      </footer>
    </div>
  );
}

export type PreviewPageData = { gen: Generation };
