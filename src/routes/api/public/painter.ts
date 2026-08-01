import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });

const schema = z.object({
  action: z.enum(["accept", "get", "canvas"]),
  token: z.string().min(1).optional(),
  username: z.string().max(80).nullable().optional(),
  displayName: z.string().max(120).nullable().optional(),
  pfpUrl: z.string().max(500).nullable().optional(),
  walletAddress: z.string().max(120).nullable().optional(),
  signature: z.string().max(400).nullable().optional(),
});

export const Route = createFileRoute("/api/public/painter")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ ok: false, error: "invalid_json" }, 400);
        }
        const parsed = schema.safeParse(payload);
        if (!parsed.success) return json({ ok: false, error: "invalid_input" }, 400);
        const data = parsed.data;

        try {
          const {
            fidFromToken,
            upsertPainter,
            readPainter,
            bumpCanvasCount,
            readAllCritiquesForStats,
          } = await import("@/lib/colorzao.server");
          const { fetchNeynarProfile } = await import("@/lib/neynar.server");
          const domain = new URL(request.url).hostname;
          const fid = await fidFromToken(data.token, domain);
          if (!fid) return json({ ok: false, error: "unauthenticated" }, 401);

          if (data.action === "canvas") {
            await bumpCanvasCount(fid);
            return json({ ok: true });
          }

          if (data.action === "accept") {
            const enriched =
              data.username && data.pfpUrl ? null : await fetchNeynarProfile(fid);
            const painter = await upsertPainter({
              fid,
              username: data.username ?? enriched?.username ?? null,
              displayName: data.displayName ?? enriched?.displayName ?? null,
              pfpUrl: data.pfpUrl ?? enriched?.pfpUrl ?? null,
              walletAddress: data.walletAddress ?? null,
              signature: data.signature ?? null,
            });
            return json({ ok: true, painter });
          }

          let painter = await readPainter(fid);
          if (painter && (!painter.username || !painter.pfp_url)) {
            const profile = await fetchNeynarProfile(fid);
            if (profile) {
              painter = {
                ...painter,
                username: painter.username ?? profile.username,
                display_name: painter.display_name ?? profile.displayName,
                pfp_url: painter.pfp_url ?? profile.pfpUrl,
              };
            }
          }
          const all = await readAllCritiquesForStats();
          const mine = all.filter((c) => c.fid === fid);
          return json({
            ok: true,
            painter,
            stats: {
              critiques: mine.length,
              smashes: mine.filter((c) => c.verdict === "smash").length,
              passes: mine.filter((c) => c.verdict === "pass").length,
              canvases: painter?.canvases_painted ?? 0,
            },
          });
        } catch (error) {
          console.error("[colorzao] painter request failed", error);
          return json({ ok: false, error: "server_error" }, 500);
        }
      },
    },
  },
});
