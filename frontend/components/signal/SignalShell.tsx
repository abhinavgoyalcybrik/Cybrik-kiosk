import type { ReactNode } from "react";
import Link from "next/link";
import { SignalMark } from "./SignalMark";

export function SignalShell({
  children,
  active,
}: {
  children: ReactNode;
  active: "launch" | "portal";
}) {
  return (
    <main className="signal-page">
      <div className="signal-grid" aria-hidden="true" />
      <header className="signal-topbar">
        <SignalMark />
        <nav aria-label="Primary navigation" className="signal-topnav">
          <Link className={active === "launch" ? "is-active" : ""} href="/">
            Discover
          </Link>
          <Link className={active === "portal" ? "is-active" : ""} href="/portal">
            Student portal
          </Link>
          <Link href="/kiosk">Kiosk</Link>
        </nav>
        <Link className="signal-topbar-action" href="/portal">
          Open my path <span aria-hidden="true">↗</span>
        </Link>
      </header>
      {children}
    </main>
  );
}
