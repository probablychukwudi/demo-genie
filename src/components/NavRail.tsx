import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icons";
import type { AppTheme } from "@/lib/store";

interface NavItem {
  label: string;
  path: string;
  icon: keyof typeof Icon;
  external?: boolean;
  disabledReason?: string;
}

interface NavRailProps {
  livePreviewSlug: string | null;
  onOpenOnboarding?: () => void;
  theme: AppTheme;
  onToggleTheme: () => void;
}

export function NavRail({ livePreviewSlug, onOpenOnboarding, theme, onToggleTheme }: NavRailProps) {
  const [expanded, setExpanded] = useState(true);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const ThemeIcon = theme === "dark" ? Icon.Moon : Icon.Sun;

  const items: NavItem[] = [
    { label: "New Demo", path: "/", icon: "Wand" },
    { label: "Demo Library", path: "/history", icon: "Clock" },
    { label: "Usage", path: "/usage", icon: "Usage" },
    {
      label: "Live Preview",
      path: `/preview/${livePreviewSlug ?? "heygen-demo"}`,
      icon: "External",
      external: true,
    },
    { label: "Settings", path: "/settings", icon: "Settings" },
  ];

  return (
    <aside
      className="relative flex flex-col border-r border-border bg-card transition-[width] duration-200 ease-out"
      style={{ width: expanded ? 208 : 56 }}
    >
      <div
        className={`flex min-h-[64px] items-center border-b border-border px-3 py-3 ${
          expanded ? "justify-start" : "justify-center"
        }`}
      >
        {expanded ? (
          <div className="rounded-xl bg-black px-2.5 py-2 shadow-sm">
            <BrandLogo variant="wordmark" className="h-8 w-auto max-w-[160px]" />
          </div>
        ) : (
          <BrandLogo variant="icon" className="h-8 w-8" />
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {items.map((item) => {
          const isActive =
            !item.external && (item.path === "/" ? path === "/" : path.startsWith(item.path));
          const IconC = Icon[item.icon];

          if (item.disabledReason) {
            return (
              <div
                key={item.label}
                title={item.disabledReason}
                aria-disabled="true"
                className={`group flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground/60 ${
                  expanded ? "" : "justify-center"
                }`}
              >
                <IconC className="h-4 w-4 shrink-0" />
                {expanded && <span className="truncate">{item.label}</span>}
              </div>
            );
          }

          if (item.external) {
            return (
              <a
                key={item.label}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                title={item.label}
                className={`group flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition hover:bg-elevated hover:text-foreground ${
                  expanded ? "" : "justify-center"
                }`}
              >
                <IconC className="h-4 w-4 shrink-0" />
                {expanded && <span className="truncate">{item.label}</span>}
              </a>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.path}
              title={item.label}
              className={`group relative flex items-center gap-3 rounded-md px-2 py-2 text-sm transition ${
                isActive
                  ? "bg-elevated text-foreground"
                  : "text-muted-foreground hover:bg-elevated hover:text-foreground"
              } ${expanded ? "" : "justify-center"}`}
            >
              {isActive && (
                <span className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-accent" />
              )}
              <IconC className={`h-4 w-4 shrink-0 ${isActive ? "text-accent" : ""}`} />
              {expanded && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className={`mb-1 flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition hover:bg-elevated hover:text-foreground ${
            expanded ? "" : "justify-center"
          }`}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <ThemeIcon className="h-4 w-4 shrink-0" />
          {expanded && (
            <span className="truncate">{theme === "dark" ? "Dark mode" : "Light mode"}</span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenOnboarding}
          className={`mb-1 flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition hover:bg-elevated hover:text-foreground ${
            expanded ? "" : "justify-center"
          }`}
          aria-label="Open onboarding guide"
          title="Guide"
        >
          <Icon.Help className="h-4 w-4 shrink-0" />
          {expanded && <span className="truncate">Guide</span>}
        </button>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center rounded-md py-2 text-muted-foreground transition hover:bg-elevated hover:text-foreground"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <Icon.ChevronLeft className="h-4 w-4" />
          ) : (
            <Icon.ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
