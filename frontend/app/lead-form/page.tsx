"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchStudentProfileLookup,
  fetchWhatsAppLeadFormContext,
  submitWhatsAppLead,
} from "@/lib/api";
import { StudentProfileLookupResponse } from "@/lib/types";
import "./lead-form.css";

function parseIntOrNull(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseCourseIds(value: string | null): number[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((num) => Number.isInteger(num) && num > 0);
}

export default function LeadFormPage() {
  const params = useSearchParams();
  const studentId = useMemo(() => parseIntOrNull(params.get("student_id")), [params]);
  const courseIds = useMemo(() => parseCourseIds(params.get("course_ids")), [params]);
  const singleCourseId = courseIds.length === 1 ? courseIds[0] : null;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [lookupResult, setLookupResult] = useState<StudentProfileLookupResponse | null>(null);

  useEffect(() => {
    if (!studentId && !singleCourseId) {
      return;
    }

    fetchWhatsAppLeadFormContext({
      student_id: studentId ?? undefined,
      course_id: singleCourseId ?? undefined,
    })
      .then((context) => {
        if (context.student?.name) {
          setName((current) => current || context.student.name);
        }
        if (context.student?.phone) {
          setPhone((current) => current || context.student.phone);
        }
        if (context.student?.email) {
          setEmail((current) => current || context.student.email);
        }
      })
      .catch(() => {
        // keep form usable even when prefill fails
      });
  }, [studentId, singleCourseId]);

  const runLookup = async (options?: { student_id?: number; phone?: string; email?: string }) => {
    setLookupLoading(true);
    try {
      const result = await fetchStudentProfileLookup({
        student_id: options?.student_id,
        phone: options?.phone,
        email: options?.email,
      });
      setLookupResult(result);
      return result;
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setStatusMessage("");
    setIsSuccess(false);

    try {
      const payload = await submitWhatsAppLead({
        name,
        phone,
        email: email || undefined,
        student_id: studentId ?? undefined,
        course_id: singleCourseId ?? undefined,
        source: "whatsapp_shortlist_form",
        lead_form_url: typeof window !== "undefined" ? window.location.href : "",
        metadata: {
          course_ids: courseIds,
        },
      });

      setIsSuccess(true);
      setStatusMessage(
        payload.shortlisted_courses_count > 0
          ? `Details saved. We found ${payload.shortlisted_courses_count} shortlisted course${payload.shortlisted_courses_count === 1 ? "" : "s"} in your profile.`
          : payload.crm_status === "sent"
            ? "Details submitted successfully."
            : "Details saved. CRM sync is queued."
      );
      await runLookup({ student_id: payload.student_profile_id, phone, email });
    } catch {
      setStatusMessage("Could not submit details right now. Please try again.");
      setIsSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFindShortlist = async () => {
    if (!phone.trim() && !email.trim()) {
      setStatusMessage("Enter phone or email to find your shortlist.");
      setIsSuccess(false);
      return;
    }

    try {
      const result = await runLookup({ phone, email });
      if (!result.found) {
        setStatusMessage("No profile found with these details yet.");
        setIsSuccess(false);
        return;
      }

      setIsSuccess(true);
      setStatusMessage(
        (result.shortlisted_courses_count ?? 0) > 0
          ? "Profile found. Here are your shortlisted programs."
          : "Profile found, but no shortlisted courses are saved yet."
      );
    } catch {
      setStatusMessage("Could not fetch shortlist right now. Please try again.");
      setIsSuccess(false);
    }
  };

  return (
    <main className="lead-form-shell">
      <div className="lead-form-layout">
      <div className="lead-form-card">
        <div className="lead-form-brand">Cybrik Edugraph</div>
        <h1 className="lead-form-title">Complete Your Details</h1>
        <p className="lead-form-subtitle">
          Fill this form with the same details you used on Edugraph.
        </p>

        {courseIds.length > 0 ? (
          <p className="lead-form-chip">
            Shortlisted courses selected: {courseIds.length}
          </p>
        ) : null}

        <form className="lead-form-fields" onSubmit={handleSubmit}>
          <label className="lead-field">
            <span className="lead-label">Full name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="lead-input"
              placeholder="Enter your full name"
            />
          </label>

          <label className="lead-field">
            <span className="lead-label">Phone number</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              className="lead-input"
              placeholder="+91..."
            />
          </label>

          <label className="lead-field">
            <span className="lead-label">Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="lead-input"
              placeholder="name@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="lead-submit"
          >
            {submitting ? "Submitting..." : "Submit Details"}
          </button>
          <button
            type="button"
            disabled={lookupLoading}
            className="lead-secondary-submit"
            onClick={handleFindShortlist}
          >
            {lookupLoading ? "Finding..." : "Find My Shortlist"}
          </button>
        </form>

        {statusMessage ? (
          <p className={isSuccess ? "lead-status success" : "lead-status error"}>
            {statusMessage}
          </p>
        ) : null}
      </div>
      <section className="lead-results-card">
        <div className="lead-results-header">
          <p className="lead-results-kicker">Student Snapshot</p>
          <h2 className="lead-results-title">Your Shortlisted Programs</h2>
          <p className="lead-results-subtitle">
            Once we match your profile, we’ll show the courses already saved in our database.
          </p>
        </div>

        {lookupResult?.found && lookupResult.student ? (
          <>
            <div className="lead-profile-summary">
              <div>
                <p className="lead-profile-name">{lookupResult.student.name}</p>
                <p className="lead-profile-meta">
                  {lookupResult.student.phone || "Phone not available"}
                  {lookupResult.student.email ? `  |  ${lookupResult.student.email}` : ""}
                </p>
              </div>
              <div className="lead-shortlist-count">
                <span>{lookupResult.shortlisted_courses_count ?? 0}</span>
                <small>saved courses</small>
              </div>
            </div>

            {(lookupResult.shortlisted_courses_count ?? 0) > 0 && lookupResult.shortlisted_courses ? (
              <div className="lead-shortlist-grid">
                {lookupResult.shortlisted_courses.map((course) => (
                  <article key={course.course_id} className="lead-shortlist-item">
                    <div className="lead-shortlist-top">
                      <p className="lead-shortlist-university">{course.university.name}</p>
                      <span className="lead-shortlist-level">{course.degree_level}</span>
                    </div>
                    <h3 className="lead-shortlist-course-title">{course.title}</h3>
                    <div className="lead-shortlist-meta">
                      <span>{course.university.city}, {course.university.country}</span>
                      <span>
                        {course.tuition_fee !== null
                          ? `${course.tuition_currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(course.tuition_fee)}`
                          : "Check tuition"}
                      </span>
                    </div>
                    <div className="lead-shortlist-intakes">
                      {course.intake_labels.length > 0 ? course.intake_labels.join(", ") : "Intakes to be confirmed"}
                    </div>
                    <a href={`/course/${course.course_id}`} className="lead-shortlist-link">
                      View program
                    </a>
                  </article>
                ))}
              </div>
            ) : (
              <div className="lead-empty-state">
                <h3>No shortlisted courses yet</h3>
                <p>
                  We found your profile, but there are no saved courses attached to it right now.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="lead-empty-state">
            <h3>No profile loaded yet</h3>
            <p>
              Submit your details or use “Find My Shortlist” to see what’s already saved for you.
            </p>
          </div>
        )}
      </section>
      </div>
    </main>
  );
}
