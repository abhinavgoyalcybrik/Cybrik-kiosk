import { Suspense } from "react";
import "./lead-form.css";
import LeadFormContent from "./LeadFormContent";

export default function LeadFormPage() {
  return (
    <Suspense>
      <LeadFormContent />
    </Suspense>
  );
}
