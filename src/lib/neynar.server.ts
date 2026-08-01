/**
 * Neynar profile lookups (server only).
 *
 * The mini app only ever receives a Farcaster fid from Quick Auth. Neynar is
 * used to resolve that fid into a display name / username / avatar so the
 * profile screen and Hall of Fame show real people instead of "fid:123".
 */

const NEYNAR_BULK_USERS = "https://api.neynar.com/v2/farcaster/user/bulk";

export type NeynarProfile = {
  fid: number;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
};

type NeynarUser = {
  fid: number;
  username?: string | null;
  display_name?: string | null;
  pfp_url?: string | null;
};

/** Tiny in-process cache so repeated leaderboard renders don't re-hit the API. */
const cache = new Map<number, { at: number; profile: NeynarProfile }>();
const TTL_MS = 10 * 60 * 1000;

export async function fetchNeynarProfiles(fids: number[]): Promise<Map<number, NeynarProfile>> {
  const result = new Map<number, NeynarProfile>();
  const unique = [...new Set(fids.filter((f) => Number.isFinite(f) && f > 0))];
  if (!unique.length) return result;

  const now = Date.now();
  const missing: number[] = [];
  for (const fid of unique) {
    const hit = cache.get(fid);
    if (hit && now - hit.at < TTL_MS) result.set(fid, hit.profile);
    else missing.push(fid);
  }
  if (!missing.length) return result;

  const apiKey = process.env['NEYNAR_API_KEY'];
  if (!apiKey) return result;

  // Neynar accepts up to 100 fids per bulk call.
  for (let i = 0; i < missing.length; i += 100) {
    const batch = missing.slice(i, i + 100);
    try {
      const response = await fetch(`${NEYNAR_BULK_USERS}?fids=${batch.join(",")}`, {
        headers: { accept: "application/json", "x-api-key": apiKey },
      });
      if (!response.ok) {
        console.error(`[colorzao] neynar lookup failed [${response.status}]: ${await response.text()}`);
        continue;
      }
      const body = (await response.json()) as { users?: NeynarUser[] };
      for (const user of body.users ?? []) {
        const profile: NeynarProfile = {
          fid: user.fid,
          username: user.username ?? null,
          displayName: user.display_name ?? null,
          pfpUrl: user.pfp_url ?? null,
        };
        cache.set(user.fid, { at: now, profile });
        result.set(user.fid, profile);
      }
    } catch (error) {
      console.error("[colorzao] neynar lookup error", error);
    }
  }

  return result;
}

export async function fetchNeynarProfile(fid: number): Promise<NeynarProfile | null> {
  const map = await fetchNeynarProfiles([fid]);
  return map.get(fid) ?? null;
}
