import { motion, AnimatePresence } from "framer-motion";
import CourseCard from "./CourseCard";
import { CourseCardItem } from "@/lib/types";

type CourseResultsGridProps = {
  courses: CourseCardItem[];
  isLoading?: boolean;
  errorMessage?: string | null;
  emptyMessage?: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function CourseResultsGrid({
  courses,
  isLoading = false,
  errorMessage = null,
  emptyMessage = "No programs match your current search.",
}: CourseResultsGridProps) {
  return (
    <section>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="program-grid"
      >
        {isLoading && (
          <p className="status-banner neutral full-row">
            Loading recommendations from backend...
          </p>
        )}

        {errorMessage && (
          <p className="status-banner warning full-row">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && courses.length === 0 && (
          <p className="status-banner neutral full-row">
            {emptyMessage}
          </p>
        )}

        <AnimatePresence mode="popLayout">
          {courses.map((course) => (
            <motion.div
              key={course.id}
              variants={itemVariants}
              layout
            >
              <CourseCard {...course} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
