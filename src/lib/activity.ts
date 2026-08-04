/**
 * Local mirror of a painter's activity so the profile shows something useful
 * immediately after every interaction, including for guests who are not
 * signed in with Farcaster.
 */
export type ActivityItem = {
  id: string;
  title: string;
  sub: string;
  at: string;
};

const KEY = "colorzao:activity";
const LIMIT = 25;

export function readActivity(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ActivityItem[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, LIMIT) : [];
  } catch {
    return [];
  }
}

export function pushActivity(item: Omit<ActivityItem, "id" | "at">) {
  if (typeof window === "undefined") return;
  const next: ActivityItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify([next, ...readActivity()].slice(0, LIMIT)));
    window.dispatchEvent(new CustomEvent("colorzao:activity"));
  } catch {
    /* ignore */
  }
}

export type LocalCounts = { canvases: number; critiques: number; smashes: number; passes: number };

const COUNTS_KEY = "colorzao:counts";

export function readCounts(): LocalCounts {
  const empty: LocalCounts = { canvases: 0, critiques: 0, smashes: 0, passes: 0 };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(COUNTS_KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<LocalCounts>) } : empty;
  } catch {
    return empty;
  }
}

export function bumpCount(key: keyof LocalCounts, by = 1) {
  if (typeof window === "undefined") return;
  const counts = readCounts();
  counts[key] += by;
  try {
    window.localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
    window.dispatchEvent(new CustomEvent("colorzao:activity"));
  } catch {
    /* ignore */
  }
}
