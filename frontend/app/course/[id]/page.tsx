import type { Metadata } from "next";
import CourseDetailPage from "@/components/course/CourseDetailPage";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `View Course ${id} | Cybrik Solutions`,
    description: "Explore course fees, intakes, entry requirements, scholarships, campus details and application guidance.",
    alternates: { canonical: `/course/${id}` },
    openGraph: {
      title: "Course details | Cybrik Solutions",
      description: "Compare course information and take the next step with Cybrik Solutions.",
      images: ["/student-campus-1.webp"],
    },
  };
}

export default async function CoursePage({ params }: Props) {
  const { id } = await params;
  return <CourseDetailPage courseId={Number(id)} />;
}
