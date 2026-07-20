import Link from "next/link";

export function SignalMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="signal-mark" href="/" aria-label="Cybrik EduGraph home">
      <span className="signal-mark-orbit" aria-hidden="true">
        <span />
      </span>
      <span className="signal-mark-copy">
        <strong>CYBRIK</strong>
        {!compact ? <small>EDUGRAPH</small> : null}
      </span>
    </Link>
  );
}
