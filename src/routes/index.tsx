import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ExternalLink, Flame, Check, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TopNav } from "@/components/TopNav";
import { isUserRejection, useFarcaster } from "@/lib/useFarcaster";
import { haptic, loadMutePreference, sfx, unlockAudio } from "@/lib/fx";
import { acceptTerms, registerCanvasPainted, submitCritique } from "@/lib/colorzao.api";
import { loadSession, saveSession } from "@/lib/session";
import { bumpCount, pushActivity } from "@/lib/activity";
import { PaintCanvas3D } from "@/components/PaintCanvas3D";
import {
  artworks,
  discoveries,
  getDiscovery,
  palette,
  passReasons,
  shuffled,
  smashReasons,
  type Discovery,
} from "@/lib/gallery";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ColorZAO — Paint. Reveal. Discover." },
      {
        name: "description",
        content:
          "Paint grayscale artwork to uncover ZAO projects, workshops and creative facts, then leave critique that helps creators grow.",
      },
      { property: "og:title", content: "ColorZAO — Paint. Reveal. Discover." },
      {
        property: "og:description",
        content:
          "Paint the canvas to uncover a hidden exhibit. Smash or Pass, then leave critique that helps creators grow.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://colorzao.signalify.xyz/colorzao-preview.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://colorzao.signalify.xyz/colorzao-preview.png" },
      {
        name: "fc:miniapp",
        content: JSON.stringify({
          version: "1",
          imageUrl: "https://colorzao.signalify.xyz/colorzao-preview.png",
          button: {
            title: "Start Painting",
            action: {
              type: "launch_miniapp",
              name: "ColorZAO",
              url: "https://colorzao.signalify.xyz",
              splashImageUrl: "https://colorzao.signalify.xyz/splash.png",
              splashBackgroundColor: "#f7f2e8",
            },
          },
        }),
      },
    ],
    links: [{ rel: "canonical", href: "https://colorzao.signalify.xyz/" }],
  }),
  component: Gallery,
});

type Stage = "paint" | "reveal" | "why" | "identity" | "done";

function useQueue<T>(items: T[]) {
  const [order, setOrder] = useState<T[]>(() => shuffled(items));
  const [pos, setPos] = useState(0);
  const current = order[pos] ?? items[0]!;
  const next = useCallback(() => {
    setPos((p) => {
      if (p + 1 < order.length) return p + 1;
      setOrder((prev) => {
        let reshuffled = shuffled(items);
        // Never repeat the item that was just shown.
        if (reshuffled[0] === prev[prev.length - 1] && reshuffled.length > 1) {
          reshuffled = [reshuffled[1]!, reshuffled[0]!, ...reshuffled.slice(2)];
        }
        return reshuffled;
      });
      return 0;
    });
  }, [items, order.length]);
  /** Restores a specific item as the current one (used when returning to the canvas). */
  const restore = useCallback(
    (item: T) => {
      setOrder((prev) => [item, ...prev.filter((i) => i !== item)]);
      setPos(0);
    },
    [],
  );
  return { current, next, restore };
}


function Gallery() {
  const { ready, inMiniApp, user, getToken, signTerms, openUrl } = useFarcaster();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [started, setStarted] = useState(false);
  const [signing, setSigning] = useState(false);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [canvasNo, setCanvasNo] = useState(1);
  const [color, setColor] = useState(palette[5]!);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<Stage>("paint");
  const [verdict, setVerdict] = useState<"smash" | "pass">("smash");
  const [reason, setReason] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [anon, setAnon] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitTone, setSubmitTone] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  const art = useQueue(artworks);
  const disc = useQueue(discoveries);
  const discovery: Discovery = disc.current;
  const reasons = verdict === "smash" ? smashReasons : passReasons;
  const milestone = useRef(0);
  const restoredReveal = useRef(0);
  const completed = useRef(false);
  const transitionTimer = useRef<number | null>(null);

  // Restore the exact canvas the painter was on before visiting another screen.
  useEffect(() => {
    loadMutePreference();
    const session = loadSession();
    if (session.started) {
      setStarted(true);
      setCanvasNo(session.canvasNo);
      setStage(session.stage);
      setVerdict(session.verdict);
      setReason(session.reason);
      setComment(session.comment);
      setAnon(session.anon);
      setProgress(session.progress);
      if (session.artSrc && artworks.includes(session.artSrc)) art.restore(session.artSrc);
      const saved = getDiscovery(session.discoveryId ?? undefined);
      if (saved) disc.restore(saved);
      if (session.progress >= 100) {
        milestone.current = 4;
        restoredReveal.current = 100;
        completed.current = true;
      }
    } else {
      try {
        const saved = window.localStorage.getItem("colorzao:canvasNo");
        if (saved) setCanvasNo(Math.max(1, Number(saved) || 1));
      } catch {
        /* ignore */
      }
    }
    setHydrated(true);
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("colorzao:canvasNo", String(canvasNo));
    } catch {
      /* ignore */
    }
    saveSession({
      started,
      canvasNo,
      artSrc: art.current,
      discoveryId: discovery.id,
      stage,
      verdict,
      reason,
      comment,
      anon,
      progress,
    });
  }, [
    hydrated,
    started,
    canvasNo,
    art.current,
    discovery.id,
    stage,
    verdict,
    reason,
    comment,
    anon,
    progress,
  ]);


  useEffect(() => {
    return () => {
      if (transitionTimer.current) {
        window.clearTimeout(transitionTimer.current);
      }
    };
  }, []);

  const handleProgress = useCallback((p: number) => {
    setProgress(p);
    const step = Math.floor(p / 25);
    if (step > milestone.current && p < 100) {
      milestone.current = step;
      sfx.milestone();
      void haptic("light");
    }
    if (p >= 100 && !completed.current) {
      completed.current = true;
      const key = `colorzao:counted:${canvasNo}`;
      const alreadyCounted =
        typeof window !== "undefined" && window.sessionStorage.getItem(key) === "1";
      if (!alreadyCounted) {
        if (typeof window !== "undefined") window.sessionStorage.setItem(key, "1");
        sfx.reveal();
        void haptic("success");
        bumpCount("canvases");
        pushActivity({ title: "Canvas painted", sub: "Revealed a hidden exhibit" });
        void getToken().then((token) => registerCanvasPainted(token));
      }
      setStage((s) => (s === "paint" ? "reveal" : s));
    }
  }, [getToken, canvasNo]);

  const startPainting = async () => {
    unlockAudio();
    sfx.tap();
    void haptic("medium");
    let alreadySigned = false;
    try {
      alreadySigned = window.localStorage.getItem("colorzao:terms") === "1";
    } catch {
      /* ignore */
    }

    if (inMiniApp && !alreadySigned) {
      setSigning(true);
      setAuthNote(null);
      try {
        // Sequential, not Promise.all: Quick Auth and the wallet signature both
        // open a host modal, and racing them makes the sign sheet disappear.
        const token = await getToken().catch(() => undefined);
        const { address, signature } = await signTerms();
        try {
          await acceptTerms({
            token,
            username: user?.username ?? null,
            displayName: user?.displayName ?? null,
            pfpUrl: user?.pfpUrl ?? null,
            walletAddress: address,
            signature,
          });
        } catch (saveError) {
          // The signature is what the terms require. A failed/unauthenticated
          // save must never lock the painter out of the canvas.
          console.warn("[colorzao] terms accepted but not saved", saveError);
        }
        window.localStorage.setItem("colorzao:terms", "1");
        void haptic("success");
      } catch (error) {
        console.error("[colorzao] terms signature failed", error);
        setSigning(false);
        if (isUserRejection(error)) {
          setAuthNote("Sign the terms message in your wallet to start painting.");
          return;
        }
        // No wallet / SDK hiccup: let them paint instead of dead-ending.
        setAuthNote("Wallet unavailable — continuing without a signature.");
      } finally {
        setSigning(false);
      }
    }
    setStarted(true);
  };

  const nextCanvas = () => {
    if (transitionTimer.current) {
      window.clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }
    sfx.next();
    void haptic("light");
    setStage("paint");
    setProgress(0);
    setReason(null);
    setComment("");
    setAnon(true);
    setSubmitMessage(null);
    setSubmitTone("idle");
    milestone.current = 0;
    restoredReveal.current = 0;
    completed.current = false;
    setCanvasNo((n) => n + 1);
    art.next();
    disc.next();
  };

  const send = async () => {
    if (!reason) {
      setSubmitTone("error");
      setSubmitMessage("Choose a reason before submitting your critique.");
      toast.error("Choose a reason before submitting.");
      return;
    }

    setSaving(true);
    setSubmitTone("loading");
    setSubmitMessage("Saving your critique…");
    setAuthNote(null);

    try {
      // Guest saves must never wait on Farcaster. Only request a token when
      // the person explicitly chooses to attach their identity.
      const token = anon || !user
        ? undefined
        : await Promise.race([
            getToken(),
            new Promise<undefined>((_, reject) => {
              window.setTimeout(() => reject(new Error("Farcaster sign-in timed out.")), 8_000);
            }),
          ]);
      const trimmedComment = (comment ?? "").trim().slice(0, 280);
      const submission = await submitCritique({
        token,
        discoveryId: discovery.id,
        discoveryType: discovery.group,
        discoveryTitle: discovery.title,
        verdict,
        reason,
        comment: trimmedComment,
        anonymous: anon || !user,
        username: anon || !user ? null : (user?.username ?? null),
      });

      const savedRow = submission.critique;

      queryClient.setQueriesData({ queryKey: ["critiques"], exact: false }, (previous: unknown) => {
        if (!Array.isArray(previous)) return [savedRow];
        return [savedRow, ...previous];
      });
      // One save is the single source of truth: refresh every dependent view.
      void queryClient.invalidateQueries({ queryKey: ["critiques"], exact: false });
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      void queryClient.invalidateQueries({ queryKey: ["painter"] });
      void router.invalidate();

      bumpCount("critiques");
      bumpCount(verdict === "smash" ? "smashes" : "passes");
      pushActivity({
        title: `${verdict === "smash" ? "🟢 Smash" : "🔴 Pass"} · ${discovery.title}`,
        sub: reason,
      });

      sfx.success();
      void haptic("success");
      setSubmitTone("success");
      setSubmitMessage("Critique saved. Moving to the next canvas…");
      toast.success("Critique saved", {
        description: "Your feedback is now live for this project.",
      });

      transitionTimer.current = window.setTimeout(() => {
        nextCanvas();
      }, 1200);
    } catch (error) {
      console.error("[colorzao] critique submission failed", error);
      setSubmitTone("error");
      const detail = error instanceof Error ? error.message : "Unknown error";
      setSubmitMessage(`Could not save your critique (${detail}). Please try again.`);
      toast.error("Could not save your critique", { description: detail });
    } finally {
      setSaving(false);
    }
  };

  const sheetOpen = stage !== "paint";
  const canvasKey = useMemo(() => `${canvasNo}`, [canvasNo]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex h-[100dvh] w-full max-w-md items-center justify-center bg-background">
        <img src="/colorzao-wordmark.png" alt="ColorZAO" className="w-40 animate-pulse" />
      </main>
    );
  }

  if (!started) {

    return (
      <main className="mx-auto flex h-[100dvh] w-full max-w-md flex-col items-center justify-center overflow-hidden bg-background px-7 text-center">
        <img
          src="/colorzao-wordmark.png"
          alt="ColorZAO"
          className="w-56"
          width={1000}
          height={680}
        />
        <p className="-mt-2 text-[10px] font-semibold tracking-[0.3em] text-foreground">
          DISCOVER. <span className="text-brand-orange">COLOR.</span>{" "}
          <span className="text-brand-violet">SIGNAL.</span>
        </p>
        <h1 className="mt-6 text-xl font-bold text-foreground">Paint to discover</h1>
        <p className="mt-2 max-w-[19rem] text-[13px] leading-relaxed text-muted-foreground">
          Every canvas hides a project, a workshop or a creative fact. Paint the grayscale artwork
          to reveal its true colors — and what is behind it.
        </p>
        <button
          onClick={startPainting}
          disabled={!ready || signing}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-bold tracking-[0.16em] text-primary-foreground shadow-soft transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {signing ? "CONFIRM IN WALLET" : "START PAINTING 🖌"}
        </button>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {inMiniApp
            ? "You'll sign a free message to accept the terms."
            : "Open in Farcaster to sign in and save your critique."}
        </p>
        {authNote && <p className="mt-1 text-[10px] text-smash">{authNote}</p>}
        <div className="mt-4 flex gap-4 text-[11px] font-medium text-muted-foreground">
          <Link to="/hall-of-fame">Hall of Fame</Link>
          <Link to="/faq">FAQ &amp; Docs</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-background">
      <TopNav
        center={
          <>
            <h1 className="text-sm font-bold text-foreground">Canvas #{canvasNo}</h1>
            <p className="text-[10px] text-muted-foreground">
              {progress >= 100 ? "Revealed" : "Paint to reveal"}
            </p>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-3 pt-2">
        <div
          key={canvasKey}
          className="animate-canvas-in relative min-h-0 flex-1 w-full overflow-hidden rounded-3xl bg-card shadow-soft"
        >
          <PaintCanvas3D
            key={canvasKey}
            src={art.current}
            color={color}
            onProgress={handleProgress}
            onStroke={sfx.brush}
            initialReveal={restoredReveal.current}
            disabled={stage !== "paint"}
          />
        </div>

        <div className="mt-2.5 shrink-0">
          <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
            <span>Revealed</span>
            <span className="font-bold text-accent">{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-brand-gradient transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {!sheetOpen && (
          <div className="mt-2.5 flex shrink-0 items-center justify-between rounded-2xl bg-card px-3 py-2 shadow-soft">
            {palette.map((c) => (
              <button
                key={c}
                aria-label={`Select color ${c}`}
                onClick={() => {
                  setColor(c);
                  sfx.tap();
                  void haptic("light");
                }}
                className="h-7 w-7 rounded-full transition-transform"
                style={{
                  backgroundColor: c,
                  transform: color === c ? "scale(1.16)" : "scale(1)",
                  outline: color === c ? "2px solid var(--foreground)" : "none",
                  outlineOffset: "3px",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {sheetOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center">
          <div className="animate-sheet-up pointer-events-auto max-h-[54dvh] w-full overflow-y-auto rounded-t-3xl bg-card px-5 pb-5 pt-2.5 shadow-sheet">
            <div className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-border" />

            {stage === "reveal" && (
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {discovery.emoji} {discovery.kindLabel}
                  </span>
                  {discovery.tags.map((t: string) => (
                    <span
                      key={t}
                      className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-accent"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="mt-1.5 text-lg font-bold leading-tight text-foreground">
                  {discovery.title}
                </h2>
                <p className="text-[11px] text-muted-foreground">by {discovery.creator}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/80">
                  {discovery.description}
                </p>
                {discovery.projectUrl ? (
                  <button
                    onClick={() => {
                      sfx.tap();
                      void openUrl(discovery.projectUrl!);
                    }}
                    className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-2.5 text-[13px] font-semibold text-foreground"
                  >
                    Visit Exhibit <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <div className="mt-2.5 flex gap-2.5">
                  <button
                    onClick={() => {
                      setVerdict("smash");
                      setStage("why");
                      sfx.smash();
                      void haptic("heavy");
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-smash py-3.5 text-[13px] font-bold text-primary-foreground transition-transform active:scale-[0.98]"
                  >
                    <Flame className="h-4 w-4" /> SMASH
                  </button>
                  <button
                    onClick={() => {
                      setVerdict("pass");
                      setStage("why");
                      sfx.pass();
                      void haptic("medium");
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary py-3.5 text-[13px] font-bold text-foreground transition-transform active:scale-[0.98]"
                  >
                    <ArrowRight className="h-4 w-4" /> PASS
                  </button>
                </div>
              </div>
            )}

            {stage === "why" && (
              <div>
                <h2 className="text-center text-base font-bold text-foreground">
                  Why did you{" "}
                  <span className={verdict === "smash" ? "text-smash" : "text-brand-violet"}>
                    {verdict === "smash" ? "Smash" : "Pass"}?
                  </span>
                </h2>
                <p className="mt-0.5 text-center text-[11px] text-muted-foreground">
                  {discovery.title}
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {reasons.map((r) => {
                    const active = reason === r.label;
                    return (
                      <button
                        key={r.label}
                        onClick={() => {
                          setReason(r.label);
                          sfx.tap();
                          void haptic("light");
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors"
                        style={{
                          borderColor: active ? "var(--accent)" : "var(--border)",
                          backgroundColor: active
                            ? "color-mix(in oklab, var(--accent) 8%, transparent)"
                            : "transparent",
                        }}
                      >
                        <span className="text-base">{r.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-foreground">
                            {r.label}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {r.hint}
                          </span>
                        </span>
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                          style={{
                            borderColor: active ? "var(--accent)" : "var(--border)",
                            backgroundColor: active ? "var(--accent)" : "transparent",
                          }}
                        >
                          {active && <Check className="h-3 w-3 text-accent-foreground" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  disabled={!reason}
                  onClick={() => {
                    setStage("identity");
                    sfx.tap();
                  }}
                  className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[13px] font-bold text-primary-foreground disabled:opacity-40"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {stage === "identity" && (
              <div>
                <h2 className="text-center text-base font-bold text-foreground">
                  Share your <span className="text-brand-violet">critique</span> as
                </h2>
                <div className="mt-2.5 space-y-1.5">
                  {[
                    { key: true, title: "Anonymous", sub: "Your identity stays private", emoji: "🕶" },
                    {
                      key: false,
                      title: user?.username ? `@${user.username}` : "Farcaster account",
                      sub: user ? "Farcaster" : "Open in Farcaster to use this",
                      emoji: "🎨",
                    },
                  ].map((opt) => {
                    const active = anon === opt.key;
                    const locked = opt.key === false && !user;
                    return (
                      <button
                        key={opt.title}
                        disabled={locked}
                        onClick={() => {
                          setAnon(opt.key);
                          sfx.tap();
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left disabled:opacity-50"
                        style={{
                          borderColor: active ? "var(--accent)" : "var(--border)",
                          backgroundColor: active
                            ? "color-mix(in oklab, var(--accent) 8%, transparent)"
                            : "transparent",
                        }}
                      >
                        <span className="text-base">{opt.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-foreground">
                            {opt.title}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {opt.sub}
                          </span>
                        </span>
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                          style={{
                            borderColor: active ? "var(--accent)" : "var(--border)",
                            backgroundColor: active ? "var(--accent)" : "transparent",
                          }}
                        >
                          {active && <Check className="h-3 w-3 text-accent-foreground" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 280))}
                  placeholder="Add a short comment for the creator (optional)"
                  rows={2}
                  className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
                />
                <button
                  onClick={send}
                  disabled={saving}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[13px] font-bold text-primary-foreground disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit Critique
                </button>
                <div
                  aria-live="polite"
                  className="mt-1.5 min-h-5 text-center text-[11px]"
                >
                  {submitTone === "loading" && (
                    <span className="text-accent">{submitMessage}</span>
                  )}
                  {submitTone === "success" && (
                    <span className="text-smash">{submitMessage}</span>
                  )}
                  {submitTone === "error" && (
                    <span className="text-smash">{submitMessage}</span>
                  )}
                </div>
                <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" /> Anonymous critique never reveals who you are.
                </p>
              </div>
            )}

            {stage === "done" && (
              <div className="pb-1 text-center">
                <p className="rounded-2xl bg-secondary px-4 py-2.5 text-[13px] text-foreground">
                  ✅ Thanks! Your critique helps {discovery.creator} grow.
                </p>
                <Link
                  to="/feedback"
                  search={{ id: discovery.id }}
                  className="mt-2.5 block text-xs font-medium text-accent"
                >
                  See critique for {discovery.title}
                </Link>
                <button
                  onClick={nextCanvas}
                  className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[13px] font-bold text-primary-foreground"
                >
                  Next canvas <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
