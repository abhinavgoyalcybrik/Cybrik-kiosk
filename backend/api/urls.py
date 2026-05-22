from django.urls import path
from .views import (
    courses_catalog,
    course_detail,
    student_recommendations,
    platform_stats,
    course_whatsapp_share_payload,
    whatsapp_lead_form_context,
    student_profile_lookup,
    whatsapp_lead_capture,
    shortlist_whatsapp_share,
    shortlist_pdf,
)

urlpatterns = [
    path("stats/", platform_stats, name="platform-stats"),
    path("courses/", courses_catalog, name="courses-catalog"),
    path("courses/<int:course_id>/", course_detail, name="course-detail"),
    path(
        "courses/<int:course_id>/whatsapp-share/",
        course_whatsapp_share_payload,
        name="course-whatsapp-share",
    ),
    path(
        "leads/whatsapp/form-context/",
        whatsapp_lead_form_context,
        name="whatsapp-lead-form-context",
    ),
    path("students/lookup/", student_profile_lookup, name="student-profile-lookup"),
    path("leads/whatsapp/", whatsapp_lead_capture, name="whatsapp-lead-capture"),
    path("shortlist/whatsapp-share/", shortlist_whatsapp_share, name="shortlist-whatsapp-share"),
    path("shortlist/pdf/", shortlist_pdf, name="shortlist-pdf"),
    path(
        "students/<int:student_id>/recommendations/",
        student_recommendations,
        name="student-recommendations"
    ),
]
