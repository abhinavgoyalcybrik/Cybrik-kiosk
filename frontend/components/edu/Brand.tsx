import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Cybrik Solutions home">
      <Image src="/cybrik-logo.png" width={620} height={180} priority alt="Cybrik Solutions" className={compact ? "brand-logo compact" : "brand-logo"} />
    </Link>
  );
}
