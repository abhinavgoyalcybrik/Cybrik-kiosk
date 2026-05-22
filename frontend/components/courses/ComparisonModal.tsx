"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CourseCatalogApiItem } from "@/lib/types";
import { fetchCourseWhatsAppSharePayload } from "@/lib/api";

type ComparisonModalProps = {
  courses: CourseCatalogApiItem[];
  isOpen: boolean;
  onClose: () => void;
};

export default function ComparisonModal({
  courses,
  isOpen,
  onClose,
}: ComparisonModalProps) {
  if (!isOpen) return null;

  const metrics = [
    { label: "University", key: "university.name" },
    { label: "Location", key: "location" },
    { label: "Degree Level", key: "degree_level" },
    { label: "Tuition (1st year)", key: "tuition_fee" },
    { label: "Duration", key: "duration_months" },
    { label: "IELTS Requirement", key: "ielts_overall" },
    { label: "Available Intakes", key: "intake_labels" },
  ];

  const getValue = (course: CourseCatalogApiItem, path: string) => {
    const parts = path.split(".");
    let val = course;
    for (const part of parts) {
      if (part === "location") {
        return `${course.university.city}, ${course.university.country}`;
      }
      if (part === "tuition_fee") {
        return `${course.tuition_currency} ${course.tuition_fee?.toLocaleString() || "N/A"}`;
      }
      if (part === "duration_months") {
        return course.duration_months ? `${course.duration_months} months` : "N/A";
      }
      if (part === "intake_labels") {
        return course.intake_labels?.join(", ") || "TBA";
      }
      val = val?.[part];
    }
    return val ?? "N/A";
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="px-8 py-6 border-bottom border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Program Comparison</h2>
              <p className="text-slate-500 text-sm">Evaluating {courses.length} selected programs side-by-side</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xl hover:bg-slate-50 transition-colors"
            >
              ×
            </button>
          </header>

          <div className="flex-1 overflow-auto p-8">
            <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(250px,1fr))] gap-x-8">
              {/* Labels Column */}
              <div className="space-y-12 pt-[140px]">
                {metrics.map((m) => (
                  <div key={m.label} className="h-12 flex items-center">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Course Columns */}
              {courses.map((course) => (
                <div key={course.course_id} className="space-y-12">
                  <div className="h-[140px] flex flex-col gap-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-xl font-black text-blue-600">
                      {course.university.name[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 leading-tight line-clamp-2">{course.title}</h3>
                      <p className="text-sm text-blue-600 font-bold">{course.university.name}</p>
                    </div>
                  </div>

                  {metrics.map((m) => (
                    <div key={m.label} className="h-12 flex items-center">
                      <p className="text-slate-900 font-bold">{getValue(course, m.key)}</p>
                    </div>
                  ))}
                  
                  <div className="pt-4 flex gap-2">
                    <button className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98]">
                      Apply
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const payload = await fetchCourseWhatsAppSharePayload(course.course_id);
                          window.open(payload.whatsapp_url, "_blank", "noopener,noreferrer");
                        } catch {
                          const fallback = encodeURIComponent(
                            `Hi, I am comparing programs and am interested in ${course.title} at ${course.university.name}.`
                          );
                          window.open(`https://wa.me/?text=${fallback}`, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
