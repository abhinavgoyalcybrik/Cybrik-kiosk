"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchCourseWhatsAppSharePayload } from "@/lib/api";
import type { CourseCatalogApiItem } from "@/lib/types";

type ShortlistCartModalProps = {
  courses: CourseCatalogApiItem[];
  isOpen: boolean;
  isShareLoading: boolean;
  shareArtifacts: {
    pdfUrl: string;
    leadFormUrl: string;
  } | null;
  onClose: () => void;
  onRemove: (courseId: number) => void;
  onShareAll: () => void;
  onClear: () => void;
  onCopyLeadFormLink: () => void;
};

export default function ShortlistCartModal({
  courses,
  isOpen,
  isShareLoading,
  shareArtifacts,
  onClose,
  onRemove,
  onShareAll,
  onClear,
  onCopyLeadFormLink,
}: ShortlistCartModalProps) {
  const [activeWhatsAppCourseId, setActiveWhatsAppCourseId] = useState<number | null>(null);

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="shortlist-cart-modal-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          className="shortlist-cart-modal"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="shortlist-cart-modal-header">
            <div>
              <p className="shortlist-cart-modal-eyebrow">Shortlist basket</p>
              <h2 className="shortlist-cart-modal-title">
                {courses.length} shortlisted program{courses.length === 1 ? "" : "s"}
              </h2>
              <p className="shortlist-cart-modal-subtitle">
                Review saved courses, open the course page to apply, or send details on WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shortlist-cart-modal-close"
              aria-label="Close shortlist basket"
            >
              ×
            </button>
          </header>

          <div className="shortlist-cart-modal-body">
            {courses.map((course) => {
              const location = `${course.university.city}, ${course.university.country}`;
              const tuition =
                course.tuition_fee !== null
                  ? `${course.tuition_currency} ${new Intl.NumberFormat("en-US", {
                      maximumFractionDigits: 0,
                    }).format(course.tuition_fee)}`
                  : "Check portal";

              return (
                <article key={course.course_id} className="shortlist-cart-item">
                  <div className="shortlist-cart-item-top">
                    <div className="shortlist-cart-item-copy">
                      <p className="shortlist-cart-item-university">{course.university.name}</p>
                      <h3 className="shortlist-cart-item-title">{course.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(course.course_id)}
                      className="shortlist-cart-item-remove"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="shortlist-cart-item-meta">
                    <span>{course.degree_level}</span>
                    <span>{location}</span>
                    <span>{tuition}</span>
                  </div>

                  <div className="shortlist-cart-item-actions">
                    <Link href={`/course/${course.course_id}`} className="shortlist-cart-item-btn primary">
                      View / Apply
                    </Link>
                    <button
                      type="button"
                      className="shortlist-cart-item-btn secondary"
                      onClick={async () => {
                        try {
                          setActiveWhatsAppCourseId(course.course_id);
                          const payload = await fetchCourseWhatsAppSharePayload(course.course_id);
                          window.open(payload.whatsapp_url, "_blank", "noopener,noreferrer");
                        } catch {
                          const fallback = encodeURIComponent(
                            `Hi, I want details for ${course.title} at ${course.university.name}.`
                          );
                          window.open(`https://wa.me/?text=${fallback}`, "_blank", "noopener,noreferrer");
                        } finally {
                          setActiveWhatsAppCourseId((current) =>
                            current === course.course_id ? null : current
                          );
                        }
                      }}
                    >
                      {activeWhatsAppCourseId === course.course_id
                        ? "Opening..."
                        : "WhatsApp details"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <footer className="shortlist-cart-modal-footer">
            <div className="shortlist-cart-modal-footer-copy">
              <span className="shortlist-cart-modal-footer-count">
                {courses.length} course{courses.length === 1 ? "" : "s"} ready
              </span>
              <span className="shortlist-cart-modal-footer-note">
                Share everything in one WhatsApp message with a downloadable PDF.
              </span>
            </div>

            <div className="shortlist-cart-modal-footer-actions">
              <button
                type="button"
                onClick={onShareAll}
                className="shortlist-cart-item-btn whatsapp-all"
              >
                {isShareLoading ? "Preparing WhatsApp..." : "WhatsApp all + PDF"}
              </button>
              {shareArtifacts ? (
                <a
                  href={shareArtifacts.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shortlist-cart-item-btn tertiary"
                >
                  Open PDF
                </a>
              ) : null}
              {shareArtifacts ? (
                <button
                  type="button"
                  onClick={onCopyLeadFormLink}
                  className="shortlist-cart-item-btn tertiary"
                >
                  Copy form link
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClear}
                className="shortlist-cart-item-btn ghost"
              >
                Clear shortlist
              </button>
            </div>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
