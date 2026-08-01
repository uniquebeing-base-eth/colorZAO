import art1 from "@/assets/art-1.jpg";
import art2 from "@/assets/art-2.jpg";
import art3 from "@/assets/art-3.jpg";
import art4 from "@/assets/art-4.jpg";
import art5 from "@/assets/art-5.jpg";
import art6 from "@/assets/art-6.jpg";
import art7 from "@/assets/art-7.jpg";
import art8 from "@/assets/art-8.jpg";
import art9 from "@/assets/art-9.jpg";
import art10 from "@/assets/art-10.jpg";
import art11 from "@/assets/art-11.jpg";
import art12 from "@/assets/art-12.jpg";
import art13 from "@/assets/art-13.jpg";
import art14 from "@/assets/art-14.jpg";
import art15 from "@/assets/art-15.jpg";
import art16 from "@/assets/art-16.jpg";
import art17 from "@/assets/art-17.jpg";
import art18 from "@/assets/art-18.jpg";
import art19 from "@/assets/art-19.jpg";
import art20 from "@/assets/art-20.jpg";
import art21 from "@/assets/art-21.jpg";
import art22 from "@/assets/art-22.jpg";

/** ColorZAO original artworks used for the painting canvas (never project branding). */
export const artworks = [
  art1,
  art2,
  art3,
  art4,
  art5,
  art6,
  art7,
  art8,
  art9,
  art10,
  art11,
  art12,
  art13,
  art14,
  art15,
  art16,
  art17,
  art18,
  art19,
  art20,
  art21,
  art22,
];


export type DiscoveryKind = "project" | "workshop" | "fact";

/** Filter buckets used by the Feedback screen. */
export type DiscoveryGroup = "Builders" | "Artists" | "Workshops" | "Facts";

export type Discovery = {
  id: string;
  kind: DiscoveryKind;
  group: DiscoveryGroup;
  emoji: string;
  /** Short label shown on the reveal sheet, e.g. "Project", "Workshop", "Fact". */
  kindLabel: string;
  title: string;
  creator: string;
  tags: string[];
  description: string;
  projectUrl?: string;
};

const project = (
  d: Omit<Discovery, "kind" | "emoji" | "kindLabel" | "group"> & { group?: DiscoveryGroup },
): Discovery => ({
  kind: "project",
  emoji: "🎨",
  kindLabel: "Project",
  group: d.group ?? "Builders",
  ...d,
});

const workshop = (d: Omit<Discovery, "kind" | "emoji" | "kindLabel" | "group">): Discovery => ({
  kind: "workshop",
  emoji: "🎤",
  kindLabel: "Workshop",
  group: "Workshops",
  ...d,
});

const fact = (d: Omit<Discovery, "kind" | "emoji" | "kindLabel" | "group">): Discovery => ({
  kind: "fact",
  emoji: "💡",
  kindLabel: "Fact",
  group: "Facts",
  ...d,
});

export const projects: Discovery[] = [
  project({
    id: "zao-artist-value-ledger",
    title: "ZAO Artist Value Ledger",
    creator: "Pascaline",
    tags: ["Data", "Reputation", "Onchain"],
    description:
      "A dashboard that combines Respect, Empire Builder rankings, and WaveWarZ records into one verifiable artist profile across the ZAO ecosystem.",
    projectUrl: "https://zao-artist-ledger.vercel.app",
  }),
  project({
    id: "surfboard",
    title: "SURFBOARD",
    creator: "LadyrynNemesis",
    tags: ["Music", "Education", "Onchain"],
    description:
      "A Web3 onboarding platform helping musicians discover wallets, onchain identity, and creator opportunities.",
    projectUrl: "https://surfboard.diyama.online",
  }),
  project({
    id: "stacks",
    title: "Stacks",
    creator: "Bread Coop",
    tags: ["Finance", "Community", "Onchain"],
    description:
      "Community-powered blockchain savings circles that provide interest-free loans among trusted members.",
    projectUrl: "https://bread.coop",
  }),
  project({
    id: "el-charro",
    title: "El Charro",
    creator: "mettodo",
    tags: ["Fundraising", "Community"],
    description:
      "A fundraising platform helping communities raise capital without debt while preserving community ownership.",
    projectUrl: "https://txirrin.lovable.app",
  }),
  project({
    id: "neontetris",
    title: "NeonTetris",
    creator: "kayonfire",
    tags: ["Games", "Farcaster"],
    description:
      "A Farcaster Mini App where players compete in neon-themed Tetris matches with leaderboards and unlockable content.",
    projectUrl: "https://farcaster.xyz",
  }),
  project({
    id: "n3m3sis-call-out",
    title: "N3M3SIS — The Call Out",
    creator: "LadyrynNemesis",
    group: "Artists",
    tags: ["Music", "AI", "Production"],
    description:
      "An original hybrid music production combining Suno, Ableton, AI tools, and live vocals.",
    projectUrl: "https://songchainn.xyz",
  }),
  project({
    id: "zabal-gamez-song-video",
    title: "ZABAL Gamez Song & Video",
    creator: "LadyrynNemesis",
    group: "Artists",
    tags: ["Video", "Music", "AI"],
    description:
      "A cinematic AI-assisted music video celebrating ZABAL Gamez through storytelling, music, and visuals.",
    projectUrl: "https://streamable.com",
  }),
  project({
    id: "taydex",
    title: "TayDex",
    creator: "Halit Tayyar",
    tags: ["Markets", "Base", "USDC"],
    description:
      "A creator-first prediction market built on Base using transparent rules and USDC.",
    projectUrl: "https://taydex.fun",
  }),
  project({
    id: "zabal-artwork",
    title: "ZABAL Artwork",
    creator: "IMan Afrikah",
    group: "Artists",
    tags: ["Illustration", "Community"],
    description:
      "An original artwork celebrating the ZABAL Gamez community through digital illustration.",
    projectUrl: "https://x.com",
  }),
  project({
    id: "gundarium",
    title: "GundariuM",
    creator: "Joshua Grubbs",
    tags: ["Games", "NFT", "AI"],
    description:
      "An AI-powered NFT trading card game with millions of unique mech combinations and future battle modes.",
    projectUrl: "https://gundarium.xyz",
  }),
  project({
    id: "zabal-recording-scout",
    title: "ZABAL Recording Scout",
    creator: "Brandon",
    tags: ["Archive", "Research"],
    description:
      "Browse archived ZABAL recordings, transcripts, and workshops to discover ideas for your next build.",
    projectUrl: "https://dreamnet-zabal-scout.pages.dev",
  }),
  project({
    id: "proof-drop",
    title: "Proof Drop",
    creator: "Brandon",
    tags: ["Tools", "Onchain"],
    description:
      "A simple tool that helps builders generate verifiable proof of what they've shipped.",
    projectUrl: "https://zabalgamez.com",
  }),
  project({
    id: "wavewarz-gravity-board",
    title: "WaveWarZ Gravity Board",
    creator: "Brandon",
    tags: ["Analytics", "Dashboard"],
    description:
      "A redesigned analytics dashboard providing deeper insights into WaveWarZ activity.",
    projectUrl: "https://wavewarz-gravity-board.pages.dev",
  }),
  project({
    id: "founder-nexus",
    title: "Founder Nexus",
    creator: "Brandon",
    tags: ["Discovery", "Community"],
    description:
      "A discovery hub connecting founders, builders, and projects across the ZAO ecosystem.",
    projectUrl: "https://founder-nexus.pages.dev",
  }),
  project({
    id: "dreamnet-publishing",
    title: "DreamNet Publishing",
    creator: "Brandon",
    group: "Artists",
    tags: ["Publishing", "Farcaster"],
    description:
      "A Farcaster publishing platform helping creators launch and distribute onchain content.",
    projectUrl: "https://farcaster.xyz",
  }),
  project({
    id: "zao-music",
    title: "ZAO Music",
    creator: "Brandon",
    group: "Artists",
    tags: ["Music", "Culture"],
    description:
      "Original music created to celebrate the ZAO ecosystem, including the Droid With A Wallet anthem.",
    projectUrl: "https://suno.com",
  }),
  project({
    id: "wavewarz-bridge-portal",
    title: "WaveWarZ Bridge Portal",
    creator: "Branth",
    tags: ["Bridge", "Base", "Solana"],
    description:
      "A Base-to-Solana bridge allowing users to participate in WaveWarZ with a smooth onboarding experience.",
    projectUrl: "https://wavewarz-bridge-portal.vercel.app",
  }),
  project({
    id: "chroma-poker",
    title: "Chroma Poker",
    creator: "JohnDaWalka",
    tags: ["Games", "Farcaster", "Stats"],
    description:
      "A Farcaster poker companion with live tracking, hand history parsing, and player statistics.",
    projectUrl: "https://github.com/PyroFire-Labs/GundariuM",
  }),
];

export const workshops: Discovery[] = [
  workshop({
    id: "magnetiq-workshop",
    title: "Magnetiq Workshop",
    creator: "ZAO Workshops",
    tags: ["Growth", "Audience"],
    description:
      "A live session on building magnetic creator brands that attract collectors, collaborators, and long-term fans.",
    projectUrl: "https://zabalgamez.com",
  }),
  workshop({
    id: "ai-music-workshop",
    title: "AI Music Workshop",
    creator: "ZAO Workshops",
    tags: ["Music", "AI", "Production"],
    description:
      "A hands-on walkthrough of AI-assisted songwriting, stem production, and finishing tracks with real vocals.",
    projectUrl: "https://zabalgamez.com",
  }),
  workshop({
    id: "base-builder-session",
    title: "Base Builder Session",
    creator: "ZAO Workshops",
    tags: ["Base", "Onchain", "Dev"],
    description:
      "A builder session covering shipping onchain apps on Base, from first contract to a live Mini App.",
    projectUrl: "https://zabalgamez.com",
  }),
  workshop({
    id: "creator-economy-workshop",
    title: "Creator Economy Workshop",
    creator: "ZAO Workshops",
    tags: ["Economy", "Ownership"],
    description:
      "How independent creators build durable income through memberships, collectibles, and direct audience ownership.",
    projectUrl: "https://zabalgamez.com",
  }),
];

export const facts: Discovery[] = [
  fact({
    id: "fact-music-skip",
    title: "Music",
    creator: "ColorZAO Facts",
    tags: ["Music"],
    description:
      "The average listener decides whether to skip a song within the first 10–15 seconds.",
  }),
  fact({
    id: "fact-art-emotion",
    title: "Art",
    creator: "ColorZAO Facts",
    tags: ["Art"],
    description:
      "Color can influence emotion before a viewer consciously understands an artwork.",
  }),
  fact({
    id: "fact-artists-revenue",
    title: "Artists",
    creator: "ColorZAO Facts",
    tags: ["Artists"],
    description:
      "Independent artists now earn revenue from collectibles, memberships and onchain royalties — not only streaming.",
  }),
  fact({
    id: "fact-creativity-limits",
    title: "Creativity",
    creator: "ColorZAO Facts",
    tags: ["Creativity"],
    description:
      "Limiting available colors often increases creativity because the brain focuses more on composition.",
  }),
  fact({
    id: "fact-zao-respect",
    title: "ZAO",
    creator: "ColorZAO Facts",
    tags: ["ZAO"],
    description: "Respect is the reputation system used inside the ZAO community.",
  }),
  fact({
    id: "fact-base-fees",
    title: "Base",
    creator: "ColorZAO Facts",
    tags: ["Base"],
    description:
      "Base allows creators to publish and monetize onchain with very low transaction fees.",
  }),
  fact({
    id: "fact-farcaster-wallets",
    title: "Farcaster",
    creator: "ColorZAO Facts",
    tags: ["Farcaster"],
    description:
      "Your Farcaster account can verify multiple wallet addresses across different chains.",
  }),
  fact({
    id: "fact-digital-art-grayscale",
    title: "Digital Art",
    creator: "ColorZAO Facts",
    tags: ["Digital Art"],
    description:
      "Many digital artists begin with grayscale composition before adding color — just like ColorZAO's reveal mechanic.",
  }),
  fact({
    id: "fact-painting-blocking",
    title: "Painting",
    creator: "ColorZAO Facts",
    tags: ["Painting"],
    description:
      "Traditional painters block in large color areas before adding details. ColorZAO reverses this by revealing the finished work through painting.",
  }),
  fact({
    id: "fact-visual-memory",
    title: "Creative Fact",
    creator: "ColorZAO Facts",
    tags: ["Creativity"],
    description:
      "People remember visual experiences better than plain text, which is why interactive discovery leads to higher engagement.",
  }),
  fact({
    id: "fact-ownership-direct",
    title: "Ownership",
    creator: "ColorZAO Facts",
    tags: ["Artists"],
    description:
      "Independent artists keep more ownership when they build direct relationships with their audience.",
  }),
];

export const discoveries: Discovery[] = [...projects, ...workshops, ...facts];

export function getDiscovery(id: string | undefined) {
  return discoveries.find((d) => d.id === id);
}

/** Stable artwork thumbnail for a discovery, used on feedback cards. */
export function thumbFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return artworks[hash % artworks.length]!;
}

export const discoveryGroups: DiscoveryGroup[] = ["Builders", "Artists", "Workshops", "Facts"];

export const smashReasons = [
  { emoji: "❤️", label: "Love the idea", hint: "The concept is amazing" },
  { emoji: "🚀", label: "I'd use it", hint: "I can see myself using this" },
  { emoji: "🎨", label: "Beautiful presentation", hint: "The visuals are stunning" },
  { emoji: "💡", label: "Innovative", hint: "Unique and creative approach" },
  { emoji: "✍️", label: "Other", hint: "Something else" },
];

export const passReasons = [
  { emoji: "🗒️", label: "Needs better explanation", hint: "I wanted more context" },
  { emoji: "🤔", label: "Didn't understand", hint: "The idea wasn't clear" },
  { emoji: "🙅", label: "Not for me", hint: "Just not my thing" },
  { emoji: "🪄", label: "Needs polish", hint: "Close, but not finished" },
  { emoji: "✍️", label: "Other", hint: "Something else" },
];

export const palette = [
  "#e0413a",
  "#ef8b26",
  "#e8c33f",
  "#3ea35a",
  "#3b82e0",
  "#8b3ce0",
  "#1a1a1f",
];

/** Fisher-Yates shuffle producing a fresh discovery order for each session. */
export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
