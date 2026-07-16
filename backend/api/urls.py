from django.urls import path
from .views import (
    # Existing
    courses_catalog,
    course_detail,
    student_recommendations,
    platform_stats,
    course_whatsapp_share_payload,
    whatsapp_lead_form_context,
    student_profile_lookup,
    whatsapp_lead_capture,
    shortlist_whatsapp_share,
    # New Kiosk Session APIs
    session_start,
    session_autosave,
    session_recommendations,
    session_otp_send,
    session_otp_verify,
    session_select_courses,
    session_whatsapp_share,
)

urlpatterns = [
    # ── Existing APIs ──────────────────────────────────────────
    path("stats/", platform_stats, name="platform-stats"),
    path("courses/", courses_catalog, name="courses-catalog"),
    path("courses/<int:course_id>/", course_detail, name="course-detail"),
    path("courses/<int:course_id>/whatsapp-share/", course_whatsapp_share_payload, name="course-whatsapp-share"),
    path("leads/whatsapp/form-context/", whatsapp_lead_form_context, name="whatsapp-lead-form-context"),
    path("students/lookup/", student_profile_lookup, name="student-profile-lookup"),
    path("leads/whatsapp/", whatsapp_lead_capture, name="whatsapp-lead-capture"),
    path("shortlist/whatsapp-share/", shortlist_whatsapp_share, name="shortlist-whatsapp-share"),
    path("students/<int:student_id>/recommendations/", student_recommendations, name="student-recommendations"),

    # ── New Kiosk Session APIs ─────────────────────────────────
    path("session/start/", session_start, name="session-start"),
    path("session/<uuid:session_key>/autosave/", session_autosave, name="session-autosave"),
    path("session/<uuid:session_key>/recommendations/", session_recommendations, name="session-recommendations"),
    path("session/<uuid:session_key>/otp/send/", session_otp_send, name="session-otp-send"),
    path("session/<uuid:session_key>/otp/verify/", session_otp_verify, name="session-otp-verify"),
    path("session/<uuid:session_key>/select-courses/", session_select_courses, name="session-select-courses"),
    path("session/<uuid:session_key>/whatsapp-share/", session_whatsapp_share, name="session-whatsapp-share"),
]
 