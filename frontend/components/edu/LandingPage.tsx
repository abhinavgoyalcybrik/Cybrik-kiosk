import Link from "next/link";
import { ArrowRight, Check, Compass, FileText, Globe, Graduation, Heart, Search, Shield, Spark } from "./Icons";
import { Brand } from "./Brand";

const universities = [
  { short: "RMIT", name: "RMIT University", city: "Melbourne", score: 96, color: "blue" },
  { short: "UQ", name: "University of Queensland", city: "Brisbane", score: 92, color: "green" },
  { short: "MON", name: "Monash University", city: "Melbourne", score: 89, color: "amber" },
];

export function LandingPage() {
  return (
    <main className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="top-nav">
        <Brand />
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#how">How it works</a><a href="#features">Why Cybrik</a><a href="#stories">Success stories</a><a href="#faq">FAQs</a>
        </nav>
        <div className="nav-actions"><Link href="/portal" className="text-link">Sign in</Link><Link href="/portal" className="button button-sm">Find my university <ArrowRight size={17} /></Link></div>
      </header>

      <div id="main-content">
        <section className="hero section-pad">
          <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
          <div className="hero-copy reveal">
            <div className="eyebrow"><Spark size={16} /> Intelligent study-abroad guidance</div>
            <h1>Your future has a <span>world of possibilities.</span></h1>
            <p>Tell us where you stand and where you want to go. Cybrik turns your profile into a clear shortlist of courses, universities, and next steps—built around you.</p>
            <div className="hero-actions"><Link href="/portal" className="button button-lg">Discover my matches <ArrowRight /></Link><a href="#how" className="button button-lg button-quiet">See how it works</a></div>
            <div className="trust-row"><span><Check size={16} /> No application fees</span><span><Check size={16} /> Profile takes 3 minutes</span><span><Shield size={16} /> Your data stays private</span></div>
          </div>

          <div className="hero-product reveal delay-one" aria-label="University match preview">
            <div className="product-head"><div><span className="tiny-label">Your best-fit programs</span><h2>12 strong matches</h2></div><div className="avatar"><span>AS</span><i /></div></div>
            <div className="profile-fit"><div className="fit-icon"><Graduation /></div><div><strong>Profile strength</strong><span>Academic and language details complete</span></div><b>Excellent</b></div>
            <div className="match-list">
              {universities.map((u, i) => <div className="mini-match" key={u.short} style={{ "--delay": `${i * 70}ms` } as React.CSSProperties}><div className={`uni-mark ${u.color}`}>{u.short}</div><div className="mini-match-copy"><strong>{u.name}</strong><span>{u.city} · Master of Data Science</span></div><div className="score"><strong>{u.score}%</strong><span>match</span></div></div>)}
            </div>
            <div className="product-foot"><span><Heart size={16} /> 3 saved</span><span>Updated from your preferences</span></div>
          </div>
        </section>

        <section className="proof-strip" aria-label="Platform highlights">
          <div><strong>2,400+</strong><span>global programs</span></div><div><strong>18</strong><span>study destinations</span></div><div><strong>94%</strong><span>students find a strong match</span></div><div><strong>4.9/5</strong><span>student experience</span></div>
        </section>

        <section className="journey section-pad" id="how">
          <div className="section-heading"><div><span className="kicker">A clearer way forward</span><h2>From ambition to action,<br />in three thoughtful steps.</h2></div><p>No endless tabs. No generic lists. Just a guided path that responds to your goals and shows you exactly what matters.</p></div>
          <div className="journey-grid">
            <article className="journey-card"><span className="step-no">01</span><div className="icon-box"><Compass /></div><h3>Share your direction</h3><p>Add your academics, English score, budget, and preferred destinations. Save progress as you go.</p><div className="card-detail"><span>Academic profile</span><span>Preferences</span><span>Budget</span></div></article>
            <article className="journey-card featured"><span className="step-no">02</span><div className="icon-box"><Search /></div><h3>See what truly fits</h3><p>Explore eligible courses ranked by a transparent match score—not popularity or promotion.</p><div className="match-demo"><span>Profile alignment</span><strong>94%</strong><i><b /></i></div></article>
            <article className="journey-card"><span className="step-no">03</span><div className="icon-box"><FileText /></div><h3>Prepare with confidence</h3><p>Get one personalized checklist for admissions and visas, including useful templates and clear priorities.</p><ul className="check-mini"><li><Check /> Passport</li><li><Check /> Transcripts</li><li><span /> Statement of purpose</li></ul></article>
          </div>
        </section>

        <section className="feature-section section-pad" id="features">
          <div className="feature-visual">
            <div className="country-card country-main"><Globe size={28} /><span>Explore destinations</span><strong>Australia</strong><small>6 universities · 24 programs</small><div className="city-pills"><b>Melbourne</b><b>Sydney</b><b>Brisbane</b></div></div>
            <div className="floating-card scholarship"><span>Scholarship match</span><strong>Up to ₹8L</strong><small>3 opportunities found</small></div>
            <div className="floating-card deadline"><span>Next intake</span><strong>February 2027</strong><small>Applications open</small></div>
          </div>
          <div className="feature-copy"><span className="kicker">Built around your reality</span><h2>Recommendations that make sense—not just more options.</h2><p>Every result explains why it fits. Adjust your budget, city, or course and watch your shortlist respond instantly.</p><ul className="feature-list"><li><span><Graduation /></span><div><strong>Eligibility comes first</strong><p>Programs you don’t qualify for stay out of the way.</p></div></li><li><span><Spark /></span><div><strong>A match score you can understand</strong><p>See how academics, language, budget, and preferences contribute.</p></div></li><li><span><FileText /></span><div><strong>One organized document plan</strong><p>Know what’s ready, what needs action, and what comes next.</p></div></li></ul><Link href="/portal" className="inline-link">Build my student profile <ArrowRight /></Link></div>
        </section>

        <section className="story-section section-pad" id="stories">
          <div className="quote-mark">“</div><blockquote>Cybrik didn’t just give me a list. It helped me understand why RMIT fit my goals and what I needed to do next.</blockquote><div className="student"><div className="student-avatar">NK</div><div><strong>Naina Kapoor</strong><span>Master of Analytics · Melbourne</span></div></div>
        </section>

        <section className="faq section-pad" id="faq"><div><span className="kicker">Good questions, clear answers</span><h2>Everything you need<br />to get started.</h2><p>Still unsure? Our counselors can help you understand the journey.</p><a href="mailto:hello@cybrik.com" className="inline-link">Talk to an advisor <ArrowRight /></a></div><div className="faq-list"><details open><summary>How does the match score work?<span>−</span></summary><p>It combines academic eligibility, English proficiency, budget, location, and course preferences. You can see the factors behind every score.</p></details><details><summary>Is Cybrik free for students?<span>+</span></summary><p>Yes. Exploring programs, building a shortlist, and creating your document checklist are free.</p></details><details><summary>Can I update my preferences later?<span>+</span></summary><p>Absolutely. Your results recalculate as soon as you change a preference.</p></details><details><summary>Does Cybrik submit applications?<span>+</span></summary><p>This demo helps you discover and prepare. Counselor-assisted applications can be added in a later phase.</p></details></div></section>

        <section className="closing-cta section-pad"><div className="cta-globe"><Globe size={220} /></div><span className="kicker light">Your next chapter is closer than it feels</span><h2>Find the university<br />that fits your story.</h2><p>Three minutes is all it takes to turn uncertainty into a thoughtful shortlist.</p><Link href="/portal" className="button button-light button-lg">Start my journey <ArrowRight /></Link></section>
      </div>

      <footer><Brand compact /><p>Making global education clearer, one student at a time.</p><div className="footer-links"><a href="#features">Platform</a><a href="#how">How it works</a><a href="#faq">Help</a><a href="mailto:hello@cybrik.com">Contact</a></div><span>© 2026 Cybrik Solutions</span></footer>
    </main>
  );
}
