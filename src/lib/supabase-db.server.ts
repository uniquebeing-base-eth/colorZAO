/**
 * Resilient server-side Supabase client for ColorZAO.
 *
 * Primary path: the service-role client (full access, RLS bypassed).
 * Fallback path: if the service-role key is not present in the runtime
 * environment (e.g. an edge deployment where only public config was injected),
 * we fall back to a publishable-key client. Critique submission + reads are
 * explicitly allowed for that key by narrow RLS policies, so the public
 * critique flow keeps working instead of hard-failing.
 *
 * Sensitive tables (painters, notification_tokens) have NO anon policies, so
 * the fallback can never read or write wallet addresses, signatures or tokens.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isOpaqueKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function keyedFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    // Opaque sb_ keys are not JWTs - never send them as a bearer token.
    if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

let cached: SupabaseClient<Database> | undefined;

export function serverDb(): SupabaseClient<Database> {
  if (cached) return cached;

  // VITE_* values are compiled into both browser and server bundles. Keep them
  // as a fallback because Cloudflare deployments do not always expose the
  // process.env bindings that are available in the Lovable preview runtime.
  const url =
    process.env["SUPABASE_URL"] ??
    process.env["VITE_SUPABASE_URL"] ??
    import.meta.env["VITE_SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const publishableKey =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["SUPABASE_ANON_KEY"] ??
    process.env["VITE_SUPABASE_ANON_KEY"] ??
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    import.meta.env["VITE_SUPABASE_ANON_KEY"];

  const key = serviceKey ?? publishableKey;

  if (!url || !key) {
    throw new Error(
      "Database is not configured for this deployment. Missing backend URL or API key.",
    );
  }

  if (!serviceKey) {
    console.warn("[colorzao] service role key unavailable - using restricted public key client");
  }

  cached = createClient<Database>(url, key, {
    global: { fetch: keyedFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
