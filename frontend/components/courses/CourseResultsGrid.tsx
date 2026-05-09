import CourseCard from "./CourseCard";

type CourseResultsGridProps = {
  completionPercentage: number;
};

const allCourses = [
  {
    id: 1,
    title: "Bachelor of Computer Science",
    university: "Deakin University",
    location: "Melbourne, Australia",
    tuition: "AUD 42,000/year",
    duration: "3 years",
    intake: "March, July",
    ielts: "6.5 overall",
    score: 84,
  },
  {
    id: 2,
    title: "Bachelor of Software Engineering (Honours)",
    university: "Deakin University",
    location: "Melbourne, Australia",
    tuition: "AUD 42,000/year",
    duration: "4 years",
    intake: "March, July",
    ielts: "6.5 overall",
    score: 79,
  },
  {
    id: 3,
    title: "Bachelor of Business Analytics",
    university: "Deakin University",
    location: "Melbourne, Australia",
    tuition: "AUD 39,000/year",
    duration: "3 years",
    intake: "March, July, November",
    ielts: "6.5 overall",
    score: 72,
  },
  {
    id: 4,
    title: "Master of Information Technology",
    university: "Monash University",
    location: "Melbourne, Australia",
    tuition: "AUD 46,000/year",
    duration: "2 years",
    intake: "February, July",
    ielts: "6.5 overall",
    score: 90,
  },
  {
    id: 5,
    title: "Bachelor of Cyber Security",
    university: "RMIT University",
    location: "Melbourne, Australia",
    tuition: "AUD 41,000/year",
    duration: "3 years",
    intake: "February, July",
    ielts: "6.5 overall",
    score: 81,
  },
];

export default function CourseResultsGrid({
  completionPercentage,
}: CourseResultsGridProps) {
  const visibleCourses =
    completionPercentage < 20
      ? allCourses
      : completionPercentage < 40
      ? allCourses.slice(0, 4)
      : completionPercentage < 60
      ? allCourses.slice(0, 3)
      : allCourses.slice(0, 2);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Recommended Courses
          </h2>

          <p className="text-sm text-slate-500">
            Sorted by match score, highest first.
          </p>
        </div>

        <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          Filters
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {visibleCourses.map((course) => (
          <CourseCard key={course.id} {...course} />
        ))}
      </div>
    </section>
  );
}