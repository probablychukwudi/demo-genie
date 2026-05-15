import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "./Icons";

interface NavItem {
  label: string;
  path: string;
  icon: keyof typeof Icon;
  external?: boolean;
  disabledReason?: string;
}

interface NavRailProps {
  livePreviewSlug: string | null;
}

export function NavRail({ livePreviewSlug }: NavRailProps) {
  const [expanded, setExpanded] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  const items: NavItem[] = [
    { label: "New Demo", path: "/", icon: "Wand" },
    { label: "History", path: "/history", icon: "Clock" },
    {
      label: "Live Preview",
      path: `/preview/${livePreviewSlug ?? "acme-x42z"}`,
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
      <div className="flex items-center gap-2 border-b border-border px-3 py-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon.Zap className="h-4 w-4" />
        </div>
        {expanded && (
          <span className="font-semibold tracking-tight">DemoGenie</span>
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
              <IconC
                className={`h-4 w-4 shrink-0 ${isActive ? "text-accent" : ""}`}
              />
              {expanded && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-center border-t border-border py-3 text-muted-foreground transition hover:text-foreground"
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        {expanded ? (
          <Icon.ChevronLeft className="h-4 w-4" />
        ) : (
          <Icon.ChevronRight className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
