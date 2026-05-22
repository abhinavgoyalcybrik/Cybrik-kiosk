"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CourseCard from "@/components/courses/CourseCard";
import StudentProfileSidebar from "@/components/student/StudentProfileSidebar";
import ComparisonModal from "@/components/courses/ComparisonModal";
import ShortlistCartModal from "@/components/courses/ShortlistCartModal";
import useRecommendations from "@/hooks/useRecommendations";
import { createShortlistWhatsAppSharePayload, fetchCoursesCatalog } from "@/lib/api";
import { buildShortlistCards } from "@/lib/shortlist";
import { CourseCatalogApiItem } from "@/lib/types";

import "./shortlist.css";

type CatalogState = {
  courses: CourseCatalogApiItem[];
  isLoading: boolean;
  errorMessage: string | null;
};

type CatalogAction =
  | { type: "load_start" }
  | { type: "load_success"; courses: CourseCatalogApiItem[] }
  | { type: "load_error"; errorMessage: string };

const initialCatalogState: CatalogState = {
  courses: [],
  isLoading: false,
  errorMessage: null,
};

const COURSES_PER_PAGE = 9;
const SHORTLIST_STORAGE_KEY = "cybrik-shortlist-course-ids";

function getInitialShortlistIds(): number[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(SHORTLIST_STORAGE_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is number => typeof item === "number")
      : [];
  } catch {
    return [];
  }
}

function catalogReducer(
  state: CatalogState,
  action: CatalogAction
): CatalogState {
  switch (action.type) {
    case "load_start":
      return {
        ...state,
        isLoading: true,
        errorMessage: null,
      };
    case "load_success":
      return {
        courses: action.courses,
        isLoading: false,
        errorMessage: null,
      };
    case "load_error":
      return {
        courses: [],
        isLoading: false,
        errorMessage: action.errorMessage,
      };
    default:
      return state;
  }
}

export default function ShortlistPage() {
  const [catalogState, dispatch] = useReducer(
    catalogReducer,
    initialCatalogState
  );
  const {
    profile,
    updateProfileField,
    completionPercentage,
    confidenceLevel,
  } = useRecommendations();

  const [visibleCount, setVisibleCount] = useState(COURSES_PER_PAGE);
  const [shortlistIds, setShortlistIds] = useState<number[]>(getInitialShortlistIds);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isShortlistCartOpen, setIsShortlistCartOpen] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [shareArtifacts, setShareArtifacts] = useState<{
    pdfUrl: string;
    leadFormUrl: string;
  } | null>(null);
  const [shareStatusText, setShareStatusText] = useState("");

  useEffect(() => {
    let isCancelled = false;
    dispatch({ type: "load_start" });

    fetchCoursesCatalog()
      .then((data) => {
        if (isCancelled) {
          return;
        }

        dispatch({
          type: "load_success",
          courses: data.courses,
        });
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        const fallbackMessage = "Could not load courses from the backend catalog.";
        const details =
          error instanceof Error && error.message
            ? ` ${error.message}`
            : "";

        dispatch({
          type: "load_error",
          errorMessage: `${fallbackMessage}${details}`,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      SHORTLIST_STORAGE_KEY,
      JSON.stringify(shortlistIds)
    );
  }, [shortlistIds]);

  const shortlist = useMemo(
    () =>
      buildShortlistCards(
        catalogState.courses,
        profile,
        ""
      ),
    [catalogState.courses, profile]
  );

  const visibleCourses = useMemo(
    () => shortlist.courses.slice(0, visibleCount),
    [shortlist.courses, visibleCount]
  );

  const resultsCount = shortlist.totalMatches;
  const isInitialLoading =
    catalogState.isLoading && catalogState.courses.length === 0;
  const resultsLabel = isInitialLoading
    ? "Loading programs..."
    : `${resultsCount} programs found`;
  const hasMore = visibleCount < shortlist.totalMatches;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + COURSES_PER_PAGE);
  };

  const handleProfileUpdate = (
    field: Parameters<typeof updateProfileField>[0],
    value: Parameters<typeof updateProfileField>[1]
  ) => {
    updateProfileField(field, value);
    setVisibleCount(COURSES_PER_PAGE);
  };

  const toggleShortlist = (id: number) => {
    setShareArtifacts(null);
    setShortlistIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const shortlistedCourses = catalogState.courses.filter((course) =>
    shortlistIds.includes(course.course_id)
  );

  const shortlistedPreview = shortlistedCourses.slice(0, 4);

  const handleShareShortlistedOnWhatsApp = async () => {
    if (shortlistIds.length === 0 || isShareLoading) {
      return;
    }

    try {
      setIsShareLoading(true);
      setShareStatusText("");
      const payload = await createShortlistWhatsAppSharePayload({
        course_ids: shortlistIds,
      });
      setShareArtifacts({
        pdfUrl: payload.pdf_download_url,
        leadFormUrl: payload.lead_form_url,
      });
      setShareStatusText("WhatsApp draft and PDF generated.");

      window.open(payload.whatsapp_url, "_blank", "noopener,noreferrer");
    } catch {
      setShareStatusText("Could not generate WhatsApp message. Please try again.");
    } finally {
      setIsShareLoading(false);
    }
  };

  const handleCopyLeadFormLink = async () => {
    if (!shareArtifacts?.leadFormUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareArtifacts.leadFormUrl);
      setShareStatusText("Lead form link copied.");
    } catch {
      setShareStatusText("Could not copy link right now.");
    }
  };

  const clearShortlist = () => {
    setShortlistIds([]);
    setShareArtifacts(null);
    setIsShortlistCartOpen(false);
    setShareStatusText("Shortlist cleared.");
  };

  return (
    <main className="results-page-shell">
      <section className="results-main-content">
        <div className="results-workspace">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="results-profile-column"
          >
            <StudentProfileSidebar
              profile={profile}
              updateProfileField={handleProfileUpdate}
              completionPercentage={completionPercentage}
              confidenceLevel={confidenceLevel}
            />
          </motion.div>

          <div className="results-results-column">
            <div
              className={`results-scroll-area ${
                shortlistIds.length > 0 ? "has-shortlist-cart" : ""
              }`}
            >
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="results-count-label flex items-center gap-3"
              >
                <span>✨</span>
                {resultsLabel}
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {catalogState.errorMessage ? (
                  <p className="results-error-message">{catalogState.errorMessage}</p>
                ) : null}
                <div className="program-grid">
                  {visibleCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      {...course}
                      isShortlisted={shortlistIds.includes(course.id)}
                      onToggleShortlist={toggleShortlist}
                    />
                  ))}
                </div>
              </motion.div>

              {hasMore && (
                <div className="pagination-footer">
                  <button
                    className="load-more-btn"
                    onClick={handleLoadMore}
                  >
                    Load More Courses
                  </button>
                  <p className="pagination-meta">
                    Showing {visibleCourses.length} of {shortlist.totalMatches} matches
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {shortlistIds.length > 0 && (
          <motion.div 
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            className="selection-tray"
          >
            <div className="selection-tray-summary">
              <div className="selection-tray-count">
                {shortlistIds.length}
              </div>
              <div className="selection-tray-copy">
                <p className="selection-tray-title">Shortlist basket</p>
                <p className="selection-tray-subtitle">
                  {shortlistedPreview
                    .map((course) => course.university.name)
                    .filter((value, index, array) => array.indexOf(value) === index)
                    .slice(0, 2)
                    .join(" • ") || "Selected programs ready to review"}
                </p>
              </div>
            </div>
            <div className="selection-tray-actions">
              <button
                onClick={() => setIsShortlistCartOpen(true)}
                className="selection-btn selection-btn-compare"
              >
                View shortlist
              </button>
              <button
                onClick={handleShareShortlistedOnWhatsApp}
                className="selection-btn selection-btn-share"
              >
                {isShareLoading ? "Preparing..." : "WhatsApp all"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {shareStatusText ? (
        <div className="share-status-toast">{shareStatusText}</div>
      ) : null}

      <ComparisonModal 
        courses={shortlistedCourses}
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
      />
      <ShortlistCartModal
        courses={shortlistedCourses}
        isOpen={isShortlistCartOpen}
        isShareLoading={isShareLoading}
        shareArtifacts={shareArtifacts}
        onClose={() => setIsShortlistCartOpen(false)}
        onRemove={toggleShortlist}
        onShareAll={handleShareShortlistedOnWhatsApp}
        onClear={clearShortlist}
        onCopyLeadFormLink={handleCopyLeadFormLink}
      />
    </main>
  );
}
