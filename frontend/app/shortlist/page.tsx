"use client";

import StudentProfileSidebar from "@/components/student/StudentProfileSidebar";
import CourseResultsGrid from "@/components/courses/CourseResultsGrid";
import useRecommendations from "@/hooks/useRecommendations";

import { AnimatePresence, motion } from "framer-motion";

export default function ShortlistPage() {
  const {
    profile,
    updateProfileField,
    completionPercentage,
    confidenceLevel,
    suitableCourseCount,
  } = useRecommendations();

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <StudentProfileSidebar
          profile={profile}
          updateProfileField={updateProfileField}
          completionPercentage={completionPercentage}
          confidenceLevel={confidenceLevel}
        />

        <section className="flex-1 p-6">
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Course Shortlisting</p>

            <div className="flex items-end gap-3">
  <AnimatePresence mode="wait">
    <motion.h1
      key={suitableCourseCount}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25 }}
      className="text-4xl font-bold text-slate-900"
    >
      {suitableCourseCount}
    </motion.h1>
  </AnimatePresence>

  <p className="mb-1 text-lg text-slate-600">
    suitable courses found
  </p>
</div>

            <p className="mt-2 text-slate-600">
              Based on your academics, preferences, budget and English score.
            </p>
          </div>

          <CourseResultsGrid 
            completionPercentage={completionPercentage}
          />
        </section>
      </div>
    </main>
  );
}