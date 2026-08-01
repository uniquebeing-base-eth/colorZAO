import { createFileRoute } from "@tanstack/react-router";
import manifest from "../../../public/.well-known/farcaster.json";

/**
 * Serves the Farcaster Mini App manifest.
 * Also present as a static file, but this route guarantees the exact
 * `/.well-known/farcaster.json` URL on every hosting target.
 */
export const Route = createFileRoute("/.well-known/farcaster.json")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(manifest), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        }),
    },
  },
});
