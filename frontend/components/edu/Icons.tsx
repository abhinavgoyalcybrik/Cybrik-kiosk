import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 20, children, ...props }: IconProps) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>;
}

export const ArrowRight = (p: IconProps) => <IconBase {...p}><path d="M5 12h14M13 6l6 6-6 6" /></IconBase>;
export const ArrowLeft = (p: IconProps) => <IconBase {...p}><path d="M19 12H5m6 6-6-6 6-6" /></IconBase>;
export const Check = (p: IconProps) => <IconBase {...p}><path d="m5 12 4 4L19 6" /></IconBase>;
export const ChevronDown = (p: IconProps) => <IconBase {...p}><path d="m6 9 6 6 6-6" /></IconBase>;
export const Compass = (p: IconProps) => <IconBase {...p}><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></IconBase>;
export const FileText = (p: IconProps) => <IconBase {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6" /></IconBase>;
export const Globe = (p: IconProps) => <IconBase {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></IconBase>;
export const Graduation = (p: IconProps) => <IconBase {...p}><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.5V16c3 2.4 9 2.4 12 0v-4.5M22 9v6" /></IconBase>;
export const Heart = (p: IconProps) => <IconBase {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5a5.5 5.5 0 0 0 1.1-8.9Z" /></IconBase>;
export const MapPin = (p: IconProps) => <IconBase {...p}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5" /></IconBase>;
export const Menu = (p: IconProps) => <IconBase {...p}><path d="M4 7h16M4 12h16M4 17h16" /></IconBase>;
export const Search = (p: IconProps) => <IconBase {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4" /></IconBase>;
export const Shield = (p: IconProps) => <IconBase {...p}><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-4" /></IconBase>;
export const Spark = (p: IconProps) => <IconBase {...p}><path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8L12 3ZM19 16l.7 2.1L22 19l-2.3.9L19 22l-.7-2.1L16 19l2.3-.9L19 16Z" /></IconBase>;
export const User = (p: IconProps) => <IconBase {...p}><circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0" /></IconBase>;
export const Wallet = (p: IconProps) => <IconBase {...p}><path d="M3 6a2 2 0 0 1 2-2h14v16H5a2 2 0 0 1-2-2V6Z"/><path d="M15 10h6v5h-6a2.5 2.5 0 0 1 0-5Z" /></IconBase>;
