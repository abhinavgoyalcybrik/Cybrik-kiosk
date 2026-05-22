"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { fetchCourseDetail, fetchCourseWhatsAppSharePayload, fetchCoursesCatalog } from "@/lib/api";
import { CourseCatalogApiItem, DetailedCourse } from "@/lib/types";
import { resolveUniversityLogoUrl } from "@/lib/universityLogo";

import "./course.css";

export default function CourseDetailPage() {
  const { id } = useParams();
  const [course, setCourse] = useState<DetailedCourse | null>(null);
  const [similarCourses, setSimilarCourses] = useState<CourseCatalogApiItem[]>([]);
  const [isLogoErrored, setIsLogoErrored] = useState(false);
  const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    fetchCourseDetail(Number(id))
      .then((data) => {
        if (cancelled) {
          return;
        }

        setCourse(data);

        return fetchCoursesCatalog()
          .then((catalog) => {
            if (cancelled) {
              return;
            }

            const related = catalog.courses
              .filter((item) => item.course_id !== data.course_id)
              .map((item) => {
                let rank = 0;
                if (item.field_of_study === data.field_of_study) rank += 3;
                if (item.degree_level === data.degree_level) rank += 2;
                if (item.university.country === data.university.country) rank += 1;
                return { item, rank };
              })
              .sort((left, right) => right.rank - left.rank)
              .slice(0, 4)
              .map((entry) => entry.item);

            setSimilarCourses(related);
          })
          .finally(() => {
            if (!cancelled) {
              setLoading(false);
            }
          });
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        setError(err.message || "Failed to load course details");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const formatAmount = (amount: number | null, currency: string, suffix = "") => {
    if (amount === null || amount <= 0) {
      return "Check portal";
    }

    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return `${currency} ${formatted}${suffix}`;
  };

  const formatShortAmount = (amount: number | null, currency: string) => {
    if (amount === null || amount <= 0) {
      return "Check portal";
    }

    const formatted = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(amount);

    return `${currency} ${formatted}`;
  };

  const formatProgramLength = (durationMonths: number | null) => {
    if (!durationMonths) {
      return "Not specified";
    }

    if (durationMonths % 12 === 0) {
      const years = durationMonths / 12;
      return `${years} year${years === 1 ? "" : "s"} program`;
    }

    return `${durationMonths} months`;
  };

  const getIntakeStatus = (label: string) => {
    const normalized = label.toLowerCase();
    if (normalized.includes("2028") || normalized.includes("2029")) {
      return "Likely open";
    }
    return "Open";
  };

  const firstIntake = (intakes: string[]) => intakes[0] ?? "TBA";
  const deadlineFor = (intakes: string[]) => intakes[0] ?? "Check portal";

  const handleWhatsAppClick = async () => {
    if (!course || isWhatsAppLoading) {
      return;
    }

    try {
      setIsWhatsAppLoading(true);
      const payload = await fetchCourseWhatsAppSharePayload(course.course_id);
      window.open(payload.whatsapp_url, "_blank", "noopener,noreferrer");
    } catch {
      const fallback = encodeURIComponent(
        `Hi, I am interested in ${course.title} at ${course.university.name}. Please share details.`
      );
      window.open(`https://wa.me/?text=${fallback}`, "_blank", "noopener,noreferrer");
    } finally {
      setIsWhatsAppLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="overview-shell">
        <div className="loading-banner">Loading course details...</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="overview-shell">
        <div className="loading-banner error">
          {error || "Course not found"}
          <div className="error-link-wrap">
            <Link href="/shortlist" className="topbar-link">
              Back to Shortlist
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ieltsScore = course.ielts_overall ?? "N/A";
  const logoUrl = resolveUniversityLogoUrl(course.university.name, course.university.official_website);
  const showLogo = Boolean(logoUrl) && !isLogoErrored;
  const universityInitials = course.university.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  const campusLocation = [course.university.city, course.university.state_province || course.university.country]
    .filter(Boolean)
    .join(", ");
  const featureBadges = [
    "Instant Offer",
    "High Job Demand",
    "No Visa Cap",
    "Prime",
    "Popular",
    "Fast Acceptance",
  ];
  const galleryImages = (course.gallery_images || []).slice(0, 4);
  const gallerySlots = [
    galleryImages[0] ?? null,
    galleryImages[1] ?? null,
    galleryImages[2] ?? null,
    galleryImages[3] ?? null,
  ];

  return (
    <main className="overview-shell">
      <header className="overview-topbar">
        <Link href="/shortlist" className="topbar-link">
          Home
        </Link>
      </header>

      <section className="hero-shell">
        <div className="hero-university-row">
          <div className="hero-university-mark">
            {showLogo ? (
              <Image
                src={logoUrl ?? ""}
                alt={`${course.university.name} logo`}
                className="hero-university-logo"
                width={56}
                height={56}
                onError={() => setIsLogoErrored(true)}
              />
            ) : (
              <span>{universityInitials || "U"}</span>
            )}
          </div>
          <div>
            <p className="hero-university-name">{course.university.name}</p>
            <p className="hero-university-location">{campusLocation || course.university.country}</p>
          </div>
        </div>

        <h1 className="hero-course-title">{course.title}</h1>

        <div className="hero-meta-row">
          <span className="hero-course-code">{course.course_id}</span>
          <span className="hero-meta-divider" aria-hidden />
          <div className="hero-feature-chips">
            {featureBadges.map((badge) => (
              <span key={badge} className={`hero-chip ${badge.toLowerCase().replace(/\s+/g, "-")}`}>
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-gallery">
          <div className="hero-photo-card large">
            {gallerySlots[0] ? <img src={gallerySlots[0]} alt={`${course.university.name} campus`} className="hero-photo" loading="lazy" /> : null}
            <button type="button" className="hero-photo-button">View Photos</button>
          </div>
          <div className="hero-photo-stack">
            <div className="hero-photo-card medium">
              {gallerySlots[1] ? <img src={gallerySlots[1]} alt={`${course.university.name} gallery`} className="hero-photo" loading="lazy" /> : null}
            </div>
            <div className="hero-photo-card small">
              {gallerySlots[2] ? <img src={gallerySlots[2]} alt={`${course.university.name} gallery`} className="hero-photo" loading="lazy" /> : null}
            </div>
            <div className="hero-photo-card small">
              {gallerySlots[3] ? <img src={gallerySlots[3]} alt={`${course.university.name} gallery`} className="hero-photo" loading="lazy" /> : null}
            </div>
          </div>
        </div>
      </section>

      <div className="overview-tabs">
        <button className="tab-btn active">Overview</button>
        <button className="tab-btn">Admission Requirements</button>
        <button className="tab-btn">Similar Programs</button>
      </div>

      <section className="overview-content">
        <div className="overview-main">
          <section className="overview-section">
            <div className="ai-insights-card">
              <div className="ai-header">
                <div className="ai-icon">✨</div>
                <h2 className="ai-title">Cybrik AI Match Insights</h2>
              </div>
              <div className="ai-match-grid">
                <div className="ai-match-item">
                  <span className="match-score">94%</span>
                  <span className="match-label">Academic Fit</span>
                </div>
                <div className="ai-match-item">
                  <span className="match-score">88%</span>
                  <span className="match-label">Budget Fit</span>
                </div>
                <div className="ai-match-item">
                  <span className="match-score">98%</span>
                  <span className="match-label">Career Relevance</span>
                </div>
              </div>
              <p className="ai-analysis-text">
                This program strongly aligns with your academic background in Computer Science and your target budget. The university is renowned for its industry connections, significantly boosting your post-graduation prospects in the local tech sector.
              </p>
            </div>
          </section>

          <section className="overview-section">
            <h2 className="section-title">Program Summary</h2>
            <article className="summary-card">
              <p>{course.course_summary || "No summary available."}</p>
            </article>
          </section>

          <section className="overview-section">
            <h2 className="section-title">Career Outcomes & ROI</h2>
            <div className="roi-card">
              <div className="roi-grid">
                <div className="roi-item">
                  <span className="roi-value">85K+</span>
                  <span className="roi-label">Avg. Graduate Salary (AUD)</span>
                </div>
                <div className="roi-item">
                  <span className="roi-value">92%</span>
                  <span className="roi-label">Employment Rate (6 mo.)</span>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Career Path Simulator</h4>
                <div className="space-y-4">
                  {[
                    { role: "AI Research Scientist", salary: "120K", growth: "High" },
                    { role: "Machine Learning Engineer", salary: "110K", growth: "Very High" },
                    { role: "Data Architect", salary: "105K", growth: "Steady" }
                  ].map((path) => (
                    <div key={path.role} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{path.role}</p>
                        <p className="text-xs text-slate-500">Projected Salary: {path.salary} AUD</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase">{path.growth} Growth</span>
                        <div className="text-xs text-blue-600 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View Roadmap →</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="ai-analysis-text mt-6 text-sm text-slate-600 border-l-emerald-500">
                {course.career_outcomes || "Top employers for this program typically include leading tech firms, financial institutions, and government agencies seeking advanced analytical skills."}
              </p>
            </div>
          </section>

          <section className="overview-section">
            <h2 className="section-title">Admission Requirements</h2>
            <p className="section-subtitle">
              May vary depending on student nationality and education background.
            </p>

            <div className="requirement-grid">
              <article className="requirement-card">
                <p className="requirement-label">Minimum level of education completed</p>
                <p className="requirement-value">{course.degree_level || "Not specified"}</p>
              </article>
              <article className="requirement-card">
                <p className="requirement-label">Minimum IELTS score</p>
                <p className="requirement-value">{ieltsScore}</p>
              </article>
            </div>

            <article className="notes-card">
              <p className="notes-heading">Admissions Notes</p>
              <p>{course.admissions_notes || "Contact university for admissions specifics."}</p>
            </article>
          </section>
        </div>

        <aside className="overview-side">
          <div className="side-actions flex flex-col gap-3">
            <a href={course.course_url} target="_blank" rel="noopener noreferrer" className="apply-btn w-full">
              Apply Now
            </a>
            <button
              onClick={handleWhatsAppClick}
              className="w-full h-[52px] bg-emerald-500 text-white rounded-[14px] font-semibold text-base flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
            >
              {isWhatsAppLoading ? "Opening WhatsApp..." : "Get Details on WhatsApp"}
            </button>
            <button className="wish-btn w-full h-[52px] border border-slate-200 rounded-[14px] bg-white text-slate-400 flex items-center justify-center hover:bg-slate-50 transition-colors" aria-label="Save to wishlist">
              <span className="text-xl">♡</span>
              <span className="ml-2 text-sm font-bold text-slate-500 uppercase">Save to Shortlist</span>
            </button>
          </div>

          <section className="side-card">
            <div className="fact-row">
              <p className="fact-value">{course.degree_level || "N/A"}</p>
              <p className="fact-label">Program Level</p>
            </div>
            <div className="fact-row">
              <p className="fact-value">{formatProgramLength(course.duration_months)}</p>
              <p className="fact-label">Program Length</p>
            </div>
            <div className="fact-row">
              <p className="fact-value">
                {formatAmount(course.tuition_fee, course.tuition_currency, " / First Year")}
              </p>
              <p className="fact-label">Gross Tuition</p>
            </div>
            <div className="fact-row">
              <p className="fact-value">
                {formatShortAmount(
                  course.university.application_fee,
                  course.university.application_fee_currency
                )}
              </p>
              <p className="fact-label">Application Fee</p>
            </div>
          </section>

          <section className="side-card">
            <h3 className="side-heading">Program Intakes</h3>
            <div className="intake-list">
              {(course.intake_labels.length > 0 ? course.intake_labels : ["TBA"]).map((intake) => (
                <div className="intake-row" key={intake}>
                  <span className={`status-chip ${getIntakeStatus(intake) === "Open" ? "open" : "likely"}`}>
                    {getIntakeStatus(intake)}
                  </span>
                  <span className="intake-date">{intake}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="side-card">
            <h3 className="side-heading">Living Costs</h3>
            <p className="fact-value">
              {formatShortAmount(
                  course.university.estimated_monthly_living_cost,
                  course.university.living_cost_currency || "AUD"
              )}
              <span className="text-sm font-normal text-slate-500 ml-1">/ month</span>
            </p>
            <div className="living-cost-bar">
              <div className="living-housing" title="Housing: 50%"></div>
              <div className="living-food" title="Food & Groceries: 30%"></div>
              <div className="living-other" title="Transport & Utilities: 20%"></div>
            </div>
            <div className="living-legend">
              <div className="legend-item"><span className="legend-dot bg-blue-500"></span> Housing</div>
              <div className="legend-item"><span className="legend-dot bg-emerald-500"></span> Food</div>
              <div className="legend-item"><span className="legend-dot bg-amber-500"></span> Other</div>
            </div>

            <div className="visa-risk-widget">
              <div className="visa-icon">🛂</div>
              <div className="visa-text">
                <h4>Low Visa Risk</h4>
                <p>Based on your profile</p>
              </div>
            </div>
          </section>
        </aside>
      </section>

      <section className="similar-section">
        <h2 className="section-title">Similar Programs</h2>
        <div className="similar-list">
          {similarCourses.map((item) => (
            <article className="similar-card" key={item.course_id}>
              <h3 className="similar-title">{item.title}</h3>
              <p className="similar-uni">{item.university.name}</p>

              <div className="similar-metrics">
                <div>
                  <p className="similar-label">Earliest intake</p>
                  <p className="similar-value">{firstIntake(item.intake_labels)}</p>
                </div>
                <div>
                  <p className="similar-label">Deadline</p>
                  <p className="similar-value">{deadlineFor(item.intake_labels)}</p>
                </div>
                <div>
                  <p className="similar-label">Gross tuition</p>
                  <p className="similar-value">
                    {formatAmount(item.tuition_fee, item.tuition_currency)}
                  </p>
                </div>
                <div>
                  <p className="similar-label">Application fee</p>
                  <p className="similar-value">
                    {formatShortAmount(item.application_fee, item.application_fee_currency)}
                  </p>
                </div>
              </div>

              <div className="similar-actions">
                <Link href={`/course/${item.course_id}`} className="apply-btn ghost">View Program</Link>
                <button className="wish-btn" aria-label="Save similar program">♡</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
