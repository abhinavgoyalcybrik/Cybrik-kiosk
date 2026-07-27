import { StudentJourney } from "@/components/edu/StudentJourney";
import "./preferences-kiosk-v2.css";

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ display?: string | string[] }>;
}) {
  const { display } = await searchParams;
  return <StudentJourney preferenceKiosk={display === "kiosk"} />;
}
