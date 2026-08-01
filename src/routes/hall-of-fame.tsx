import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star } from "lucide-react";
import { getLeaderboard } from "@/lib/colorzao.api";

export const Route = createFileRoute("/hall-of-fame")({
  head: () => ({
    meta: [
      { title: "Hall of Fame — ColorZAO" },
      {
        name: "description",
        content:
          "Community rankings of the most celebrated exhibits, artists and workshops uncovered in the ColorZAO gallery.",
      },
      { property: "og:title", content: "Hall of Fame — ColorZAO" },
      {
        property: "og:description",
        content: "Top artists, projects and workshops ranked by curators of the gallery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/hall-of-fame" }],
  }),
  component: HallOfFame,
});

function HallOfFame() {
  const tabs = ["Exhibits", "Curators"] as const;
  const [tab, setTab] = useState<(typeof tabs)[number]>("Exhibits");
  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboard(),
  });

  const exhibits = data?.exhibits ?? [];
  const curators = data?.curators ?? [];
  const totalCritiques = data?.totalCritiques ?? 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-background px-5 pb-12 pt-5">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          aria-label="Back to gallery"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card shadow-soft"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-foreground">Hall of Fame</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Ranked by community smash rate, feedback volume, and curator engagement.
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: tab === t ? "var(--primary)" : "var(--card)",
              color: tab === t ? "var(--primary-foreground)" : "var(--muted-foreground)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        {isLoading
          ? "Loading leaderboard…"
          : error
          ? "Could not load leaderboard. Please refresh."
          : `${totalCritiques} critique${totalCritiques === 1 ? "" : "s"} recorded.`}
      </div>

      <div className="mt-4 min-h-[14rem]">
        {isLoading ? (
          <div className="rounded-3xl bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-soft">
            Loading leaderboard…
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-soft">
            Could not load leaderboard. Please refresh the page.
          </div>
        ) : tab === "Exhibits" ? (
          <ol className="space-y-2">
            {exhibits.length === 0 ? (
              <li className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-soft">
                No leaderboard data yet. Be the first to leave critique.
              </li>
            ) : (
              exhibits.map((entry, i) => (
                <li
                  key={`${entry.discoveryId}-${i}`}
                  className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft"
                >
                  <span className="w-5 text-sm font-bold text-muted-foreground">{i + 1}</span>
                  <span className="h-9 w-9 rounded-full bg-brand-gradient opacity-90" />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-foreground">{entry.title}</span>
                    <span className="block text-xs text-muted-foreground">{entry.type}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1 text-right text-sm text-foreground">
                    <span className="font-semibold">{entry.rate}% smash</span>
                    <span className="text-xs text-muted-foreground">{entry.total} critique{entry.total === 1 ? "" : "s"}</span>
                  </span>
                </li>
              ))
            )}
          </ol>
        ) : (
          <ol className="space-y-2">
            {curators.length === 0 ? (
              <li className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted-foreground shadow-soft">
                No curator activity yet. Submit critiques to build the hall of fame.
              </li>
            ) : (
              curators.map((curator, i) => (
                <li
                  key={`${curator.fid}-${i}`}
                  className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft"
                >
                  <span className="w-5 text-sm font-bold text-muted-foreground">{i + 1}</span>
                  {curator.pfpUrl ? (
                    <img
                      src={curator.pfpUrl}
                      alt={`${curator.displayName ?? curator.username} avatar`}
                      loading="lazy"
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="h-9 w-9 rounded-full bg-brand-gradient opacity-90" />
                  )}
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {curator.displayName ?? curator.username ?? `fid:${curator.fid}`}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {curator.username ? `@${curator.username}` : "Curator"}
                    </span>
                  </span>

                  <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                    <Star className="h-3.5 w-3.5 text-brand-orange" /> {curator.critiques}
                  </span>
                </li>
              ))
            )}
          </ol>
        )}
      </div>
    </main>
  );
}
