import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useFarcaster } from "@/lib/useFarcaster";
import { getPainter } from "@/lib/colorzao.api";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Curator Profile — ColorZAO" },
      {
        name: "description",
        content:
          "Track your canvases painted, exhibits uncovered, artists discovered and critique submitted in the ColorZAO gallery.",
      },
      { property: "og:title", content: "Curator Profile — ColorZAO" },
      {
        property: "og:description",
        content: "Your discoveries, critique and impact as a curator.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/profile" }],
  }),
  component: Profile,
});

function Profile() {
  const { ready, user, getToken } = useFarcaster();
  const { data, isLoading } = useQuery({
    queryKey: ["painter"],
    queryFn: async () => getPainter(await getToken()),
    enabled: ready,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const painter = data?.painter;
  const stats = data?.stats ?? {
    critiques: 0,
    smashes: 0,
    passes: 0,
    canvases: 0,
  };
  const profileName = painter?.username
    ? `@${painter.username}`
    : user?.username
    ? `@${user.username}`
    : "Guest curator";
  const profileLabel = painter || user ? "Farcaster" : "Guest";
  const connected = Boolean(painter || user);
  const statRows = [
    ["Canvases Painted", String(stats.canvases)],
    ["Critique Submitted", String(stats.critiques)],
    ["Smashes", String(stats.smashes)],
    ["Passes", String(stats.passes)],
  ];
  const activity = [] as Array<[string, string, string]>;

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
        <h1 className="text-xl font-bold text-foreground">My Profile</h1>
      </div>

      <section className="mt-5 flex items-center gap-4">
        <span className="h-16 w-16 rounded-full bg-brand-gradient" />
        <div>
          <p className="text-lg font-bold text-foreground">{profileName}</p>
          <p className="text-xs text-muted-foreground">
            {profileLabel} ·{" "}
            <span className="rounded-full bg-accent/12 px-2 py-0.5 font-semibold text-accent">
              {profileLabel === "Guest" ? "Preview" : "Connected"}
            </span>
          </p>
        </div>
      </section>
      <p className="mt-3 text-sm italic text-muted-foreground">
        {profileLabel === "Guest"
          ? "Connect with Farcaster to save critique and track your impact."
          : "Your latest critique stats update automatically."}
      </p>

      <div className="mt-5 rounded-3xl bg-primary/10 p-4 text-primary-foreground">
        <p className="text-sm font-semibold">Profile status</p>
        <p className="mt-2 text-[13px] leading-relaxed text-primary-foreground/90">
          {profileLabel === "Guest"
            ? "You are browsing as a guest. Open ColorZAO in Farcaster to sync your stats."
            : "Your critique history and painter stats are loaded from your Farcaster account."}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {statRows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-card p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <section className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="mb-2 text-sm font-bold text-foreground">Recent Activity</h2>
          {isLoading ? (
            <span className="text-[11px] text-muted-foreground">Loading…</span>
          ) : !connected ? (
            <span className="text-[11px] text-muted-foreground">Connect in Farcaster to see your stats.</span>
          ) : null}
        </div>
        {activity.length === 0 ? (
          <div className="rounded-3xl bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-soft">
            No recent activity to display yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {activity.map(([title, sub, time]) => (
              <li
                key={title}
                className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-soft"
              >
                <span className="h-10 w-10 rounded-xl bg-brand-gradient opacity-90" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-foreground">{title}</span>
                  <span className="block text-xs text-muted-foreground">{sub}</span>
                </span>
                <span className="text-xs text-muted-foreground">{time}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
