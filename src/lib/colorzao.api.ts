/**
 * Browser-side client for the ColorZAO public API routes.
 *
 * These are plain `fetch` calls to `/api/public/*` instead of TanStack server
 * functions: the Farcaster mini app webview does not always send an `Origin`
 * header, which made the CSRF-protected server-function endpoint reject every
 * critique with a 403 ("Could not save your critique").
 */
import { supabase } from "@/integrations/supabase/client";

export type CritiqueRow = {
  id: string;
  discovery_id: string;
  discovery_type: string;
  discovery_title: string;
  verdict: "smash" | "pass";
  reason: string;
  comment: string | null;
  anonymous: boolean;
  fid: number | null;
  username: string | null;
  created_at: string;
};

export type Painter = {
  fid: number;
  username: string | null;
  display_name: string | null;
  pfp_url: string | null;
  wallet_address: string | null;
  terms_signed_at: string | null;
  canvases_painted: number;
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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The save request timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Unexpected response (${response.status})`);
  }
  const payload = body as { ok?: boolean; error?: string };
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return body as T;
}

export type CritiqueInput = {
  token?: string | undefined;
  discoveryId: string;
  discoveryType: string;
  discoveryTitle: string;
  verdict: "smash" | "pass";
  reason: string;
  comment?: string | undefined;
  anonymous: boolean;
  username?: string | null | undefined;
};

export async function submitCritique(input: CritiqueInput) {
  try {
    return await request<{ ok: true; critique: CritiqueRow }>("/api/public/critique", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (error) {
    // Anonymous critiques are permitted by a narrow database policy. This
    // keeps saves working on deployments whose server runtime has not exposed
    // its managed environment bindings, without exposing any private key.
    if (!input.anonymous) throw error;

    const comment = (input.comment ?? "").trim().slice(0, 400);
    const { data, error: databaseError } = await supabase
      .from("critiques")
      .insert({
        discovery_id: input.discoveryId,
        discovery_type: input.discoveryType,
        discovery_title: input.discoveryTitle,
        verdict: input.verdict,
        reason: input.reason.slice(0, 80),
        comment: comment || null,
        anonymous: true,
        fid: null,
        username: null,
      } as never)
      .select(
        "id, discovery_id, discovery_type, discovery_title, verdict, reason, comment, anonymous, fid, username, created_at",
      )
      .single();

    if (databaseError) throw new Error(databaseError.message);
    return { ok: true as const, critique: data as CritiqueRow };
  }
}

export async function listCritiques(discoveryId?: string) {
  const query = discoveryId ? `?id=${encodeURIComponent(discoveryId)}` : "";
  const data = await request<{ critiques: CritiqueRow[] }>(`/api/public/critique${query}`);
  return data.critiques;
}

export async function getLeaderboard() {
  return request<{
    exhibits: LeaderboardEntry[];
    curators: CuratorEntry[];
    totalCritiques: number;
  }>("/api/public/leaderboard");
}

export async function acceptTerms(input: {
  token?: string | undefined;
  username?: string | null;
  displayName?: string | null;
  pfpUrl?: string | null;
  walletAddress?: string | null;
  signature?: string | null;
}) {
  return request<{ ok: true; painter: Painter }>("/api/public/painter", {
    method: "POST",
    body: JSON.stringify({ action: "accept", ...input }),
  });
}

export async function getPainter(token?: string) {
  try {
    return await request<{
      painter: Painter | null;
      stats: { critiques: number; smashes: number; passes: number; canvases: number };
    }>("/api/public/painter", {
      method: "POST",
      body: JSON.stringify({ action: "get", token }),
    });
  } catch {
    return null;
  }
}

export async function registerCanvasPainted(token?: string) {
  if (!token) return;
  try {
    await request("/api/public/painter", {
      method: "POST",
      body: JSON.stringify({ action: "canvas", token }),
    });
  } catch {
    /* non-critical */
  }
}
