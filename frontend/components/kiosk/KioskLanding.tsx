"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Search } from "@/components/edu/Icons";

const HERO_DESTINATIONS = [
  { country: "Canada", university: "Georgian College", image: "/georgian-college-canada.jpg", position: "right center" },
  { country: "Germany", university: "Humboldt University of Berlin", image: "/humboldt-university-berlin.jpg", position: "center center" },
  { country: "United Kingdom", university: "Birmingham City University", image: "/birmingham-city-university.webp", position: "center center" },
  { country: "Germany", university: "GISMA University of Applied Sciences", image: "/gisma-university.webp", position: "center center" },
  { country: "Canada", university: "University of Manitoba", image: "/university-of-manitoba.jpg", position: "center center" },
] as const;

const DESTINATIONS = [
  { name: "Canada", code: "CA", universities: "125+ universities", accent: "red", image: "/student-campus-1.webp" },
  { name: "United Kingdom", code: "UK", universities: "160+ universities", accent: "blue", image: "/student-campus-2.webp" },
  { name: "Australia", code: "AU", universities: "43 universities", accent: "gold", image: "/student-campus-1.webp" },
  { name: "United States", code: "US", universities: "4,000+ institutions", accent: "navy", image: "/student-campus-2.webp" },
  { name: "New Zealand", code: "NZ", universities: "8 universities", accent: "aqua", image: "/student-campus-1.webp" },
  { name: "Germany", code: "DE", universities: "400+ institutions", accent: "amber", image: "/student-campus-2.webp" },
  { name: "Ireland", code: "IE", universities: "28 institutions", accent: "green", image: "/student-campus-1.webp" },
  { name: "France", code: "FR", universities: "250+ institutions", accent: "indigo", image: "/student-campus-2.webp" },
  { name: "United Arab Emirates", code: "AE", universities: "70+ institutions", accent: "emerald", image: "/student-campus-1.webp" },
] as const;

const FOOTER_MESSAGES = [
  "EDUGRAPH",
  "Powered by Cybrik Solutions",
  "493-A, Model Town Extension, Ludhiana, Punjab – 141010",
  "Discover your study-abroad options in 30 seconds",
] as const;

const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] as const;

export function KioskLanding() {
  const [footerIndex, setFooterIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<(typeof DESTINATIONS)[number] | null>(null);
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    const messageTimer = window.setInterval(() => setFooterIndex((value) => (value + 1) % FOOTER_MESSAGES.length), 4500);
    return () => window.clearInterval(messageTimer);
  }, []);

  useEffect(() => {
    if (searchOpen || selected || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const slideTimer = window.setInterval(() => setHeroIndex((value) => (value + 1) % HERO_DESTINATIONS.length), 5500);
    return () => window.clearInterval(slideTimer);
  }, [searchOpen, selected]);

  useEffect(() => {
    const resetHome = () => {
      setSearchOpen(false);
      setSelected(null);
      setQuery("");
      setDark(false);
    };
    const restartIdleTimer = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(resetHome, 75_000);
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, restartIdleTimer, { passive: true }));
    restartIdleTimer();
    return () => {
      events.forEach((event) => window.removeEventListener(event, restartIdleTimer));
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen && !selected) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [searchOpen, selected]);

  const filteredDestinations = useMemo(
    () => DESTINATIONS.filter((destination) => destination.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  return (
    <main className={`edu-kiosk-home${dark ? " is-dark" : ""}`}>
      <header className="edu-kiosk-header">
        <Link className="edu-kiosk-brand" href="/kiosk" aria-label="Cybrik Solutions kiosk home">
          <Image className="edu-kiosk-cybrik-logo" src="/cybrik-logo-hero.png" alt="Cybrik Solutions" width={621} height={174} priority />
        </Link>
      </header>

      <section className="edu-kiosk-hero" aria-label="Featured international university campuses">
        {HERO_DESTINATIONS.map((destination, index) => (
          <div className={`edu-kiosk-hero-slide${index === heroIndex ? " is-active" : ""}`} aria-hidden={index !== heroIndex} key={destination.university}>
            <Image src={destination.image} alt={`${destination.university} campus in ${destination.country}`} fill priority={index === 0} sizes="100vw" style={{ objectPosition: destination.position }} />
          </div>
        ))}
        <div className="edu-kiosk-hero-scrim" />
        <div className="edu-kiosk-hero-copy">
          <h1>Explore ! <br />Study Abroad in<br /><em> 30 seconds</em></h1>
          <Link className="edu-kiosk-start" href="/portal">Start now <ArrowRight size={34} /></Link>
        </div>
        <div className="edu-kiosk-slide-copy-stack">
          {HERO_DESTINATIONS.map((destination, index) => (
            <div className={`edu-kiosk-slide-copy${index === heroIndex ? " is-active" : ""}`} aria-hidden={index !== heroIndex} key={destination.university}>
              <strong>{destination.university}</strong>
              <p>{destination.country}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="edu-kiosk-destinations" aria-labelledby="destination-heading">
        <div className="edu-kiosk-section-heading">
          <div><span>Choose your next chapter</span><h2 id="destination-heading">Explore Top Study Destinations</h2></div>
          <p>Select a country to explore universities, courses and opportunities.</p>
        </div>
        <div className="edu-kiosk-country-grid">
          {DESTINATIONS.map((destination) => (
            <button className={`edu-kiosk-country-card accent-${destination.accent}`} type="button" onClick={() => setSelected(destination)} key={destination.name}>
              <span className="edu-kiosk-country-head"><span className="edu-kiosk-flag" aria-label={`${destination.name} flag`}>{destination.code}</span><strong>{destination.name}</strong><ArrowRight size={24} /></span>
              <span className="edu-kiosk-country-image"><Image src={destination.image} alt={`Students exploring study opportunities in ${destination.name}`} fill sizes="30vw" /></span>
              <span className="edu-kiosk-country-foot"><span>{destination.universities}</span><b>Explore programs <ArrowRight size={18} /></b></span>
            </button>
          ))}
        </div>
      </section>

      <footer className="edu-kiosk-footer">
        <span className="edu-kiosk-footer-label">EDUGRAPH</span>
        <p key={footerIndex}>{FOOTER_MESSAGES[footerIndex]}</p>
        <div className="edu-kiosk-footer-progress" aria-hidden="true">{FOOTER_MESSAGES.map((message, index) => <i className={index === footerIndex ? "is-active" : ""} key={message} />)}</div>
      </footer>

      {searchOpen && (
        <div className="edu-kiosk-overlay" role="dialog" aria-modal="true" aria-labelledby="kiosk-search-title">
          <div className="edu-kiosk-overlay-bar"><button type="button" onClick={() => setSearchOpen(false)}><ArrowLeft size={30} /> Back</button><button type="button" onClick={() => { setSearchOpen(false); setQuery(""); }}><HomeIcon /> Home</button></div>
          <div className="edu-kiosk-search-panel">
            <span className="edu-kiosk-eyebrow"><Search size={22} /> Search EDUGRAPH</span>
            <h2 id="kiosk-search-title">What would you like to explore?</h2>
            <label className="edu-kiosk-search-field"><Search size={30} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Country, university, course or study level" /><button type="button" onClick={() => setQuery("")} aria-label="Clear search"><CloseIcon /></button></label>
            <div className="edu-kiosk-search-results">{filteredDestinations.slice(0, 5).map((destination) => <button type="button" onClick={() => { setSelected(destination); setSearchOpen(false); }} key={destination.name}><span className="edu-kiosk-flag">{destination.code}</span><span><strong>{destination.name}</strong><small>{destination.universities}</small></span><ArrowRight /></button>)}</div>
            <div className="edu-kiosk-keyboard" aria-label="On-screen keyboard">{KEYBOARD_ROWS.map((row) => <div key={row}>{[...row].map((key) => <button type="button" onClick={() => setQuery((value) => value + key.toLowerCase())} key={key}>{key}</button>)}</div>)}<div><button className="is-wide" type="button" onClick={() => setQuery((value) => value.slice(0, -1))}>Delete</button><button className="is-space" type="button" onClick={() => setQuery((value) => `${value} `)}>Space</button><button className="is-wide is-done" type="button" onClick={() => setSearchOpen(false)}>Done</button></div></div>
          </div>
        </div>
      )}

      {selected && (
        <div className="edu-kiosk-overlay" role="dialog" aria-modal="true" aria-labelledby="country-detail-title">
          <div className="edu-kiosk-overlay-bar"><button type="button" onClick={() => setSelected(null)}><ArrowLeft size={30} /> Back</button><button type="button" onClick={() => { setSelected(null); setQuery(""); }}><HomeIcon /> Home</button></div>
          <article className="edu-kiosk-country-detail">
            <div className="edu-kiosk-detail-image"><Image src={selected.image} alt={`University campus in ${selected.name}`} fill sizes="100vw" /></div>
            <div className="edu-kiosk-detail-content"><span className="edu-kiosk-flag">{selected.code}</span><span className="edu-kiosk-eyebrow">Study destination</span><h2 id="country-detail-title">Explore {selected.name}</h2><p>Discover globally recognised universities, career-focused courses, scholarships and upcoming intakes matched to your goals.</p><div><span><strong>{selected.universities}</strong><small>to explore</small></span><span><strong>Multiple intakes</strong><small>throughout the year</small></span></div><Link className="edu-kiosk-start" href="/portal">Find my matches <ArrowRight size={32} /></Link></div>
          </article>
        </div>
      )}
    </main>
  );
}

function HomeIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 11 9-8 9 8v10h-6v-6H9v6H3Z"/></svg>; }
function CloseIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18"/></svg>; }
