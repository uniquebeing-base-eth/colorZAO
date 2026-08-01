import { serverDb } from "./supabase-db.server";

type QuickAuthClient = {
  verifyJwt: (input: { token: string; domain: string }) => Promise<{ sub?: string | number | null }>;
};

let quickAuthClient: QuickAuthClient | null | undefined;

async function getQuickAuthClient(): Promise<QuickAuthClient | null> {
  if (quickAuthClient !== undefined) return quickAuthClient;

  if (typeof window !== "undefined" || import.meta.env.SSR === false) {
    quickAuthClient = null;
    return null;
  }

  try {
    const mod = (await new Function("return import('@farcaster/quick-auth')")()) as {
      createClient: () => QuickAuthClient;
    };
    quickAuthClient = mod.createClient();
  } catch {
    quickAuthClient = null;
  }

  return quickAuthClient;
}

export type Painter = {
  fid: number;
  username: string | null;
  display_name: string | null;
  pfp_url: string | null;
  wallet_address: string | null;
  terms_signed_at: string | null;
  canvases_painted: number;
};

/**
 * Verifies a Farcaster Quick Auth token and returns the FID.
 * Returns null when the token is missing or invalid (guest mode).
 */
export async function fidFromToken(token: string | undefined, domain: string) {
  if (!token) return null;
  const quickAuth = await getQuickAuthClient();
  if (!quickAuth) return null;

  try {
    const payload = await quickAuth.verifyJwt({ token, domain });
    return Number(payload.sub);
  } catch {
    return null;
  }
}

export async function upsertPainter(input: {
  fid: number;
  username?: string | null;
  displayName?: string | null;
  pfpUrl?: string | null;
  walletAddress?: string | null;
  signature?: string | null;
}) {
  const row: Record<string, unknown> = {
    fid: input.fid,
    username: input.username ?? null,
    display_name: input.displayName ?? null,
    pfp_url: input.pfpUrl ?? null,
  };
  if (input.walletAddress) row['wallet_address'] = input.walletAddress;
  if (input.signature) {
    row['terms_signature'] = input.signature;
    row['terms_signed_at'] = new Date().toISOString();
  }
  const { data, error } = await serverDb()
    .from("painters")
    .upsert(row as never, { onConflict: "fid" })
    .select("fid, username, display_name, pfp_url, wallet_address, terms_signed_at, canvases_painted")
    .single();
  if (error) throw new Error(error.message);
  return data as Painter;
}

export async function readPainter(fid: number) {
  const { data, error } = await serverDb()
    .from("painters")
    .select("fid, username, display_name, pfp_url, wallet_address, terms_signed_at, canvases_painted")
    .eq("fid", fid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Painter | null) ?? null;
}

export async function bumpCanvasCount(fid: number) {
  const current = await readPainter(fid);
  if (!current) return;
  const { error } = await serverDb()
    .from("painters")
    .update({ canvases_painted: (current.canvases_painted ?? 0) + 1 } as never)
    .eq("fid", fid);
  if (error) console.error("[colorzao] canvas count update failed", error.message);
}

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

export async function insertCritique(row: Omit<CritiqueRow, "id" | "created_at">) {
  const { data, error } = await serverDb()
    .from("critiques")
    .insert(row as never)
    .select(
      "id, discovery_id, discovery_type, discovery_title, verdict, reason, comment, anonymous, fid, username, created_at",
    )
    .single();
  if (error) throw new Error(error.message);
  return data as CritiqueRow;
}


export async function readCritiques(discoveryId?: string, limit = 200) {
  let query = serverDb()
    .from("critiques")
    .select(
      "id, discovery_id, discovery_type, discovery_title, verdict, reason, comment, anonymous, fid, username, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (discoveryId) query = query.eq("discovery_id", discoveryId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as CritiqueRow[];
}

export async function readAllCritiquesForStats(limit = 5000) {
  const { data, error } = await serverDb()
    .from("critiques")
    .select("discovery_id, discovery_title, discovery_type, verdict, fid, username, anonymous, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<
    CritiqueRow,
    "discovery_id" | "discovery_title" | "discovery_type" | "verdict" | "fid" | "username" | "anonymous" | "created_at"
  >[];
}

export async function saveNotificationToken(fid: number, token: string, url: string) {
  const { error } = await serverDb()
    .from("notification_tokens")
    .upsert({ fid, token, url, enabled: true } as never, { onConflict: "fid" });
  if (error) console.error("[colorzao] token save failed", error.message);
}

export async function disableNotifications(fid: number) {
  const { error } = await serverDb()
    .from("notification_tokens")
    .update({ enabled: false } as never)
    .eq("fid", fid);
  if (error) console.error("[colorzao] token disable failed", error.message);
}
