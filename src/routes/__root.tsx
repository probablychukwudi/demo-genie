import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { BrandLogo } from "@/components/BrandLogo";
import { Icon } from "@/components/Icons";
import { NavRail } from "@/components/NavRail";
import { applyAppTheme, useAppStore } from "@/lib/store";

const ONBOARDING_STORAGE_KEY = "demogenie:onboarding-complete";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover"
          >
            Open workspace
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DemoGenie — Ship a demo as fast as you ship code" },
      {
        name: "description",
        content: "Turn any product URL into a shareable AI video demo in 90 seconds.",
      },
      { property: "og:title", content: "DemoGenie" },
      {
        property: "og:description",
        content: "Turn any product URL into a shareable AI video demo in 90 seconds.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/brand/demogenie-social-card.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/brand/demogenie-social-card.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", href: "/brand/demogenie-icon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(()=>{try{var t=localStorage.getItem("demogenie:theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.dataset.theme=t;document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.classList.toggle("light",t==="light");document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}})();',
          }}
        />
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    applyAppTheme(theme);
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppFrame />
      <Toaster
        theme={theme}
        position="top-right"
        toastOptions={{
          className: "!bg-card !border !border-border !text-foreground !rounded-lg",
        }}
      />
    </QueryClientProvider>
  );
}

function AppFrame() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const liveSlug = useAppStore((s) => s.liveSlug);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const isPublicPreview = path.startsWith("/preview/");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOnboardingNudge, setShowOnboardingNudge] = useState(false);

  useEffect(() => {
    if (isPublicPreview || path !== "/") {
      setShowOnboardingNudge(false);
      return;
    }
    setShowOnboardingNudge(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) !== "true");
  }, [isPublicPreview, path]);

  function closeOnboarding() {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setShowOnboarding(false);
    setShowOnboardingNudge(false);
  }

  function startOnboarding() {
    setShowOnboardingNudge(false);
    setShowOnboarding(true);
  }

  if (isPublicPreview) {
    // Public preview: NO app shell, NO nav. Standalone page.
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <NavRail
        livePreviewSlug={liveSlug}
        onOpenOnboarding={startOnboarding}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="relative flex-1 overflow-x-hidden">
        <Outlet />
      </main>
      {showOnboardingNudge && (
        <QuickStartNudge onStart={startOnboarding} onDismiss={closeOnboarding} />
      )}
      <OnboardingGuide open={showOnboarding} onClose={closeOnboarding} />
    </div>
  );
}

function QuickStartNudge({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-30 max-w-xs rounded-xl border border-border bg-card p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <BrandLogo variant="icon" className="mt-0.5 h-9 w-9 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-semibold">New to DemoGenie?</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Take a 45-second tour, or start editing the seeded demo right away.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
            >
              <Icon.Sparkles className="h-3.5 w-3.5" />
              Start tour
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-elevated hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      kicker: "Welcome",
      title: "Turn product context into a demo link.",
      body: "DemoGenie takes a URL, README, changelog, and product brief, then turns them into an editable scene plan, script, video preview, and shareable public page.",
      icon: Icon.Wand,
    },
    {
      kicker: "Start faster",
      title: "Use starters when the page is blank.",
      body: "Type a company name, pick a starter like Developer API or Product Marketing Demo, and the brief, CTA, audience, docs, tone, and template update for you.",
      icon: Icon.Sparkles,
    },
    {
      kicker: "Generate",
      title: "Watch the agent trace and review scenes.",
      body: "Generate streams a readable trace, writes a three-scene plan, creates a script, and shows the video preview. Stop or regenerate anytime before publishing.",
      icon: Icon.Activity,
    },
    {
      kicker: "Publish",
      title: "Send the demo, not the dashboard.",
      body: "Publish creates a standalone preview page with the video, CTA, scene breakdown, and view counter. History keeps prior generations ready to reopen.",
      icon: Icon.External,
    },
  ];

  const current = steps[step];
  const StepIcon = current.icon;
  const isLast = step === steps.length - 1;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setStep((s) => Math.min(s + 1, steps.length - 1));
      if (event.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, steps.length]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:grid-cols-[0.92fr_1.08fr]"
      >
        <aside className="border-b border-border bg-elevated/60 p-6 md:border-b-0 md:border-r">
          <div className="flex items-center gap-3">
            <BrandLogo variant="icon" className="h-10 w-10 shrink-0" />
            <div>
              <div className="rounded-lg bg-black px-2 py-1.5">
                <BrandLogo variant="wordmark" className="h-6 w-auto max-w-[145px]" />
              </div>
              <div className="text-xs text-muted-foreground">Launch-ready demo workflow</div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {steps.map((item, index) => {
              const ItemIcon = item.icon;
              const selected = index === step;
              const completed = index < step;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                    selected
                      ? "border-accent bg-accent-glow"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-card"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      completed || selected
                        ? "bg-accent text-accent-foreground"
                        : "bg-card text-muted-foreground"
                    }`}
                  >
                    {completed ? (
                      <Icon.Check className="h-4 w-4" />
                    ) : (
                      <ItemIcon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{item.kicker}</span>
                    <span className="block truncate text-xs">{item.title}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent-glow px-3 py-1 text-xs font-medium text-accent">
              Step {step + 1} of {steps.length}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-elevated hover:text-foreground"
              aria-label="Close onboarding"
            >
              <Icon.X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-lg shadow-black/30">
              <StepIcon className="h-5 w-5" />
            </div>
            <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-accent">
              {current.kicker}
            </p>
            <h2
              id="onboarding-title"
              className="mt-2 max-w-xl text-3xl font-semibold tracking-tight"
            >
              {current.title}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              {current.body}
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-border bg-background/55 p-4">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recommended first run
            </div>
            <ol className="grid gap-2 text-sm text-foreground/85 sm:grid-cols-2">
              <li className="rounded-lg bg-card px-3 py-2">1. Enter company name</li>
              <li className="rounded-lg bg-card px-3 py-2">2. Choose a starter</li>
              <li className="rounded-lg bg-card px-3 py-2">3. Generate and review</li>
              <li className="rounded-lg bg-card px-3 py-2">4. Publish preview</li>
            </ol>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-elevated hover:text-foreground"
            >
              Skip guide
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(s - 1, 0))}
                disabled={step === 0}
                className="rounded-md border border-border px-3 py-2 text-sm transition hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-45"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  isLast ? onClose() : setStep((s) => Math.min(s + 1, steps.length - 1))
                }
                data-cursor={isLast ? "deploy" : undefined}
                className={`inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover ${
                  isLast ? "deploy-action" : ""
                }`}
              >
                {isLast ? "Start building" : "Next"}
                {isLast ? (
                  <Icon.Wand className="h-4 w-4" />
                ) : (
                  <Icon.ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
