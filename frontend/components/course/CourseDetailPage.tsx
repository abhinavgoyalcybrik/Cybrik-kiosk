"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Accessibility, ArrowLeft, ArrowRight, BookOpen, Building2, CalendarDays,
  Check, CheckCircle2, ChevronDown, Clock3, Compass, Download, ExternalLink,
  GraduationCap, Heart, Languages, MapPin, Menu, RotateCcw, Search, Send,
  Share2, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCourseDetail } from "@/lib/api";
import type { DetailedCourse } from "@/lib/types";
import "./course-detail.css";

const countryImages: Record<string, string> = {
  "New Zealand": "/country-images/new-zealand.png",
  Australia: "/country-images/australia.avif",
  Canada: "/country-images/canada-attached.jpeg",
  Germany: "/country-images/germany.png",
  Ireland: "/country-images/ireland.png",
  "United Kingdom": "/country-images/united-kingdom-attached.jpeg",
  "United States": "/country-images/usa.jpg",
};

const sections = [
  ["overview", "Overview"], ["fees", "Fees & intakes"], ["requirements", "Requirements"],
  ["plan", "Course plan"], ["scholarships", "Scholarships"], ["location", "Location"],
  ["living", "Living costs"], ["apply", "How to apply"],
] as const;

const money = (value: number | null | undefined, currency = "AUD") =>
  value == null ? "Contact university" : new Intl.NumberFormat("en-AU", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

export default function CourseDetailPage({ courseId }: { courseId: number }) {
  const [course, setCourse] = useState<DetailedCourse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [active, setActive] = useState("overview");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [expandedOverview, setExpandedOverview] = useState(false);
  const [openRequirement, setOpenRequirement] = useState("Published requirements");
  const [selectedIntake, setSelectedIntake] = useState(0);
  const [livingPeriod, setLivingPeriod] = useState<"Weekly" | "Monthly" | "Annual">("Monthly");
  const [contrast, setContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuAreaRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let activeRequest = true;
    fetchCourseDetail(courseId)
      .then((result) => { if (activeRequest) setCourse(result); })
      .catch((error) => {
        if (activeRequest) setLoadError(error instanceof Error ? error.message : "Unable to load this course.");
      });
    return () => { activeRequest = false; };
  }, [courseId]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActive(visible.target.id);
    }, { rootMargin: "-25% 0px -60%", threshold: [0.05, 0.3] });
    sections.forEach(([id]) => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [course]);

  useEffect(() => {
    if (!navOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuAreaRef.current?.contains(event.target as Node)) setNavOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    window.requestAnimationFrame(() => menuPanelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus());
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [navOpen]);

  const images = useMemo(() => course?.gallery_images?.filter(Boolean).length
    ? course.gallery_images
    : [countryImages[course?.university.country || ""] || "/cybrik-logo-hero.png"], [course]);
  useEffect(() => {
    if (galleryOpen || images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setHeroImageIndex((value) => (value + 1) % images.length), 5500);
    return () => window.clearInterval(timer);
  }, [galleryOpen, images.length]);
  if (loadError) {
    return <main className="course-load-state"><h1>Course details unavailable</h1><p>{loadError}</p><Link href="/portal">Return to shortlist</Link></main>;
  }
  if (!course) {
    return <main className="course-load-state" aria-live="polite"><h1>Loading course details…</h1></main>;
  }
  const intakes = course.intake_labels.length ? course.intake_labels : ["Intake to be confirmed"];
  const tuition = money(course?.tuition_fee, course?.tuition_currency || "AUD");
  const location = [course?.university.city, course?.university.country].filter(Boolean).join(", ");
  const duration = course?.duration_months ? `${Math.round(course.duration_months / 12 * 10) / 10} years` : "Duration on request";

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setNavOpen(false);
  };

  const structuredData = {
    "@context": "https://schema.org", "@type": "Course", name: course.title,
    description: course.course_summary, provider: { "@type": "Organization", name: course.university.name },
  };

  return (
    <div className={`course-page ${contrast ? "course-high-contrast" : ""} ${largeText ? "course-large-text" : ""}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <a className="course-skip" href="#course-main">Skip to course details</a>
      <header className="course-header">
        <Link href="/" className="course-brand" aria-label="Cybrik Solutions home"><Image src="/cybrik-logo.png" alt="Cybrik Solutions" width={164} height={48} priority /></Link>
        <nav className="course-global-nav" aria-label="Primary navigation">
          <Link href="/portal">Explore Courses</Link><Link href="/portal">Universities</Link><Link href="/portal">Shortlisted</Link>
        </nav>
        <div className="course-header-actions" ref={menuAreaRef}>
          <button className="course-icon-button" aria-label="Search courses"><Search /></button>
          <button className="course-access-button" onClick={() => setLargeText((v) => !v)} aria-pressed={largeText}><Accessibility /> Text size</button>
          <button ref={menuButtonRef} className="course-icon-button course-nav-menu" onClick={() => setNavOpen((v) => !v)} aria-label="Toggle navigation" aria-controls="course-popup-menu" aria-expanded={navOpen}><Menu /></button>
          <button className="course-primary small" onClick={() => scrollTo("apply")}>Talk to an Expert</button>
          {navOpen && <nav id="course-popup-menu" ref={menuPanelRef} className="course-mobile-menu" aria-label="Course navigation"><Link href="/portal" onClick={() => setNavOpen(false)}>Explore Courses</Link><Link href="/portal" onClick={() => setNavOpen(false)}>Universities</Link><Link href="/portal" onClick={() => setNavOpen(false)}>Shortlisted</Link></nav>}
        </div>
      </header>

      <main id="course-main">
        <div className="course-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/portal">{course.university.country}</Link><span>/</span><span>{course.university.name}</span><span>/</span><strong>{course.title}</strong></div>

        <section className="course-hero" aria-labelledby="course-title">
          <div className="course-campus-showcase" aria-label={`${course.university.name} campus image gallery`}>
            {images.map((src, index) => (
              <button
                key={`${src}-${index}`}
                className={`course-campus-slide${index === heroImageIndex ? " is-active" : ""}`}
                onClick={() => { setGalleryIndex(index); setGalleryOpen(true); }}
                aria-label={`Open ${course.university.name} campus photo ${index + 1}`}
                aria-hidden={index !== heroImageIndex}
                tabIndex={index === heroImageIndex ? 0 : -1}
              >
                <Image src={src} alt={`${course.university.name} campus in ${course.university.country}`} fill sizes="(max-width: 1050px) 100vw, 58vw" priority={index === 0} unoptimized={src.startsWith("http")} />
              </button>
            ))}
            <div className="course-campus-scrim" aria-hidden="true" />
            <div className="course-campus-label" aria-live="polite">
              <strong>{course.university.name}</strong>
              <span>{course.university.country}</span>
            </div>
            <div className="course-campus-dots" aria-label="Choose campus image">
              {images.map((_, index) => <button key={index} className={index === heroImageIndex ? "is-active" : ""} onClick={() => setHeroImageIndex(index)} aria-label={`Show campus image ${index + 1}`} aria-pressed={index === heroImageIndex} />)}
            </div>
            <button className="gallery-count" onClick={() => { setGalleryIndex(heroImageIndex); setGalleryOpen(true); }}>View all {images.length} photos</button>
          </div>
          <div className="course-hero-copy">
            <span className="hero-eyebrow"><Building2 /> {course.university.name}</span>
            <h1 id="course-title">{course.title}</h1>
            <p className="hero-location"><MapPin /> {location || "Campus location available on request"} · {course.campus || "Main campus"}</p>
            <div className="hero-badges"><span><Sparkles /> Popular course</span>{course.university.scholarship_available && <span><GraduationCap /> Scholarship available</span>}<span><CalendarDays /> Upcoming intake</span></div>
          <div className="course-hero-actions"><button className="course-primary" onClick={() => scrollTo("apply")}>Check Eligibility <ArrowRight /></button><button className={`course-secondary ${saved ? "selected" : ""}`} onClick={() => setSaved((v) => !v)} aria-pressed={saved}><Heart fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save course"}</button><button className="course-icon-button course-bordered" aria-label="Share this course" onClick={() => navigator.share?.({ title: course.title, url: window.location.href }).catch(() => undefined)}><Share2 /></button></div>
          </div>
        </section>

        <section className="course-summary" aria-label="Course summary">
          <Fact icon={<BookOpen />} label="Study mode" value={course.mode || "On campus"} />
          <Fact icon={<Clock3 />} label="Duration" value={duration} />
          <Fact icon={<GraduationCap />} label="Annual tuition" value={tuition} />
          <Fact icon={<CalendarDays />} label="Next intake" value={intakes[0]} />
          <button className="course-primary summary-cta" onClick={() => scrollTo("apply")}>Apply Now</button>
        </section>

        <nav className="course-section-nav" aria-label="Course sections">{sections.map(([id, label]) => <button key={id} onClick={() => scrollTo(id)} className={active === id ? "active" : ""} aria-current={active === id ? "location" : undefined}>{label}</button>)}</nav>

        <div className="course-layout">
          <div className="course-content">
            <CourseSection id="overview" kicker="Course at a glance" title="About This Course">
              <p className={!expandedOverview ? "overview-clamped" : ""}>{course.course_summary || `${course.title} at ${course.university.name} combines practical learning with an internationally focused academic experience. Students develop specialist knowledge, applied skills and the confidence to work across global environments.`}</p>
              <button className="text-action" onClick={() => setExpandedOverview((v) => !v)} aria-expanded={expandedOverview}>{expandedOverview ? "Show concise overview" : "Read full overview"}<ChevronDown className={expandedOverview ? "rotated" : ""} /></button>
              <div className="fact-grid"><Info label="Qualification" value={course.degree_level} /><Info label="Field of study" value={course.field_of_study} /><Info label="Study load" value={course.mode || "Full-time"} /><Info label="Campus" value={course.campus || course.university.campus_locations || "Main campus"} /><Info label="Faculty" value={course.faculty || course.department || "Contact university"} /><Info label="Language" value="English" /></div>
            </CourseSection>

            <CourseSection id="fees" kicker="Plan your budget" title="Fees and Available Intakes">
              <div className="fee-rows"><Info label="Annual tuition fee" value={tuition} strong /><Info label="Estimated total tuition" value={course.tuition_fee && course.duration_months ? money(course.tuition_fee * course.duration_months / 12, course.tuition_currency) : "Confirm with institution"} /><Info label="Application fee" value={money(course.university.application_fee, course.university.application_fee_currency || course.tuition_currency)} /><Info label="Fee period" value={course.fee_period || "Per academic year"} /></div>
              <h3>Choose an intake</h3><div className="intake-grid">{intakes.map((intake, index) => <button key={intake} onClick={() => setSelectedIntake(index)} className={selectedIntake === index ? "selected" : ""} aria-pressed={selectedIntake === index}><span>{intake}</span><small>{index === 0 ? "Next available" : "Applications open"}</small>{selectedIntake === index && <Check />}</button>)}</div>
              <p className="course-notice">Fees and intake availability may change. Confirm final amounts and deadlines with the institution before applying.</p>
            </CourseSection>

            <CourseSection id="requirements" kicker="Know where you stand" title="Entry Requirements">
              <div className="requirement-result"><CheckCircle2 /><div><strong>Profile check available</strong><span>Add your academic and English results for a personalised indication.</span></div><button onClick={() => scrollTo("apply")}>Check Eligibility</button></div>
              <div className="accordion-list">{[
                ["Published requirements", course.admissions_notes || "Detailed academic requirements were not included in the imported source record."],
                ["Specialisation", course.specialization || "No specialisation requirement was specified in the imported source record."],
              ].map(([title, body]) => <Accordion key={title} title={title} open={openRequirement === title} onToggle={() => setOpenRequirement(openRequirement === title ? "" : title)}><p>{body}</p></Accordion>)}</div>
              <h3>English language requirements</h3><div className="english-list">{course.ielts_overall ? <EnglishTest name="IELTS Academic" overall={String(course.ielts_overall)} minimum="Band minimums not specified" /> : <p>No English-test requirement was included in the imported source record.</p>}</div>
            </CourseSection>

            <CourseSection id="plan" kicker="Build your expertise" title="What You Will Study">
              <p>{course.modules || "Module information was not included in the imported source record."}</p>
            </CourseSection>

            <CourseSection id="scholarships" kicker="Funding opportunities" title="Available Scholarships">
              <p>{course.university.scholarship_available ? "The imported university record indicates that scholarship opportunities are available. Contact the institution for current awards, values, deadlines, and eligibility." : "No scholarship availability was recorded in the imported source data."}</p>
            </CourseSection>

            <CourseSection id="location" kicker="See where you will study" title="Explore the Campus Location">
              <div className="location-address"><MapPin /><div><strong>{course.university.name} · {course.campus || "Main campus"}</strong><span>{course.university.campus_locations || location}</span></div></div>
              <div className="map-placeholder"><div className="map-art"><Compass /><span>Interactive campus map</span><small>Map content loads only when requested to keep the kiosk responsive.</small></div><div className="map-controls"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${course.university.name} ${location}`)}`} target="_blank" rel="noreferrer">Map <ExternalLink /></a><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${course.university.name} ${location}`)}`} target="_blank" rel="noreferrer">Satellite</a><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${course.university.name} ${location}`)}`} target="_blank" rel="noreferrer">Street View</a></div></div>
              <div className="campus-tour"><div className="tour-thumbnail"><Image src={images[0]} alt={`${course.university.name} campus tour preview`} fill sizes="(max-width: 900px) 100vw, 65vw" unoptimized={images[0].startsWith("http")} /><button aria-label="Play campus tour"><span>▶</span></button></div><div><strong>Take a Virtual Campus Tour</strong><span>Video will be available soon. Continue exploring the course below.</span></div></div>
            </CourseSection>

            <CourseSection id="living" kicker="Prepare with confidence" title="Estimated Living Costs">
              <div className="period-tabs" role="group" aria-label="Living cost period">{(["Weekly", "Monthly", "Annual"] as const).map((period) => <button key={period} className={livingPeriod === period ? "active" : ""} onClick={() => setLivingPeriod(period)} aria-pressed={livingPeriod === period}>{period}</button>)}</div>
              <div className="living-total"><span>Estimated {livingPeriod.toLowerCase()} living cost</span><strong>{livingPeriod === "Weekly" ? "AUD 460–650" : livingPeriod === "Annual" ? "AUD 22,000–31,000" : money(course.university.estimated_monthly_living_cost, course.university.living_cost_currency || "AUD")}</strong><small>Indicative range based on lifestyle and accommodation choices.</small></div>
              <div className="cost-grid"><Info label="Accommodation" value="45–55%" /><Info label="Food and groceries" value="18–24%" /><Info label="Transport" value="6–10%" /><Info label="Utilities and personal" value="15–22%" /></div>
              <div className="work-notice"><ShieldCheck /><div><strong>Post-Study Work Information</strong><p>Potential work-right duration depends on the course, location, individual circumstances and immigration rules in effect at the time of application. It is not guaranteed.</p><small>Last updated: July 2026</small></div><a href="https://immi.homeaffairs.gov.au/" target="_blank" rel="noreferrer">Official source <ExternalLink /></a></div>
            </CourseSection>

            <CourseSection id="apply" kicker="Your next step" title="Start Your Application">
              <div className="application-stepper">{["Check Eligibility", "Submit Your Details", "Upload Documents", "Application Review", "Receive and Accept Offer", "Visa Guidance"].map((step, index) => <div key={step} className="application-step"><span>{index + 1}</span><div><strong>{step}</strong><p>{index === 0 ? "Get an initial profile assessment before committing." : "Your Cybrik counsellor will guide you through this stage."}</p></div>{index === 0 && <button onClick={() => alert("Eligibility flow is ready to connect to the student profile form.")}>Begin</button>}</div>)}</div>
            </CourseSection>
          </div>

          <aside className="application-sidebar" aria-label="Application actions"><span className="sidebar-kicker">Ready to take the next step?</span><h2>Get guidance for your application</h2><p>Check your eligibility and receive a personalised document checklist.</p><div className="sidebar-stat"><span>Next intake</span><strong>{intakes[selectedIntake]}</strong></div><div className="sidebar-stat"><span>Tuition fee</span><strong>{tuition}</strong></div><button className="course-primary course-wide" onClick={() => alert("Eligibility flow is ready to connect to the student profile form.")}>Check Eligibility <ArrowRight /></button><button className="course-secondary course-wide"><Download /> Download Brochure</button><p className="sidebar-trust"><ShieldCheck /> No admission or visa outcome is guaranteed.</p></aside>
        </div>

        <footer className="course-footer"><Image src="/cybrik-logo.png" alt="Cybrik Solutions" width={150} height={44} /><p>Course fees, admission requirements, scholarships, immigration policies and intake availability may change. Confirm final information with the institution and relevant government authorities.</p><button onClick={() => { setSaved(false); setSelectedIntake(0); scrollTo("overview"); }}><RotateCcw /> Start Over</button></footer>
      </main>

      <div className="kiosk-actions"><button onClick={() => alert("Eligibility flow is ready to connect to the student profile form.")}><CheckCircle2 /> Check Eligibility</button><button onClick={() => scrollTo("apply")} className="primary"><Send /> Apply Now</button><button onClick={() => navigator.share?.({ title: course.title, url: window.location.href }).catch(() => undefined)}><Share2 /> Send to Phone</button></div>
      <div className="accessibility-fab"><button onClick={() => setContrast((v) => !v)} aria-pressed={contrast}><Accessibility /> {contrast ? "Standard contrast" : "High contrast"}</button></div>

      {galleryOpen && <div className="gallery-modal" role="dialog" aria-modal="true" aria-label="Campus photo gallery"><button className="gallery-close" onClick={() => setGalleryOpen(false)}><X /> Close gallery</button><button className="gallery-arrow left" aria-label="Previous photo" onClick={() => setGalleryIndex((galleryIndex - 1 + images.length) % images.length)}><ArrowLeft /></button><div className="gallery-stage"><Image src={images[galleryIndex]} alt={`${course.university.name} campus photo ${galleryIndex + 1}`} fill sizes="95vw" unoptimized={images[galleryIndex].startsWith("http")} /><span>{galleryIndex + 1} / {images.length}</span></div><button className="gallery-arrow right" aria-label="Next photo" onClick={() => setGalleryIndex((galleryIndex + 1) % images.length)}><ArrowRight /></button></div>}
    </div>
  );
}

function CourseSection({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: React.ReactNode }) { return <section id={id} className="course-section"><span className="course-section-kicker">{kicker}</span><h2>{title}</h2>{children}</section>; }
function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="summary-fact">{icon}<span>{label}<strong>{value}</strong></span></div>; }
function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className={`info-pair ${strong ? "strong" : ""}`}><span>{label}</span><strong>{value || "Not specified"}</strong></div>; }
function Accordion({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) { return <div className={`course-accordion ${open ? "open" : ""}`}><button onClick={onToggle} aria-expanded={open}><span>{title}</span><ChevronDown /></button>{open && <div className="accordion-content">{children}</div>}</div>; }
function EnglishTest({ name, overall, minimum }: { name: string; overall: string; minimum: string }) { return <div className="english-row"><Languages /><strong>{name}</strong><span>Overall: <b>{overall}</b></span><span>Minimum: {minimum}</span><em>Score not added</em></div>; }
