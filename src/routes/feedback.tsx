import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { listCritiques } from "@/lib/colorzao.api";
import {
  discoveryGroups,
  getDiscovery,
  thumbFor,
  timeAgo,
  type DiscoveryGroup,
} from "@/lib/gallery";

type Search = { id?: string };

export const Route = createFileRoute("/feedback")({
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search['id'] === "string" ? { id: search['id'] } : {},
  head: () => ({
    meta: [
      { title: "Critique — ColorZAO" },
      {
        name: "description",
        content:
          "Read the Smash and Pass critique left by painters for every ZAO project, workshop and fact.",
      },
      { property: "og:title", content: "Critique — ColorZAO" },
      {
        property: "og:description",
        content: "Real critique from ColorZAO painters, grouped by the project that received it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Feedback,
});

type Filter = "All" | DiscoveryGroup;

function Feedback() {
  const { id } = Route.useSearch();
  const focused = getDiscovery(id);
  const [filter, setFilter] = useState<Filter>("All");
  const [showFocused, setShowFocused] = useState(Boolean(focused));

  const { data, isLoading } = useQuery({
    queryKey: ["critiques", showFocused ? id : "all"],
    queryFn: () => listCritiques(showFocused && id ? id : undefined),
  });

  const rows = (data ?? []).filter((row) =>
    showFocused || filter === "All" ? true : row.discovery_type === filter,
  );

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-4">
        <Link
          to="/"
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card shadow-soft"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-foreground">
            {showFocused && focused ? focused.title : "Critique"}
          </h1>
          <p className="truncate text-[11px] text-muted-foreground">
            {showFocused && focused
              ? `Feedback for ${focused.creator}`
              : "Every critique, newest first"}
          </p>
        </div>
      </header>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-2">
        {focused && (
          <FilterChip
            label={focused.title}
            active={showFocused}
            onClick={() => setShowFocused(true)}
          />
        )}
        {(["All", ...discoveryGroups] as Filter[]).map((f) => (
          <FilterChip
            key={f}
            label={f === "All" ? "All Feedback" : f}
            active={!showFocused && filter === f}
            onClick={() => {
              setShowFocused(false);
              setFilter(f);
            }}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-5">
        {isLoading && <p className="pt-8 text-center text-xs text-muted-foreground">Loading…</p>}
        {!isLoading && rows.length === 0 && (
          <div className="pt-16 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="mt-2 text-sm font-semibold text-foreground">No critique yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paint a canvas and be the first to leave feedback.
            </p>
          </div>
        )}
        {rows.map((row) => (
          <article key={row.id} className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft">
            <img
              src={thumbFor(row.discovery_id)}
              alt=""
              loading="lazy"
              width={1024}
              height={1280}
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="truncate text-[13px] font-bold text-foreground">
                  {row.discovery_title}
                </h2>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {timeAgo(row.created_at)}
                </span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {getDiscovery(row.discovery_id)?.creator ?? row.discovery_type}
              </p>
              <p className="mt-1 text-[12px] font-semibold text-foreground">
                {row.verdict === "smash" ? "🔥" : "➡️"} {row.reason}
              </p>
              {row.comment && (
                <p className="mt-0.5 text-[12px] leading-snug text-foreground/80">
                  “{row.comment}”
                </p>
              )}
              <p className="mt-1 text-[10px] font-medium text-accent">
                {row.anonymous || !row.username ? "Anonymous" : `@${row.username}`}
              </p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors"
      style={{
        backgroundColor: active ? "var(--accent)" : "var(--secondary)",
        color: active ? "var(--accent-foreground)" : "var(--muted-foreground)",
      }}
    >
      {label}
    </button>
  );
}
