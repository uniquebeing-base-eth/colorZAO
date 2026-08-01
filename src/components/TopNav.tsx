import { Link } from "@tanstack/react-router";
import { Trophy, MessageSquare, User, HelpCircle } from "lucide-react";
import type { ReactNode } from "react";

function NavIcon({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="flex flex-col items-center gap-0.5 text-[9px] font-medium tracking-wide text-muted-foreground"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card shadow-soft transition-transform active:scale-95">
        {children}
      </span>
      {label}
    </Link>
  );
}

export function TopNav({ center }: { center?: ReactNode }) {
  return (
    <header className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 px-4 pt-3">
      <div className="flex gap-1.5">
        <NavIcon to="/hall-of-fame" label="Ranks">
          <Trophy className="h-4 w-4 text-foreground" strokeWidth={1.8} />
        </NavIcon>
        <NavIcon to="/faq" label="Help">
          <HelpCircle className="h-4 w-4 text-foreground" strokeWidth={1.8} />
        </NavIcon>
      </div>
      <div className="flex min-w-0 flex-col items-center pt-1.5 text-center">{center}</div>
      <div className="flex gap-1.5">
        <NavIcon to="/feedback" label="Critique">
          <MessageSquare className="h-4 w-4 text-foreground" strokeWidth={1.8} />
        </NavIcon>
        <NavIcon to="/profile" label="You">
          <User className="h-4 w-4 text-foreground" strokeWidth={1.8} />
        </NavIcon>
      </div>
    </header>
  );
}
