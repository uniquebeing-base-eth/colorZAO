import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

export type LeaderboardEntry = {
  discoveryId: string;
  title: string;
  type: string;
  smashes: number;
  passes: number;
  total: number;
  rate: number;
};

export type CuratorEntry = {
  fid: number;
  username: string;
  critiques: number;
  displayName?: string | null;
  pfpUrl?: string | null;
};

export const Route = createFileRoute("/api/public/leaderboard")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async () => {
        try {
          const { readAllCritiquesForStats } = await import("@/lib/colorzao.server");
          const { fetchNeynarProfiles } = await import("@/lib/neynar.server");
          const rows = await readAllCritiquesForStats();

          const byDiscovery = new Map<string, LeaderboardEntry>();
          const byCurator = new Map<number, CuratorEntry>();

          for (const row of rows) {
            const entry = byDiscovery.get(row.discovery_id) ?? {
              discoveryId: row.discovery_id,
              title: row.discovery_title,
              type: row.discovery_type,
              smashes: 0,
              passes: 0,
              total: 0,
              rate: 0,
            };
            if (row.verdict === "smash") entry.smashes += 1;
            else entry.passes += 1;
            entry.total += 1;
            entry.rate = Math.round((entry.smashes / entry.total) * 100);
            byDiscovery.set(row.discovery_id, entry);

            if (row.fid && !row.anonymous) {
              const curator = byCurator.get(row.fid) ?? {
                fid: row.fid,
                username: row.username ?? `fid:${row.fid}`,
                critiques: 0,
              };
              curator.critiques += 1;
              byCurator.set(row.fid, curator);
            }
          }

          const exhibits = [...byDiscovery.values()].sort(
            (a, b) => b.smashes - a.smashes || b.rate - a.rate,
          );
          const curators = [...byCurator.values()]
            .sort((a, b) => b.critiques - a.critiques)
            .slice(0, 20);

          const profiles = await fetchNeynarProfiles(curators.map((c) => c.fid));
          for (const curator of curators) {
            const profile = profiles.get(curator.fid);
            if (!profile) continue;
            if (profile.username) curator.username = profile.username;
            curator.displayName = profile.displayName;
            curator.pfpUrl = profile.pfpUrl;
          }

          return new Response(
            JSON.stringify({ ok: true, exhibits, curators, totalCritiques: rows.length }),
            { headers: { "content-type": "application/json", ...corsHeaders } },
          );
        } catch (error) {
          console.error("[colorzao] leaderboard failed", error);
          return new Response(JSON.stringify({ ok: false, error: "read_failed" }), {
            status: 500,
            headers: { "content-type": "application/json", ...corsHeaders },
          });
        }
      },
    },
  },
});
