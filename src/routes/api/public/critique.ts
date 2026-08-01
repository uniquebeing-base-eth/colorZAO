import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });

const critiqueSchema = z.object({
  token: z.string().min(1).optional(),
  discoveryId: z.string().min(1).max(120),
  discoveryType: z.string().min(1).max(60),
  discoveryTitle: z.string().min(1).max(200),
  verdict: z.enum(["smash", "pass"]),
  reason: z.string().min(1).max(80),
  comment: z.string().max(400).optional().nullable(),
  anonymous: z.boolean(),
  username: z.string().max(80).optional().nullable(),
});

export const Route = createFileRoute("/api/public/critique")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request }) => {
        try {
          const { readCritiques } = await import("@/lib/colorzao.server");
          const id = new URL(request.url).searchParams.get("id") ?? undefined;
          return json({ ok: true, critiques: await readCritiques(id) });
        } catch (error) {
          console.error("[colorzao] list critiques failed", error);
          return json({ ok: false, error: "read_failed" }, 500);
        }
      },

      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ ok: false, error: "invalid_json" }, 400);
        }

        const parsed = critiqueSchema.safeParse(payload);
        if (!parsed.success) {
          console.error("[colorzao] critique validation failed", parsed.error.flatten());
          return json({ ok: false, error: "invalid_input", details: parsed.error.flatten() }, 400);
        }

        const data = parsed.data;
        try {
          const { fidFromToken, insertCritique } = await import("@/lib/colorzao.server");
          const { resolveCritiqueIdentity } = await import("@/lib/critique-identity");
          const domain = new URL(request.url).hostname;
          const fid = await fidFromToken(data.token, domain);

          const identity = resolveCritiqueIdentity({
            anonymous: data.anonymous,
            username: data.username,
            fid,
          });

          const comment = (data.comment ?? "").trim().slice(0, 400);
          const row = await insertCritique({
            discovery_id: data.discoveryId,
            discovery_type: data.discoveryType,
            discovery_title: data.discoveryTitle,
            verdict: data.verdict,
            reason: data.reason.slice(0, 80),
            comment: comment.length ? comment : null,
            anonymous: identity.anonymous,
            fid: identity.fid,
            username: identity.username,
          });

          return json({ ok: true, critique: row });
        } catch (error) {
          console.error("[colorzao] critique insert failed", error);
          return json(
            { ok: false, error: error instanceof Error ? error.message : "insert_failed" },
            500,
          );
        }
      },
    },
  },
});
