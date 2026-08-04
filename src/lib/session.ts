/**
 * Canvas session state.
 *
 * Navigating to Profile / Hall of Fame / Critique / Help unmounts the gallery
 * route, so the painting session is mirrored into sessionStorage and restored
 * on the way back. The welcome screen therefore only appears on a fresh launch.
 */
export type CanvasSession = {
  started: boolean;
  canvasNo: number;
  artSrc: string | null;
  discoveryId: string | null;
  stage: "paint" | "reveal" | "why" | "identity" | "done";
  verdict: "smash" | "pass";
  reason: string | null;
  comment: string;
  anon: boolean;
  progress: number;
};

const KEY = "colorzao:session";

export const emptySession: CanvasSession = {
  started: false,
  canvasNo: 1,
  artSrc: null,
  discoveryId: null,
  stage: "paint",
  verdict: "smash",
  reason: null,
  comment: "",
  anon: true,
  progress: 0,
};

export function loadSession(): CanvasSession {
  if (typeof window === "undefined") return emptySession;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return emptySession;
    return { ...emptySession, ...(JSON.parse(raw) as Partial<CanvasSession>) };
  } catch {
    return emptySession;
  }
}

export function saveSession(session: CanvasSession) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}
