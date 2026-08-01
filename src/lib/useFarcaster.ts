import { useCallback, useEffect, useRef, useState } from "react";

export type FarcasterUser = {
  fid: number;
  username: string | null;
  displayName: string | null;
  pfpUrl: string | null;
};

export const TERMS_MESSAGE = [
  "ColorZAO — Terms & Agreement",
  "",
  "By signing you confirm that you:",
  "1. Paint canvases and leave critique in good faith.",
  "2. Allow ColorZAO to store your critique for creators.",
  "3. Accept that critique is public but can stay anonymous.",
  "",
  "No transaction is made and no funds ever leave your wallet.",
].join("\n");

function toHex(message: string): `0x${string}` {
  const bytes = new TextEncoder().encode(message);
  return ("0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

const FARCASTER_SDK_URL = "https://esm.sh/@farcaster/miniapp-sdk@0.3.0";

/** Minimal structural type for the parts of the Mini App SDK this app uses. */
type MiniAppSdk = {
  actions: {
    ready?: (options?: unknown) => unknown;
    composeCast: (options: unknown) => Promise<unknown>;
    openUrl: (url: string) => Promise<unknown>;
    addMiniApp: () => Promise<unknown>;
  };
  isInMiniApp: () => Promise<boolean>;
  context: Promise<{
    user?: {
      fid: number;
      username?: string | null;
      displayName?: string | null;
      pfpUrl?: string | null;
    };
  }>;
  quickAuth: {
    getToken: () => Promise<{ token?: string } | undefined>;
  };
  wallet: {
    getEthereumProvider: () => Promise<
      { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | undefined
    >;
  };
};

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

/** True only when the person explicitly declined the signature request. */
export function isUserRejection(error: unknown) {
  const code = (error as { code?: number })?.code;
  const message = String((error as { message?: string })?.message ?? "").toLowerCase();
  return code === 4001 || message.includes("reject") || message.includes("denied");
}

let sdkPromise: Promise<MiniAppSdk | null> | undefined;

function couldBeFarcasterHost() {
  if (typeof window === "undefined") return false;
  try {
    const referrer = document.referrer;
    // Lovable editor/preview embeds the app too — skip the handshake there.
    if (/lovable\.(dev|app|cloud)|localhost/i.test(referrer)) return false;
  } catch {
    /* ignore */
  }
  // Farcaster / Base App can host the mini app in a top-level native webview,
  // where window.parent === window.self. Let the SDK decide via isInMiniApp().
  return true;
}

async function loadMiniAppSdk(): Promise<MiniAppSdk | null> {
  if (typeof window === "undefined" || import.meta.env.SSR) {
    return null;
  }
  if (!couldBeFarcasterHost()) return null;

  sdkPromise ??= (async () => {
    try {
      const mod = await import(/* @vite-ignore */ FARCASTER_SDK_URL);
      return ((mod as { sdk?: unknown; default?: unknown }).sdk ??
        (mod as { default?: unknown }).default ??
        null) as MiniAppSdk | null;
    } catch {
      return null;
    }
  })();

  return sdkPromise;
}

async function notifyFarcasterReady() {
  if (typeof window === "undefined" || import.meta.env.SSR) {
    return false;
  }

  try {
    const sdk = await loadMiniAppSdk();
    if (!sdk) return false;

    const readyFn = sdk.actions?.ready;
    if (typeof readyFn !== "function") {
      return false;
    }

    await Promise.resolve(readyFn({})).catch(() => undefined);
    return true;
  } catch {
    /* ignore */
  }

  return false;
}

/**
 * Bridges the Farcaster Mini App SDK into React.
 * Everything degrades gracefully when the app is opened in a plain browser.
 */
export function useFarcaster() {
  const [ready, setReady] = useState(false);
  const [inMiniApp, setInMiniApp] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const tokenRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sdk = await loadMiniAppSdk();
        if (!sdk) {
          if (!cancelled) setReady(true);
          return;
        }

        const inside = await sdk.isInMiniApp().catch(() => false);
        if (cancelled) return;
        setInMiniApp(inside);
        if (inside) {
          const context = await sdk.context;
          if (!cancelled && context?.user) {
            setUser({
              fid: context.user.fid,
              username: context.user.username ?? null,
              displayName: context.user.displayName ?? null,
              pfpUrl: context.user.pfpUrl ?? null,
            });
          }
          try {
            const result = await sdk.quickAuth.getToken();
            if (!cancelled) tokenRef.current = result?.token;
          } catch {
            /* user not signed in */
          }
        }
      } catch {
        /* SDK unavailable outside a Farcaster client */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const finalizeReady = async () => {
      if (!active) return;

      await new Promise((resolve) => window.setTimeout(resolve, 250));
      if (!active) return;

      for (let attempt = 0; attempt < 8 && active; attempt += 1) {
        const sent = await notifyFarcasterReady();
        if (sent) break;
        await new Promise((resolve) => window.setTimeout(resolve, 750));
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void finalizeReady();
      }
    };

    void finalizeReady();
    window.addEventListener("focus", finalizeReady);
    window.addEventListener("load", finalizeReady);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener("focus", finalizeReady);
      window.removeEventListener("load", finalizeReady);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const getToken = useCallback(async () => {
    if (tokenRef.current) return tokenRef.current;
    try {
      const sdk = await loadMiniAppSdk();
      if (!sdk) return undefined;

      const result = await sdk.quickAuth.getToken();
      tokenRef.current = result?.token;
      return tokenRef.current;
    } catch {
      return undefined;
    }
  }, []);

  /** Prompts a wallet signature for the ColorZAO terms. */
  const signTerms = useCallback(async () => {
    const sdk = await loadMiniAppSdk();
    if (!sdk) throw new Error("Farcaster SDK unavailable");

    const walletApi = sdk.wallet as unknown as {
      getEthereumProvider?: () => Promise<EthProvider | undefined>;
      ethProvider?: EthProvider;
    };
    const provider =
      (await walletApi.getEthereumProvider?.().catch(() => undefined)) ?? walletApi.ethProvider;
    if (!provider) throw new Error("No wallet available");

    // Some hosts already have an authorised account; asking for it first avoids
    // stacking two modals (connect + sign), which makes the sign prompt vanish.
    let accounts = (await provider
      .request({ method: "eth_accounts" })
      .catch(() => [])) as string[];
    if (!accounts?.length) {
      accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
    }
    const address = accounts?.[0];
    if (!address) throw new Error("No wallet address");

    const signature = (await provider.request({
      method: "personal_sign",
      params: [toHex(TERMS_MESSAGE), address],
    })) as string;
    return { address, signature };
  }, []);

  const addMiniApp = useCallback(async () => {
    try {
      const sdk = await loadMiniAppSdk();
      if (!sdk) return false;

      await sdk.actions.addMiniApp();
      return true;
    } catch {
      return false;
    }
  }, []);

  const openUrl = useCallback(async (url: string) => {
    try {
      const sdk = await loadMiniAppSdk();
      if (!sdk) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      await sdk.actions.openUrl(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  return { ready, inMiniApp, user, getToken, signTerms, addMiniApp, openUrl };
}
