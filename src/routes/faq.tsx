import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ & Docs — ColorZAO" },
      {
        name: "description",
        content:
          "How ColorZAO works: paint grayscale canvases, reveal ZAO projects, workshops and facts, and leave critique.",
      },
      { property: "og:title", content: "FAQ & Docs — ColorZAO" },
      {
        property: "og:description",
        content: "Everything about painting canvases, Smash or Pass, and critique in ColorZAO.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Faq,
});

const items = [
  {
    q: "What is ColorZAO?",
    a: "A painting game for discovery. Every canvas hides a ZAO project, a workshop or a creative fact. Paint the grayscale artwork to reveal it.",
  },
  {
    q: "How do I reveal a canvas?",
    a: "Pick a brush color and drag across the artwork. The grayscale layer wears away and the real colors appear. At 100% the exhibit slides up.",
  },
  {
    q: "What are Smash and Pass?",
    a: "Smash means you would use or support it. Pass means it is not for you yet. Both send a reason to the creator.",
  },
  {
    q: "Is my critique anonymous?",
    a: "Yes by default. You can choose to attach your Farcaster handle instead. Anonymous critique never reveals who you are.",
  },
  {
    q: "Why sign a message when I start?",
    a: "It confirms you accept the ColorZAO terms. It is a free signature — no transaction, no fees and no funds ever leave your wallet.",
  },
  {
    q: "What are Facts?",
    a: "Short, real notes about art, music, creativity, Base and the ZAO ecosystem. You can Smash or Pass those too.",
  },
];

function Faq() {
  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 px-4 pb-2 pt-4">
        <Link
          to="/"
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card shadow-soft"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-foreground">FAQ &amp; Docs</h1>
          <p className="text-[11px] text-muted-foreground">How ColorZAO works</p>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-6">
        {items.map((item) => (
          <section key={item.q} className="rounded-2xl bg-card p-3.5 shadow-soft">
            <h2 className="text-[13px] font-bold text-foreground">{item.q}</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{item.a}</p>
          </section>
        ))}
        <a
          href="https://miniapps.farcaster.xyz/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border border-border p-3.5 text-center text-[12px] font-semibold text-foreground"
        >
          Farcaster Mini App docs
        </a>
      </div>
    </main>
  );
}
