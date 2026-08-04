import { getDiscovery, type Discovery } from "@/lib/gallery";

/** 🎨 Artist / 🚀 Project / 🎵 Music / 🖼 Artwork / 📚 Workshop / 💡 Fact */
export function typeBadge(discoveryId: string, fallbackType: string) {
  const d: Discovery | undefined = getDiscovery(discoveryId);
  const group = d?.group ?? fallbackType;
  const tags = d?.tags ?? [];

  if (tags.includes("Music")) return { emoji: "🎵", label: "Music" };
  if (tags.includes("Art") || tags.includes("Artwork")) return { emoji: "🖼", label: "Artwork" };
  if (group === "Artists") return { emoji: "🎨", label: "Artist" };
  if (group === "Workshops") return { emoji: "📚", label: "Workshop" };
  if (group === "Facts") return { emoji: "💡", label: "Fact" };
  if (group === "Builders") return { emoji: "🚀", label: "Project" };
  return { emoji: d?.emoji ?? "🖼", label: d?.kindLabel ?? fallbackType };
}

export function TypeBadge({ discoveryId, type }: { discoveryId: string; type: string }) {
  const badge = typeBadge(discoveryId, type);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      <span aria-hidden>{badge.emoji}</span>
      {badge.label}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: "smash" | "pass" }) {
  const smash = verdict === "smash";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.12em]"
      style={{
        backgroundColor: smash
          ? "color-mix(in oklab, var(--smash) 16%, transparent)"
          : "color-mix(in oklab, var(--brand-violet, var(--primary)) 16%, transparent)",
        color: smash ? "var(--smash)" : "var(--primary)",
      }}
    >
      <span aria-hidden>{smash ? "🟢" : "🔴"}</span>
      {smash ? "SMASH" : "PASS"}
    </span>
  );
}
