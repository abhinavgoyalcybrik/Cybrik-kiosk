import Image from "next/image";
import Link from "next/link";
import SmoothScrollHero from "@/components/ui/smooth-scroll-hero";
import { ArrowRight, Check, Compass, FileText, Globe, Graduation, Shield, Spark } from "./Icons";
import { Brand } from "./Brand";
import { PremiumMotion } from "./PremiumMotion";
import { DestinationOrbitalCard } from "./DestinationOrbitalCard";
import { TestimonialCarousel } from "./TestimonialCarousel";
import { SiteFooter } from "./SiteFooter";

export function LandingPage() {
  return (
    <main className="site-shell">
      <PremiumMotion />
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="top-nav">
        <Brand />
        <nav className="nav-links" aria-label="Main navigation"><a href="#how">How it works</a><a href="#features">Why Cybrik</a><a href="#stories">Success stories</a><a href="#faq">FAQs</a></nav>
        <div className="nav-actions"><Link href="/portal" className="text-link">Sign in</Link><Link href="/portal" className="button button-sm">Find my university <ArrowRight size={17} /></Link></div>
      </header>

      <div id="main-content">
        <SmoothScrollHero desktopImage="" mobileImage="">
          <section className="hero section-pad">
            <div className="hero-copy reveal">
              <div className="eyebrow"><Spark size={16} /> Intelligent study-abroad guidance</div>
              <h1>Your future has a <span>world of possibilities.</span></h1>
              <p>Tell us where you stand and where you want to go. Cybrik turns your profile into a clear shortlist of courses, universities, and next steps—built around you.</p>
              <div className="hero-actions"><Link href="/portal" className="button button-lg">Discover my matches <ArrowRight /></Link><a href="#how" className="button button-lg button-quiet">See how it works</a></div>
              <div className="trust-row"><span><Check size={16} /> No application fees</span><span><Check size={16} /> Profile takes 3 minutes</span><span><Shield size={16} /> Your data stays private</span></div>
            </div>

            <div className="hero-intelligence" data-hero-sequence data-visible="true" data-craft-reactive aria-label="Personalized study planning preview">
              <div className="hero-photo-row" data-hero-item style={{ "--hero-delay": "0ms" } as React.CSSProperties}>
                <div className="college-image-card"><Image src="/student-campus-1.webp" alt="Students discussing university plans on campus" fill priority sizes="(max-width: 820px) 42vw, 210px" /><span>Campus life</span></div>
                <div className="college-image-card secondary"><Image src="/student-campus-2.webp" alt="International students connecting on campus" fill sizes="(max-width: 820px) 42vw, 210px" /><span>Global community</span></div>
              </div>
              <div className="hero-widget-grid">
                <article className="hero-widget match-widget" data-hero-item style={{ "--hero-delay": "110ms" } as React.CSSProperties}><div className="widget-icon"><Graduation /></div><div><span>Personalized university matches</span><strong>98% match</strong><i className="hero-progress"><b style={{ "--progress": ".98" } as React.CSSProperties} /></i></div></article>
                <article className="hero-widget scholarship-widget" data-hero-item style={{ "--hero-delay": "220ms" } as React.CSSProperties}><div className="widget-icon"><Spark /></div><div><span>Scholarships available</span><strong>27 options</strong><i className="hero-progress blue"><b style={{ "--progress": ".78" } as React.CSSProperties} /></i></div></article>
                <article className="hero-widget destination-widget" data-hero-item style={{ "--hero-delay": "330ms" } as React.CSSProperties}><span>Top destinations</span><div><b>AU</b><b>UK</b><b>CA</b><b>IE</b></div><small>Matched to your profile</small></article>
                <article className="hero-widget ai-widget" data-hero-item style={{ "--hero-delay": "440ms" } as React.CSSProperties}><span>AI recommendation</span><div className="ai-ring"><svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="22"/><circle className="ai-ring-value" cx="26" cy="26" r="22"/></svg><strong>92%</strong></div><small>Excellent profile fit</small></article>
                <article className="hero-widget budget-widget" data-hero-item style={{ "--hero-delay": "550ms" } as React.CSSProperties}><span>Budget planner</span><strong>On track</strong><svg viewBox="0 0 160 48" preserveAspectRatio="none" aria-hidden="true"><path d="M2 41 C22 39 28 31 45 33 S68 22 84 27 S108 10 124 17 S143 5 158 4"/><path className="budget-fill" d="M2 41 C22 39 28 31 45 33 S68 22 84 27 S108 10 124 17 S143 5 158 4 L158 48 L2 48 Z"/></svg></article>
                <article className="hero-widget journey-widget" data-hero-item style={{ "--hero-delay": "660ms" } as React.CSSProperties}><span>Your journey</span><ol>{["Shortlist","Application","Offer received","Visa process","Departure"].map((milestone,index)=><li key={milestone} className={index<3?"done":""} style={{ "--milestone-delay": `${760+index*110}ms` } as React.CSSProperties}><i>{index<3&&<Check size={9}/>}</i><b>{milestone}</b></li>)}</ol></article>
              </div>
            </div>
          </section>
        </SmoothScrollHero>

        <section className="proof-strip" data-reveal aria-label="Platform highlights"><div><strong>2,400+</strong><span>global programs</span></div><div><strong>18</strong><span>study destinations</span></div><div><strong>94%</strong><span>students find a strong match</span></div><div><strong>4.9/5</strong><span>student experience</span></div></section>
        <section className="journey section-pad" id="how" data-reveal data-cursor-intent><div className="section-heading"><div><span className="kicker">A clearer way forward</span><h2>From ambition to action,<br />in three thoughtful steps.</h2></div><p>No endless tabs. No generic lists. Just a guided path that responds to your goals and shows you exactly what matters.</p></div><div className="journey-grid"><article className="journey-card" data-craft-reactive><span className="step-no">01</span><div className="icon-box"><Compass /></div><h3>Share your direction</h3><p>Add your academics, English score, budget, and preferred destinations. Save progress as you go.</p><div className="card-detail"><span>Academic profile</span><span>Preferences</span><span>Budget</span></div></article><article className="journey-card featured" data-craft-reactive><span className="step-no">02</span><div className="icon-box"><Spark /></div><h3>See what truly fits</h3><p>Explore eligible courses ranked by a transparent match score—not popularity or promotion.</p><div className="match-demo"><span>Profile alignment</span><strong>94%</strong><i><b /></i></div></article><article className="journey-card" data-craft-reactive><span className="step-no">03</span><div className="icon-box"><FileText /></div><h3>Prepare with confidence</h3><p>Get one personalized checklist for admissions and visas, including useful templates and clear priorities.</p><ul className="check-mini"><li><Check /> Passport</li><li><Check /> Transcripts</li><li><span /> Statement of purpose</li></ul></article></div></section>
        <section className="feature-section section-pad" id="features" data-reveal data-cursor-intent><DestinationOrbitalCard /><div className="feature-copy"><span className="kicker">Built around your reality</span><h2>Recommendations that make sense—not just more options.</h2><p>Every result explains why it fits. Adjust your budget, city, or course and watch your shortlist respond instantly.</p><ul className="feature-list"><li><span><Graduation /></span><div><strong>Eligibility comes first</strong><p>Programs you don’t qualify for stay out of the way.</p></div></li><li><span><Spark /></span><div><strong>A match score you can understand</strong><p>See how academics, language, budget, and preferences contribute.</p></div></li><li><span><FileText /></span><div><strong>One organized document plan</strong><p>Know what’s ready, what needs action, and what comes next.</p></div></li></ul><Link href="/portal" className="inline-link">Build my student profile <ArrowRight /></Link></div></section>
        <TestimonialCarousel />
        <section className="faq section-pad" id="faq" data-reveal data-cursor-intent><div><span className="kicker">Good questions, clear answers</span><h2>Everything you need<br />to get started.</h2><p>Still unsure? Our counselors can help you understand the journey.</p><a href="mailto:hello@cybrik.com" className="inline-link">Talk to an advisor <ArrowRight /></a></div><div className="faq-list"><details open><summary>How does the match score work?<span>+</span></summary><p>It combines academic eligibility, English proficiency, budget, location, and course preferences. You can see the factors behind every score.</p></details><details><summary>Is Cybrik free for students?<span>+</span></summary><p>Yes. Exploring programs, building a shortlist, and creating your document checklist are free.</p></details><details><summary>Can I update my preferences later?<span>+</span></summary><p>Absolutely. Your results recalculate as soon as you change a preference.</p></details><details><summary>Does Cybrik submit applications?<span>+</span></summary><p>This demo helps you discover and prepare. Counselor-assisted applications can be added in a later phase.</p></details></div></section>
        <section className="closing-cta section-pad" data-reveal><div className="cta-globe"><Globe size={220} /></div><span className="kicker light">Your next chapter is closer than it feels</span><h2>Find the university<br />that fits your story.</h2><p>Three minutes is all it takes to turn uncertainty into a thoughtful shortlist.</p><Link href="/portal" className="button button-light button-lg">Start my journey <ArrowRight /></Link></section>
      </div>
      <SiteFooter />
    </main>
  );
}
