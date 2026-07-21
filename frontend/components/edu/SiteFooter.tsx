import Link from "next/link";
import { ArrowRight, Globe } from "./Icons";
import { Brand } from "./Brand";

type SocialName = "instagram" | "facebook" | "twitter" | "linkedin";

function SocialIcon({ name }: { name: SocialName }) {
  if (name === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.7" r="1" className="social-fill"/></svg>;
  if (name === "facebook") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.8-.1-1.6-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.2V10H8.3v3H11v8h3.2Z" className="social-fill"/></svg>;
  if (name === "twitter") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 4 11.2 16M19 4 7.8 20M8.5 4H5l10.5 16H19L8.5 4Z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="3.5" height="11" className="social-fill"/><circle cx="5.75" cy="5.6" r="1.9" className="social-fill"/><path d="M11 20V9h3.3v1.5c.8-1.2 2-1.9 3.8-1.9 3.1 0 4.2 2 4.2 5.3V20h-3.5v-5.5c0-1.6-.4-2.8-2-2.8-2.2 0-2.3 1.8-2.3 3.7V20H11Z" className="social-fill"/></svg>;
}

const socials: { name: SocialName; label: string; href: string }[] = [
  { name: "instagram", label: "Instagram", href: "https://www.instagram.com/" },
  { name: "facebook", label: "Facebook", href: "https://www.facebook.com/" },
  { name: "twitter", label: "X / Twitter", href: "https://x.com/" },
  { name: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/" },
];

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-orbit" aria-hidden="true"><Globe size={260} /></div>
    <div className="footer-main">
      <div className="footer-brand"><div className="footer-logo"><Brand compact /></div><p>Making global education clearer, one student at a time.</p><Link href="/portal" className="footer-cta">Find my university <ArrowRight size={17} /></Link></div>
      <nav className="footer-column" aria-label="Platform links"><strong>Platform</strong><a href="#how">How it works</a><a href="#features">Why Cybrik</a><a href="#stories">Success stories</a><Link href="/portal">Student portal</Link></nav>
      <nav className="footer-column" aria-label="Support links"><strong>Support</strong><a href="#faq">FAQs</a><a href="mailto:hello@cybrik.com">Contact an advisor</a><a href="mailto:hello@cybrik.com">hello@cybrik.com</a></nav>
      <div className="footer-social"><strong>Stay connected</strong><p>Ideas, guidance, and global study opportunities.</p><div>{socials.map((social) => <a key={social.name} href={social.href} target="_blank" rel="noreferrer" aria-label={`Cybrik Solutions on ${social.label}`} title={social.label}><SocialIcon name={social.name} /></a>)}</div></div>
    </div>
    <div className="footer-bottom"><span>© 2026 Cybrik Solutions. All rights reserved.</span><div><a href="#">Privacy</a><a href="#">Terms</a><span>Built for ambitious students worldwide</span></div></div>
  </footer>;
}
