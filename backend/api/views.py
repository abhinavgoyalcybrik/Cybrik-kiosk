from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from django.utils import timezone
from functools import lru_cache
from urllib.error import URLError, HTTPError
from urllib.parse import quote_plus, urljoin
from urllib.request import Request, urlopen
from io import BytesIO
from datetime import timedelta
import json
import logging
import os
import re
import random

from .models import (
    CountryDocument,
    CountryDocumentType,
    StudentProfile,
    University,
    Course,
    WhatsAppLead,
    ShortlistItem,
    KioskSession,
    SessionOTP,
    StudentDocumentRequest,
    DocumentConversationLog,
)
from services.meta_whatsapp_service import MetaWhatsAppService
from services.eligibility import get_eligible_courses
from services.explanations import generate_explanations
from services.risk_flags import generate_risk_flags
from services.profile import compute_recommendation_confidence

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════


def get_optional_relation(instance, relation_name):
    try:
        return getattr(instance, relation_name)
    except ObjectDoesNotExist:
        return None


def serialize_intakes(course):
    labels = []
    for intake in course.intakes.all():
        month = intake.intake_month.strip() if intake.intake_month else ""
        if not month:
            continue
        label = month
        if intake.intake_year:
            label = f"{label} {intake.intake_year}"
        if label not in labels:
            labels.append(label)
    return labels


def serialize_course_catalog_item(course):
    fee = get_optional_relation(course, "fee")
    english_requirement = get_optional_relation(course, "english_requirement")
    return {
        "course_id": course.id,
        "title": course.title,
        "course_url": course.course_url,
        "university": {
            "name": course.university.name,
            "official_website": course.university.official_website,
            "country": course.university.country,
            "city": course.university.city,
        },
        "degree_level": course.degree_level,
        "field_of_study": course.field_of_study,
        "duration_months": course.duration_months,
        "tuition_fee": (
            float(fee.tuition_fee) if fee and fee.tuition_fee is not None else None
        ),
        "tuition_currency": fee.currency if fee else "",
        "fee_period": fee.fee_period if fee else "",
        "application_fee": (
            float(course.university.application_fee)
            if course.university.application_fee is not None
            else None
        ),
        "application_fee_currency": course.university.application_fee_currency or "",
        "intake_labels": serialize_intakes(course),
        "ielts_overall": (
            english_requirement.ielts_overall
            if english_requirement and english_requirement.ielts_overall is not None
            else None
        ),
    }


def serialize_student_profile_summary(student):
    return {
        "id": student.id,
        "name": student.name,
        "email": student.email,
        "phone": student.phone,
        "preferred_countries": student.preferred_countries,
        "preferred_cities": student.preferred_cities,
        "preferred_intake": student.preferred_intake,
        "highest_qualification": student.highest_qualification,
        "academic_stream": student.academic_stream,
        "academic_major": student.academic_major,
        "percentage": student.percentage,
        "ielts_overall": student.ielts_overall,
        "created_at": student.created_at.isoformat(),
        "updated_at": student.updated_at.isoformat(),
    }


def serialize_course_detailed(course):
    fee = get_optional_relation(course, "fee")
    english_requirement = get_optional_relation(course, "english_requirement")
    university = course.university
    return {
        "course_id": course.id,
        "title": course.title,
        "university": {
            "name": university.name,
            "official_website": university.official_website,
            "country": university.country,
            "state_province": university.state_province,
            "city": university.city,
            "campus_locations": university.campus_locations,
            "institution_type": university.institution_type,
            "ownership_type": university.ownership_type,
            "qs_ranking": university.qs_ranking,
            "national_ranking": university.national_ranking,
            "ranking_notes": university.ranking_notes,
            "application_fee": (
                float(university.application_fee)
                if university.application_fee is not None
                else None
            ),
            "application_fee_currency": university.application_fee_currency or "",
            "scholarship_available": university.scholarship_available,
            "accommodation_available": university.accommodation_available,
            "estimated_monthly_living_cost": (
                float(university.estimated_monthly_living_cost)
                if university.estimated_monthly_living_cost
                else None
            ),
            "living_cost_currency": university.living_cost_currency,
        },
        "degree_level": course.degree_level,
        "field_of_study": course.field_of_study,
        "specialization": course.specialization,
        "duration_months": course.duration_months,
        "mode": course.mode,
        "campus": course.campus,
        "course_url": course.course_url,
        "course_summary": course.course_summary,
        "intake_labels": serialize_intakes(course),
        "ielts_overall": (
            english_requirement.ielts_overall
            if english_requirement and english_requirement.ielts_overall is not None
            else None
        ),
    }


@lru_cache(maxsize=512)
def fetch_course_gallery_images(course_url, university_id, university_website):
    db_images = list(
        University.objects.filter(id=university_id).values_list(
            "gallery_images__image_url", flat=True
        )
    )
    db_images = [image for image in db_images if image]
    if db_images:
        return db_images

    source_url = (course_url or "").strip() or (university_website or "").strip()
    if not source_url:
        return []

    try:
        request = Request(
            source_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            },
        )
        with urlopen(request, timeout=10) as response:
            content_type = response.headers.get("Content-Type", "")
            if "text/html" not in content_type:
                return []
            html = response.read().decode("utf-8", errors="ignore")
    except Exception:
        return []

    urls = []
    meta_patterns = [
        r'<meta[^>]+property=["\']og:image[^"\']*["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+name=["\']twitter:image[^"\']*["\'][^>]+content=["\']([^"\']+)["\']',
    ]
    for pattern in meta_patterns:
        for match in re.findall(pattern, html, flags=re.IGNORECASE):
            absolute = urljoin(source_url, match.strip())
            if is_valid_gallery_image_url(absolute):
                urls.append(absolute)

    for match in re.findall(
        r"<img[^>]+src=[\"']([^\"']+)[\"']", html, flags=re.IGNORECASE
    ):
        absolute = urljoin(source_url, match.strip())
        if is_valid_gallery_image_url(absolute):
            urls.append(absolute)

    deduped = []
    seen = set()
    for image_url in urls:
        lowered = image_url.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        deduped.append(image_url)
        if len(deduped) >= 8:
            break

    return deduped


def is_valid_gallery_image_url(url):
    if not url.lower().startswith(("http://", "https://")):
        return False
    lowered = url.lower()
    blocked_tokens = ["logo", "favicon", "icon", "sprite", "avatar", "badge", ".svg"]
    if any(token in lowered for token in blocked_tokens):
        return False
    allowed_extensions = (".jpg", ".jpeg", ".png", ".webp", ".avif")
    if any(ext in lowered for ext in allowed_extensions):
        return True
    return "image" in lowered or "photo" in lowered


def format_duration(duration_months):
    if duration_months is None:
        return "Not specified"
    if duration_months % 12 == 0:
        years = duration_months // 12
        return f"{years} year{'s' if years != 1 else ''}"
    return f"{duration_months} months"


def format_currency(amount, currency, suffix=""):
    if amount is None or amount <= 0:
        return "Check portal"
    formatted = f"{float(amount):,.2f}"
    currency_label = f"{currency} " if currency else ""
    return f"{currency_label}{formatted}{suffix}".strip()


def build_whatsapp_course_message(course, student=None, lead_form_url=""):
    fee = get_optional_relation(course, "fee")
    english_requirement = get_optional_relation(course, "english_requirement")
    intakes = serialize_intakes(course)
    lines = [
        "Hi, I want details for this program from Cybrik Edugraph:",
        f"Program: {course.title}",
        f"University: {course.university.name}",
        f"Location: {course.university.city}, {course.university.country}",
        f"Program level: {course.degree_level or 'Not specified'}",
        f"Duration: {format_duration(course.duration_months)}",
        f"Tuition: {format_currency(fee.tuition_fee if fee else None, fee.currency if fee else '', ' / First Year')}",
        "Application fee: "
        + format_currency(
            course.university.application_fee,
            course.university.application_fee_currency,
        ),
        "IELTS: "
        + str(
            english_requirement.ielts_overall
            if english_requirement and english_requirement.ielts_overall is not None
            else "N/A"
        ),
        f"Intakes: {', '.join(intakes) if intakes else 'TBA'}",
    ]
    if course.course_url:
        lines.append(f"Course link: {course.course_url}")
    if lead_form_url:
        lines.append(f"Complete profile form: {lead_form_url}")
    if student:
        if student.phone:
            lines.append(f"Student phone: {student.phone}")
        if student.email:
            lines.append(f"Student email: {student.email}")
        lines.append(f"Student name: {student.name}")
    return "\n".join(lines)


def crm_webhook_url():
    return (
        os.getenv("CRM_WEBHOOK_URL") or getattr(settings, "CRM_WEBHOOK_URL", "")
    ).strip()


def send_lead_to_crm(lead):
    webhook = crm_webhook_url()
    if not webhook:
        return {
            "status": WhatsAppLead.CRM_STATUS_PENDING,
            "response": "CRM webhook not configured",
        }
    payload = {
        "lead_id": lead.id,
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "source": lead.source,
        "student_id": lead.student_profile_id,
        "course_id": lead.course_id,
        "lead_form_url": lead.lead_form_url,
        "whatsapp_message": lead.whatsapp_message,
        "metadata": lead.metadata,
    }
    try:
        request = Request(
            webhook,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=8) as response:
            body = response.read().decode("utf-8", errors="ignore")
            if 200 <= response.status < 300:
                return {"status": WhatsAppLead.CRM_STATUS_SENT, "response": body[:2000]}
            return {"status": WhatsAppLead.CRM_STATUS_FAILED, "response": body[:2000]}
    except (HTTPError, URLError) as exc:
        logger.warning("CRM push failed for lead=%s: %s", lead.id, exc)
        return {"status": WhatsAppLead.CRM_STATUS_FAILED, "response": str(exc)}
    except Exception as exc:
        logger.exception("Unexpected CRM push failure for lead=%s", lead.id)
        return {"status": WhatsAppLead.CRM_STATUS_FAILED, "response": str(exc)}


def parse_int_or_none(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def is_valid_phone(phone):
    pattern = r"^[+\d][\d\s\-()]{6,}$"
    return re.match(pattern, phone) is not None


def parse_course_ids(raw_ids):
    if not raw_ids:
        return []
    if isinstance(raw_ids, list):
        values = raw_ids
    elif isinstance(raw_ids, str):
        values = [item.strip() for item in raw_ids.split(",")]
    else:
        return []
    ids = []
    for value in values:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            continue
        if parsed > 0 and parsed not in ids:
            ids.append(parsed)
    return ids


def find_student_profile(student_id=None, phone="", email="", name=""):
    if student_id is not None:
        return StudentProfile.objects.filter(id=student_id).first(), False
    normalized_phone = (phone or "").strip()
    normalized_email = (email or "").strip().lower()
    normalized_name = (name or "").strip()
    student = None
    if normalized_phone:
        student = StudentProfile.objects.filter(phone=normalized_phone).first()
    if student is None and normalized_email:
        student = StudentProfile.objects.filter(email__iexact=normalized_email).first()
    if student is None and normalized_name and normalized_phone:
        student = StudentProfile.objects.filter(
            name__iexact=normalized_name, phone=normalized_phone
        ).first()
    if student is not None:
        fields_to_update = []
        if normalized_name and student.name != normalized_name:
            student.name = normalized_name
            fields_to_update.append("name")
        if normalized_phone and student.phone != normalized_phone:
            student.phone = normalized_phone
            fields_to_update.append("phone")
        if normalized_email and student.email != normalized_email:
            student.email = normalized_email
            fields_to_update.append("email")
        if fields_to_update:
            fields_to_update.append("updated_at")
            student.save(update_fields=fields_to_update)
        return student, False
    student = StudentProfile.objects.create(
        name=normalized_name or "Edugraph Student",
        phone=normalized_phone,
        email=normalized_email,
    )
    return student, True


def sync_student_shortlist(student, course_ids):
    if not course_ids:
        return []
    courses = get_shortlisted_courses(course_ids=course_ids)
    if not courses:
        return []
    existing_ids = set(
        ShortlistItem.objects.filter(
            student_profile=student,
            course_id__in=[course.id for course in courses],
        ).values_list("course_id", flat=True)
    )
    new_items = [
        ShortlistItem(student_profile=student, course=course)
        for course in courses
        if course.id not in existing_ids
    ]
    if new_items:
        ShortlistItem.objects.bulk_create(new_items)
    return get_shortlisted_courses(course_ids=[], student_id=student.id)


def build_student_lookup_payload(student):
    shortlisted_courses = get_shortlisted_courses(course_ids=[], student_id=student.id)
    return {
        "student": serialize_student_profile_summary(student),
        "shortlisted_courses_count": len(shortlisted_courses),
        "shortlisted_courses": [
            serialize_course_catalog_item(course) for course in shortlisted_courses
        ],
    }


def get_shortlisted_courses(course_ids, student_id=None):
    if course_ids:
        queryset = (
            Course.objects.select_related("university", "fee", "english_requirement")
            .prefetch_related("intakes")
            .filter(id__in=course_ids)
        )
        by_id = {course.id: course for course in queryset}
        return [by_id[course_id] for course_id in course_ids if course_id in by_id]
    if student_id is None:
        return []
    shortlist_ids = list(
        StudentProfile.objects.filter(id=student_id).values_list(
            "shortlist_items__course_id", flat=True
        )
    )
    shortlist_ids = [course_id for course_id in shortlist_ids if course_id]
    if not shortlist_ids:
        return []
    queryset = (
        Course.objects.select_related("university", "fee", "english_requirement")
        .prefetch_related("intakes")
        .filter(id__in=shortlist_ids)
    )
    by_id = {course.id: course for course in queryset}
    return [by_id[course_id] for course_id in shortlist_ids if course_id in by_id]


def build_shortlist_whatsapp_message(courses, lead_form_url="", pdf_url=""):
    lines = ["Hi, I shortlisted these programs on Cybrik Edugraph:"]
    for index, course in enumerate(courses[:12], start=1):
        fee = get_optional_relation(course, "fee")
        intakes = serialize_intakes(course)
        lines.extend(
            [
                f"{index}. {course.title}",
                f"   University: {course.university.name}",
                f"   Location: {course.university.city}, {course.university.country}",
                f"   Tuition: {format_currency(fee.tuition_fee if fee else None, fee.currency if fee else '', ' / First Year')}",
                f"   Intakes: {', '.join(intakes) if intakes else 'TBA'}",
                f"   Course link: {course.course_url or 'Check portal'}",
            ]
        )
    if len(courses) > 12:
        lines.append(f"...and {len(courses) - 12} more programs in the PDF.")
    if pdf_url:
        lines.append(f"Complete shortlisted PDF: {pdf_url}")
    if lead_form_url:
        lines.append(f"Student details form: {lead_form_url}")
    return "\n".join(lines)


def generate_shortlist_pdf(courses, generated_for=""):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
    except Exception as exc:
        raise RuntimeError("PDF generation dependency missing") from exc

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    x = 16 * mm
    y = height - 20 * mm

    def new_page():
        nonlocal y
        pdf.showPage()
        y = height - 20 * mm

    def draw_line(text, font="Helvetica", size=11, indent=0, gap=6):
        nonlocal y
        if y < 20 * mm:
            new_page()
        pdf.setFont(font, size)
        pdf.drawString(x + indent, y, text)
        y -= gap * mm

    pdf.setTitle("Cybrik Shortlisted Courses")
    draw_line(
        "Cybrik Edugraph - Shortlisted Courses", font="Helvetica-Bold", size=16, gap=8
    )
    if generated_for:
        draw_line(f"Generated for: {generated_for}", size=10, gap=5)
    draw_line(f"Total courses: {len(courses)}", size=10, gap=7)

    for idx, course in enumerate(courses, start=1):
        fee = get_optional_relation(course, "fee")
        english_requirement = get_optional_relation(course, "english_requirement")
        intakes = serialize_intakes(course)
        if y < 45 * mm:
            new_page()
        draw_line(f"{idx}. {course.title}", font="Helvetica-Bold", size=12, gap=6)
        draw_line(
            f"University: {course.university.name}", indent=5 * mm, size=10, gap=5
        )
        draw_line(
            f"Location: {course.university.city}, {course.university.country}",
            indent=5 * mm,
            size=10,
            gap=5,
        )
        draw_line(
            f"Duration: {format_duration(course.duration_months)}",
            indent=5 * mm,
            size=10,
            gap=5,
        )
        draw_line(
            "Tuition: "
            + format_currency(
                fee.tuition_fee if fee else None, fee.currency if fee else "", " / Year"
            ),
            indent=5 * mm,
            size=10,
            gap=5,
        )

    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


@api_view(["GET"])
def course_detail(request, course_id):
    """Retrieve all details for a specific course."""
    try:
        course = (
            Course.objects.select_related("university", "fee", "english_requirement")
            .prefetch_related("intakes")
            .get(id=course_id)
        )
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)
    return Response(serialize_course_detailed(course))


@api_view(["GET"])
def platform_stats(request):
    """Public endpoint returning live platform statistics."""
    return Response(
        {
            "universities": University.objects.count(),
            "courses": Course.objects.count(),
            "countries": University.objects.values("country").distinct().count(),
            "students": StudentProfile.objects.count(),
        }
    )


@api_view(["GET"])
def courses_catalog(request):
    courses = (
        Course.objects.select_related("university", "fee", "english_requirement")
        .prefetch_related("intakes")
        .order_by("university__name", "title")
    )
    data = [serialize_course_catalog_item(course) for course in courses]
    return Response({"count": len(data), "courses": data})


@api_view(["GET"])
def course_whatsapp_share_payload(request, course_id):
    try:
        course = (
            Course.objects.select_related("university", "fee", "english_requirement")
            .prefetch_related("intakes")
            .get(id=course_id)
        )
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)

    student = None
    student_id = parse_int_or_none(request.query_params.get("student_id"))
    if request.query_params.get("student_id") and student_id is None:
        return Response({"error": "student_id must be a valid integer"}, status=400)
    if student_id is not None:
        try:
            student = StudentProfile.objects.get(id=student_id)
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)

    lead_form_url = (request.query_params.get("lead_form_url") or "").strip()
    if not lead_form_url:
        lead_form_url = request.build_absolute_uri(f"/lead-form?course_id={course.id}")

    message = build_whatsapp_course_message(
        course, student=student, lead_form_url=lead_form_url
    )
    encoded = quote_plus(message)
    return Response(
        {
            "course_id": course.id,
            "student_id": student.id if student else None,
            "lead_form_url": lead_form_url,
            "message": message,
            "whatsapp_url": f"https://wa.me/?text={encoded}",
            "whatsapp_web_url": f"https://api.whatsapp.com/send?text={encoded}",
        }
    )


@api_view(["GET"])
def whatsapp_lead_form_context(request):
    student = None
    course = None
    student_id = parse_int_or_none(request.query_params.get("student_id"))
    if request.query_params.get("student_id") and student_id is None:
        return Response({"error": "student_id must be a valid integer"}, status=400)
    if student_id is not None:
        try:
            student = StudentProfile.objects.get(id=student_id)
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)

    course_id = parse_int_or_none(request.query_params.get("course_id"))
    if request.query_params.get("course_id") and course_id is None:
        return Response({"error": "course_id must be a valid integer"}, status=400)
    if course_id is not None:
        try:
            course = (
                Course.objects.select_related(
                    "university", "fee", "english_requirement"
                )
                .prefetch_related("intakes")
                .get(id=course_id)
            )
        except Course.DoesNotExist:
            return Response({"error": "Course not found"}, status=404)

    return Response(
        {
            "student": {
                "id": student.id if student else None,
                "name": student.name if student else "",
                "phone": student.phone if student else "",
                "email": student.email if student else "",
            },
            "course": (
                {
                    "id": course.id,
                    "title": course.title,
                    "university_name": course.university.name,
                }
                if course
                else None
            ),
        }
    )


@api_view(["GET"])
def student_profile_lookup(request):
    phone = str(request.query_params.get("phone", "")).strip()
    email = str(request.query_params.get("email", "")).strip()
    student_id = parse_int_or_none(request.query_params.get("student_id"))

    if student_id is None and not phone and not email:
        return Response(
            {"error": "phone, email, or student_id is required"}, status=400
        )

    student = None
    if student_id is not None:
        student = StudentProfile.objects.filter(id=student_id).first()
    if student is None and phone:
        student = StudentProfile.objects.filter(phone=phone).first()
    if student is None and email:
        student = StudentProfile.objects.filter(email__iexact=email).first()

    if student is None:
        return Response({"found": False, "message": "No profile found"}, status=200)

    return Response({"found": True, **build_student_lookup_payload(student)})


@api_view(["POST"])
def whatsapp_lead_capture(request):
    data = request.data or {}
    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    email = str(data.get("email", "")).strip()
    source = str(data.get("source", "whatsapp")).strip() or "whatsapp"
    lead_form_url = str(data.get("lead_form_url", "")).strip()
    whatsapp_message = str(data.get("whatsapp_message", "")).strip()
    metadata = data.get("metadata", {})

    if not name:
        return Response({"error": "name is required"}, status=400)
    if not phone:
        return Response({"error": "phone is required"}, status=400)
    if not is_valid_phone(phone):
        return Response({"error": "phone format is invalid"}, status=400)
    if metadata is None:
        metadata = {}
    if not isinstance(metadata, dict):
        return Response({"error": "metadata must be an object"}, status=400)

    student_id = parse_int_or_none(data.get("student_id"))
    if data.get("student_id") not in (None, "") and student_id is None:
        return Response({"error": "student_id must be a valid integer"}, status=400)
    course_ids = parse_course_ids(metadata.get("course_ids"))

    student, created_profile = find_student_profile(
        student_id=student_id, phone=phone, email=email, name=name
    )

    course = None
    course_id = parse_int_or_none(data.get("course_id"))
    if data.get("course_id") not in (None, "") and course_id is None:
        return Response({"error": "course_id must be a valid integer"}, status=400)
    if course_id is not None:
        try:
            course = Course.objects.select_related(
                "university", "fee", "english_requirement"
            ).get(id=course_id)
        except Course.DoesNotExist:
            return Response({"error": "Course not found"}, status=404)

    if not whatsapp_message and course is not None:
        whatsapp_message = build_whatsapp_course_message(
            course, student=student, lead_form_url=lead_form_url
        )

    shortlisted_courses = sync_student_shortlist(student, course_ids)

    lead = WhatsAppLead.objects.create(
        name=name,
        phone=phone,
        email=email,
        student_profile=student,
        course=course,
        source=source,
        lead_form_url=lead_form_url,
        whatsapp_message=whatsapp_message,
        metadata=metadata,
    )

    crm_result = send_lead_to_crm(lead)
    lead.crm_status = crm_result["status"]
    lead.crm_response = crm_result["response"]
    lead.save(update_fields=["crm_status", "crm_response", "updated_at"])

    return Response(
        {
            "lead_id": lead.id,
            "student_profile_id": student.id,
            "created_student_profile": created_profile,
            "crm_status": lead.crm_status,
            "crm_response": lead.crm_response,
            "shortlisted_courses_count": len(shortlisted_courses),
            "shortlisted_courses": [
                serialize_course_catalog_item(item) for item in shortlisted_courses
            ],
        },
        status=201,
    )


@api_view(["GET"])
def shortlist_pdf(request):
    course_ids = parse_course_ids(request.query_params.get("course_ids", ""))
    student_id = parse_int_or_none(request.query_params.get("student_id"))
    courses = get_shortlisted_courses(course_ids=course_ids, student_id=student_id)
    if not courses:
        return Response({"error": "No shortlisted courses found"}, status=400)

    student = None
    if student_id is not None:
        student = StudentProfile.objects.filter(id=student_id).first()

    try:
        pdf_bytes = generate_shortlist_pdf(
            courses, generated_for=student.name if student else ""
        )
    except RuntimeError as exc:
        return Response({"error": str(exc)}, status=500)

    from django.http import HttpResponse

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = (
        'attachment; filename="cybrik-shortlisted-courses.pdf"'
    )
    return response


@api_view(["POST"])
def shortlist_whatsapp_share(request):
    payload = request.data or {}
    course_ids = parse_course_ids(payload.get("course_ids"))
    student_id = parse_int_or_none(payload.get("student_id"))
    lead_form_url = str(payload.get("lead_form_url", "")).strip()

    courses = get_shortlisted_courses(course_ids=course_ids, student_id=student_id)
    if not courses:
        return Response({"error": "No shortlisted courses provided"}, status=400)

    ids_csv = ",".join(str(course.id) for course in courses)
    pdf_url = request.build_absolute_uri(
        f"/api/shortlist/pdf/?course_ids={ids_csv}"
        + (f"&student_id={student_id}" if student_id is not None else "")
    )
    if not lead_form_url:
        lead_form_url = request.build_absolute_uri(
            "/lead-form?course_ids="
            + ids_csv
            + (f"&student_id={student_id}" if student_id is not None else "")
        )

    message = build_shortlist_whatsapp_message(
        courses=courses, lead_form_url=lead_form_url, pdf_url=pdf_url
    )
    encoded = quote_plus(message)
    return Response(
        {
            "count": len(courses),
            "course_ids": [course.id for course in courses],
            "pdf_download_url": pdf_url,
            "lead_form_url": lead_form_url,
            "message": message,
            "whatsapp_url": f"https://wa.me/?text={encoded}",
            "whatsapp_web_url": f"https://api.whatsapp.com/send?text={encoded}",
        }
    )


@api_view(["GET"])
def student_recommendations(request, student_id):
    try:
        student = StudentProfile.objects.get(id=student_id)
    except StudentProfile.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    results = get_eligible_courses(student)
    preferred_countries = [
        c.lower().strip() for c in (student.preferred_countries or [])
    ]
    if preferred_countries:
        results = [
            r
            for r in results
            if r["course"].university.country.lower().strip() in preferred_countries
        ]

    results = sorted(results, key=lambda x: x["score"]["final_score"], reverse=True)
    confidence = compute_recommendation_confidence(student)
    data = []
    for r in results:
        course = r["course"]
        score_result = r["score"]
        score_breakdown = score_result["breakdown"]
        explanations = generate_explanations(
            student=student,
            course=course,
            eligibility_result=r,
            score_breakdown=score_breakdown,
        )
        risk_flags = generate_risk_flags(
            student=student,
            course=course,
            eligibility_result=r,
            score_breakdown=score_breakdown,
        )
        data.append(
            {
                **serialize_course_catalog_item(course),
                "status": r["status"],
                "match_percentage": round(score_result["final_score"], 1),
                "score": score_result["final_score"],
                "raw_score": score_result["raw_score"],
                "max_raw_score": score_result["max_raw_score"],
                "score_breakdown": score_breakdown,
                "explanations": explanations,
                "risk_flags": risk_flags,
                "reasons": r["reasons"],
            }
        )

    return Response(
        {
            "student": {
                "id": student.id,
                "name": student.name,
                "highest_qualification": student.highest_qualification,
                "academic_stream": student.academic_stream,
                "percentage": student.percentage,
                "ielts_overall": student.ielts_overall,
            },
            "active_country_filter": preferred_countries,
            "recommendation_confidence": confidence,
            "recommendations": data,
        }
    )


# ═══════════════════════════════════════════════════════════════════════════════
# KIOSK SESSION ENDPOINTS 
# ═══════════════════════════════════════════════════════════════════════════════


@api_view(["POST"])
def session_start(request):
    """
    Step 1: Student enters Name + Email + Phone → session created

    POST /api/kiosk/session/start/
    {
        "name": "Rajveer Singh",
        "email": "rajveer@gmail.com",
        "phone": "919876543210"
    }
    """
    name = str(request.data.get("name", "")).strip()
    email = str(request.data.get("email", "")).strip()
    phone = str(request.data.get("phone", "")).strip()

    if not name:
        return Response({"error": "name is required"}, status=400)
    if not phone:
        return Response({"error": "phone is required"}, status=400)
    if not is_valid_phone(phone):
        return Response({"error": "phone format is invalid"}, status=400)

    session = KioskSession.objects.create(
        phone=phone,
        profile_data={"name": name, "email": email, "phone": phone},
    )

    return Response(
        {
            "session_key": str(session.session_key),
            "phone": session.phone,
            "name": name,
            "email": email,
            "status": session.status,
            "created_at": session.created_at.isoformat(),
        },
        status=201,
    )


@api_view(["POST"])
def session_otp_send(request, session_key):
    """Send OTP via Meta WhatsApp"""
    from services.meta_whatsapp_service import MetaWhatsAppService

    try:
        session = KioskSession.objects.get(session_key=session_key)
    except KioskSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)

    otp_code = str(random.randint(100000, 999999))
    expires_at = timezone.now() + timedelta(minutes=5)

    SessionOTP.objects.filter(session=session).delete()

    otp_obj = SessionOTP.objects.create(
        session=session,
        otp_code=otp_code,
        expires_at=expires_at,
    )

    profile_data = session.profile_data or {}
    student_name = profile_data.get("name", "Student")
    
    meta_service = MetaWhatsAppService()
    message = f"Your Cybrik OTP is: {otp_code}\nValid for 5 minutes. Do not share with anyone."
    
    meta_result = meta_service.send_text_message(session.phone, message)

    if not meta_result.get("success"):
        logger.error(f"Meta WhatsApp OTP send failed: {meta_result}")
        return Response({
            "success": False,
            "error": "Failed to send OTP. Please try again.",
            "details": meta_result.get("error", "")
        }, status=500)

    return Response({
        "success": True,
        "message": "OTP sent to WhatsApp",
        "session_key": str(session.session_key),
        "phone": session.phone,
        "expires_in_minutes": 5,
    }, status=200)


@api_view(["POST"])
def session_otp_verify(request, session_key):
    """
    Step 3: Verify OTP → mark session verified

    POST /api/kiosk/session/{session_key}/otp/verify/
    {
        "otp_code": "123456"
    }
    """
    try:
        session = KioskSession.objects.get(session_key=session_key)
    except KioskSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)

    otp_input = str(request.data.get("otp_code", "")).strip()
    if not otp_input:
        return Response({"error": "otp_code is required"}, status=400)

    # Get latest unverified OTP
    otp_obj = (
        SessionOTP.objects.filter(session=session, is_verified=False)
        .order_by("-created_at")
        .first()
    )
    if not otp_obj:
        return Response(
            {"error": "No OTP found. Please request a new one."}, status=400
        )

    # Check expiry
    if timezone.now() > otp_obj.expires_at:
        return Response({"error": "OTP expired. Please request a new one."}, status=400)

    # Check attempts
    otp_obj.attempts += 1
    if otp_obj.attempts > 5:
        otp_obj.save(update_fields=["attempts"])
        return Response(
            {"error": "Too many attempts. Please request a new OTP."}, status=400
        )

    # Verify OTP
    if otp_obj.otp_code != otp_input:
        otp_obj.save(update_fields=["attempts"])
        attempts_left = 5 - otp_obj.attempts
        return Response(
            {"error": f"Incorrect OTP. {attempts_left} attempts left."}, status=400
        )

    # ✅ OTP Verified
    otp_obj.is_verified = True
    otp_obj.save(update_fields=["is_verified"])

    # Create or update StudentProfile from session data
    profile = session.profile_data or {}
    student, created = StudentProfile.objects.get_or_create(phone=session.phone)

    student.name = profile.get("name", student.name or "Kiosk Student")
    student.email = profile.get("email", student.email or "")
    student.save()

    # Link student to session and mark verified
    session.student_profile = student
    session.status = KioskSession.STATUS_VERIFIED
    session.save(update_fields=["student_profile", "status", "updated_at"])

    return Response(
        {
            "verified": True,
            "message": "OTP verified successfully",
            "session_key": str(session.session_key),
            "student_profile_id": student.id,
            "created_new_profile": created,
        },
        status=200,
    )


@api_view(["PATCH"])
def session_autosave(request, session_key):
    """
    Step 4: Auto-save preferences every 6 seconds (AFTER OTP verified)

    PATCH /api/kiosk/session/{session_key}/autosave/
    {
        "preferred_countries": ["India", "Canada"],
        "preferred_cities": ["Delhi", "Toronto"],
        "percentage": 85,
        "ielts_overall": 7.5,
        ...
    }
    """
    try:
        session = KioskSession.objects.get(session_key=session_key)
    except KioskSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)

    incoming = request.data or {}
    current = session.profile_data or {}
    current.update(incoming)
    session.profile_data = current

    # Sync into StudentProfile
    phone = session.phone
    email = current.get("email", "")
    name = current.get("name", "Kiosk Student")

    student = None
    if phone:
        student, created = StudentProfile.objects.get_or_create(
            phone=phone, defaults={"name": name, "email": email}
        )

        # Always keep StudentProfile in sync
        student.name = name
        student.email = email or student.email
        student.highest_qualification = current.get("highest_qualification", "")
        student.academic_stream = current.get("academic_stream", "")
        student.academic_major = current.get("academic_major", "")
        student.percentage = current.get("percentage")
        student.cgpa = current.get("cgpa")
        student.ielts_overall = current.get("ielts_overall")
        student.pte_overall = current.get("pte_overall")
        student.toefl_overall = current.get("toefl_overall")
        student.preferred_countries = current.get("preferred_countries", [])
        student.preferred_cities = current.get("preferred_cities", [])
        student.max_budget = current.get("max_budget")
        student.career_goal = current.get("career_goal", "")
        student.work_experience_months = current.get("work_experience_months")
        student.preferred_intake = current.get("preferred_intake", "")
        student.subjects_studied = current.get("subjects_studied", [])
        student.total_backlogs = current.get("total_backlogs")
        student.active_backlogs = current.get("active_backlogs")
        student.graduation_year = current.get("graduation_year")
        student.preferred_field = current.get("preferred_field", "")
        student.preferred_degree = current.get("preferred_degree", "")
        student.save()

        session.student_profile = student

    session.save(update_fields=["profile_data", "student_profile", "updated_at"])

    return Response(
        {
            "session_key": str(session.session_key),
            "profile_data": session.profile_data,
            "student_profile_id": student.id if student else None,
            "synced_to_student_profile": student is not None,
            "saved_at": session.updated_at.isoformat(),
        },
        status=200,
    )


@api_view(["GET"])
def session_recommendations(request, session_key):
    """
    Step 5: Get live course recommendations based on current session profile

    GET /api/kiosk/session/{session_key}/recommendations/
    """
    try:
        session = KioskSession.objects.get(session_key=session_key)
    except KioskSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)

    profile = session.profile_data or {}

    # Build temporary student object from session profile data
    class TempStudent:
        pass

    student = TempStudent()
    student.highest_qualification = profile.get("highest_qualification", "")
    student.academic_stream = profile.get("academic_stream", "")
    student.academic_major = profile.get("academic_major", "")
    student.percentage = profile.get("percentage")
    student.cgpa = profile.get("cgpa")
    student.ielts_overall = profile.get("ielts_overall")
    student.pte_overall = profile.get("pte_overall")
    student.toefl_overall = profile.get("toefl_overall")
    student.preferred_countries = profile.get("preferred_countries", [])
    student.preferred_cities = profile.get("preferred_cities", [])
    student.max_budget = profile.get("max_budget")
    student.career_goal = profile.get("career_goal", "")
    student.subjects_studied = profile.get("subjects_studied", [])
    student.work_experience_months = profile.get("work_experience_months")
    student.preferred_field = profile.get("preferred_field", "")
    student.preferred_intake = profile.get("preferred_intake", "")
    student.preferred_duration_months = profile.get("preferred_duration_months")
    student.total_backlogs = profile.get("total_backlogs")
    student.active_backlogs = profile.get("active_backlogs")
    student.duolingo_overall = profile.get("duolingo_overall")

    results = get_eligible_courses(student)

    # Remove Not Eligible courses
    results = [r for r in results if r["status"] != "Not Eligible"]

    # Country filter
    preferred_countries = [
        c.lower().strip() for c in (student.preferred_countries or [])
    ]
    if preferred_countries:
        results = [
            r
            for r in results
            if r["course"].university.country.lower().strip() in preferred_countries
        ]

    # Sort by score descending
    results = sorted(results, key=lambda x: x["score"]["final_score"], reverse=True)
    top_results = results[:50]

    data = []
    for r in top_results:
        course = r["course"]
        score = r["score"]
        data.append(
            {
                **serialize_course_catalog_item(course),
                "status": r["status"],
                "match_percentage": round(score["final_score"], 1),
                "score": score["final_score"],
                "score_breakdown": score["breakdown"],
                "reasons": r["reasons"],
            }
        )

    return Response(
        {
            "session_key": str(session.session_key),
            "total_matched": len(results),
            "showing": len(data),
            "active_country_filter": preferred_countries,
            "recommendations": data,
        },
        status=200,
    )


@api_view(["POST"])
def session_select_courses(request, session_key):
    """
    Step 6: Student selects courses from recommendations

    POST /api/kiosk/session/{session_key}/select-courses/
    {
        "selected_course_ids": [1, 2, 3, 4, 5]
    }
    """
    try:
        session = KioskSession.objects.get(session_key=session_key)
    except KioskSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)

    course_ids = parse_course_ids(request.data.get("selected_course_ids", []))
    if not course_ids:
        return Response({"error": "selected_course_ids is required"}, status=400)

    # Validate course IDs
    valid_ids = list(
        Course.objects.filter(id__in=course_ids).values_list("id", flat=True)
    )
    invalid_ids = [cid for cid in course_ids if cid not in valid_ids]

    # Get universities
    selected_universities = list(
        Course.objects.filter(id__in=valid_ids)
        .values_list("university_id", flat=True)
        .distinct()
    )

    session.selected_course_ids = valid_ids
    session.shortlisted_course_ids = valid_ids
    session.shortlisted_university_ids = selected_universities
    session.save(
        update_fields=[
            "selected_course_ids",
            "shortlisted_course_ids",
            "shortlisted_university_ids",
            "updated_at",
        ]
    )

    return Response(
        {
            "session_key": str(session.session_key),
            "selected_count": len(valid_ids),
            "selected_course_ids": valid_ids,
            "selected_university_ids": selected_universities,
            "invalid_ids": invalid_ids,
        },
        status=200,
    )


@api_view(["POST"])
def session_whatsapp_share(request, session_key):
    """
    Step 7: Generate WhatsApp message with selected courses

    POST /api/kiosk/session/{session_key}/whatsapp-share/
    """
    try:
        session = KioskSession.objects.get(session_key=session_key)
    except KioskSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)

    selected_ids = session.selected_course_ids or []
    if not selected_ids:
        return Response({"error": "No courses selected"}, status=400)

    courses = (
        Course.objects.select_related("university", "fee", "english_requirement")
        .prefetch_related("intakes")
        .filter(id__in=selected_ids)
    )
    by_id = {c.id: c for c in courses}
    ordered_courses = [by_id[cid] for cid in selected_ids if cid in by_id]

    if not ordered_courses:
        return Response({"error": "Selected courses not found"}, status=400)

    phone = session.phone
    student = session.student_profile
    student_name = (
        student.name if student else session.profile_data.get("name", "Student")
    )

    lines = [f"Hi! Here are your shortlisted courses via Cybrik Edugraph:", ""]

    for idx, course in enumerate(ordered_courses, start=1):
        fee = get_optional_relation(course, "fee")
        intakes = serialize_intakes(course)
        lines.extend(
            [
                f"{idx}. *{course.title}*",
                f"   🏫 {course.university.name}",
                f"   📍 {course.university.city}, {course.university.country}",
                f"   🎓 {course.degree_level} | {format_duration(course.duration_months)}",
                f"   💰 {format_currency(fee.tuition_fee if fee else None, fee.currency if fee else '', ' / Year')}",
                f"   📅 Intakes: {', '.join(intakes) if intakes else 'TBA'}",
                "",
            ]
        )

    lines.append("_Powered by Cybrik Edugraph_")
    message = "\n".join(lines)
    encoded = quote_plus(message)
    wa_phone = phone.replace("+", "").replace(" ", "")

    return Response(
        {
            "session_key": str(session.session_key),
            "selected_count": len(ordered_courses),
            "message": message,
            "whatsapp_api_url": f"https://wa.me/{wa_phone}?text={encoded}",
            "whatsapp_web_url": f"https://api.whatsapp.com/send?phone={wa_phone}&text={encoded}",
        },
        status=200,
    )

    # ═══════════════════════════════════════════════════════════════════════════════
    # DOCUMENT MANAGEMENT API ENDPOINTS
    # ═══════════════════════════════════════════════════════════════════════════════

    @api_view(["GET"])
    def get_countries_list(request):
        """Get list of all supported countries with available documents"""
        countries = [
            ("australia", "Australia"),
            ("canada", "Canada"),
            ("uk", "United Kingdom"),
            ("germany", "Germany"),
            ("latvia", "Latvia"),
            ("newzealand", "New Zealand"),
            ("cyprus", "Cyprus"),
        ]
        data = []
        for code, name in countries:
            doc_count = CountryDocument.objects.filter(country=code).count()
            doc_types = list(
                CountryDocument.objects.filter(country=code)
                .values_list("document_type__name", flat=True)
                .distinct()
            )
            data.append(
                {
                    "code": code,
                    "name": name,
                    "documents_count": doc_count,
                    "document_types": doc_types,
                }
            )

    return Response({"total_countries": len(countries), "countries": data}, status=200)


@api_view(["GET"])
def get_country_documents(request, country):
    """Get all documents for a specific country"""
    country_lower = country.lower()

    try:
        documents = CountryDocument.objects.filter(
            country=country_lower
        ).select_related("document_type")

        if not documents.exists():
            return Response(
                {"error": f"No documents found for country: {country}"}, status=404
            )

        doc_list = [
            {
                "id": doc.id,
                "type": doc.document_type.name,
                "display_name": doc.document_type.get_name_display(),
                "file_name": doc.file_name,
                "file_size": doc.file_size,
                "required": doc.required,
                "description": doc.description,
                "download_url": request.build_absolute_uri(
                    f"/api/documents/download/{doc.id}/"
                ),
            }
            for doc in documents
        ]

        return Response(
            {
                "country": country_lower,
                "country_name": dict(CountryDocument.COUNTRIES).get(
                    country_lower, country
                ),
                "total_documents": len(doc_list),
                "documents": doc_list,
            },
            status=200,
        )

    except Exception as e:
        logger.error(f"Error fetching documents for {country}: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(["GET"])
def download_document(request, document_id):
    """Download a specific document"""
    try:
        doc = CountryDocument.objects.get(id=document_id)
    except CountryDocument.DoesNotExist:
        return Response({"error": "Document not found"}, status=404)

    import os

    file_path = os.path.join(settings.BASE_DIR, doc.file_path)

    if not os.path.exists(file_path):
        logger.error(f"Document file not found: {file_path}")
        return Response({"error": "File not found on server"}, status=404)

    from django.http import FileResponse

    try:
        response = FileResponse(open(file_path, "rb"))
        response["Content-Disposition"] = f'attachment; filename="{doc.file_name}"'
        response["Content-Type"] = "application/pdf"
        return response
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        return Response({"error": "Failed to download document"}, status=500)


@api_view(["POST"])
def request_country_documents(request, session_key):
    """Student requests documents for a country"""
    try:
        session = KioskSession.objects.get(session_key=session_key)
    except KioskSession.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)

    country = str(request.data.get("country", "")).strip().lower()
    doc_types = request.data.get("document_types", [])
    agent_type = request.data.get("agent_type", "manual")

    if not country:
        return Response({"error": "country is required"}, status=400)

    # Validate country
    valid_countries = [c[0] for c in CountryDocument.COUNTRIES]
    if country not in valid_countries:
        return Response(
            {
                "error": f"Invalid country. Valid countries: {', '.join(valid_countries)}"
            },
            status=400,
        )

    student = session.student_profile
    if not student:
        return Response({"error": "Student profile not found"}, status=400)

    # Get documents for this country
    if doc_types:
        documents = CountryDocument.objects.filter(
            country=country, document_type__name__in=doc_types
        )
    else:
        documents = CountryDocument.objects.filter(country=country, required=True)

    if not documents.exists():
        return Response({"error": f"No documents found for {country}"}, status=404)

    # Create request record
    doc_request, created = StudentDocumentRequest.objects.get_or_create(
        student=student, country=country, defaults={"status": "requested"}
    )

    doc_request.documents.set(documents)
    doc_request.save()

    # Log conversation if from voice agent
    if agent_type in ["voice", "chatbot"]:
        conversation_text = f"{agent_type.capitalize()} identified {country} documents needed: {', '.join([d.document_type.name for d in documents])}"
        conv_log = DocumentConversationLog.objects.create(
            student=student,
            agent_type=agent_type,
            country=country,
            conversation_text=conversation_text,
        )
        conv_log.documents_identified.set(documents)

    doc_list = [
        {
            "id": doc.id,
            "type": doc.document_type.name,
            "display_name": doc.document_type.get_name_display(),
            "file_name": doc.file_name,
            "required": doc.required,
        }
        for doc in documents
    ]

    return Response(
        {
            "request_id": doc_request.id,
            "country": country,
            "total_documents": len(doc_list),
            "documents": doc_list,
            "status": "Documents ready to send via WhatsApp",
            "next_action": f"Call /api/documents/send-whatsapp/{doc_request.id}/ to send via WhatsApp",
        },
        status=201,
    )


@api_view(["POST"])
def send_documents_via_whatsapp(request, document_request_id):
    """Send documents to student via Meta WhatsApp"""
    from services.meta_whatsapp_service import MetaWhatsAppService

    try:
        doc_request = StudentDocumentRequest.objects.get(id=document_request_id)
    except StudentDocumentRequest.DoesNotExist:
        return Response({"error": "Document request not found"}, status=404)

    student = doc_request.student
    if not student.phone:
        return Response({"error": "Student phone number not found"}, status=400)

    documents = doc_request.documents.all()
    if not documents:
        return Response({"error": "No documents in this request"}, status=400)

    document_links = [
        f"{doc.file_name}: {request.build_absolute_uri(f'/api/documents/download/{doc.id}/')}"
        for doc in documents
    ]

    message_lines = [
        "Hi! Your requested documents are ready:",
        "",
        *[f"- {link}" for link in document_links],
        "",
        "Please review the documents and contact us if you need help.",
        "Powered by Cybrik Edugraph",
    ]
    message = "\n".join(message_lines)

    meta_service = MetaWhatsAppService()
    meta_result = meta_service.send_text_message(student.phone, message)

    if not meta_result.get("success"):
        logger.error(f"Meta WhatsApp document send failed: {meta_result}")
        return Response({
            "success": False,
            "error": "Failed to send documents via WhatsApp. Please try again.",
            "details": meta_result.get("error", ""),
        }, status=500)

    sent_docs = [f"{doc.file_name}" for doc in documents]
    doc_request.status = "sent"
    doc_request.sent_at = timezone.now()
    doc_request.notes = (
        f"Sent {len(documents)} documents via WhatsApp to {student.phone}"
    )
    doc_request.save()

    logger.info(f"Documents sent to {student.phone}: {sent_docs}")

    return Response(
        {
            "success": True,
            "message": f"Documents sent to {student.phone}",
            "request_id": doc_request.id,
            "documents_sent": sent_docs,
            "recipient": student.phone,
            "status": doc_request.status,
            "sent_at": doc_request.sent_at.isoformat(),
        },
        status=200,
    )


@api_view(["GET"])
def get_student_document_history(request, student_id):
    """Get all document requests and conversation history for a student"""
    try:
        student = StudentProfile.objects.get(id=student_id)
    except StudentProfile.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    # Get all document requests
    doc_requests = StudentDocumentRequest.objects.filter(
        student=student
    ).prefetch_related("documents")

    requests_list = [
        {
            "id": req.id,
            "country": req.get_country_display(),
            "documents": [d.file_name for d in req.documents.all()],
            "status": req.status,
            "requested_at": req.requested_at.isoformat(),
            "sent_at": req.sent_at.isoformat() if req.sent_at else None,
        }
        for req in doc_requests
    ]

    # Get conversation history
    conversations = DocumentConversationLog.objects.filter(student=student).order_by(
        "-created_at"
    )

    conv_list = [
        {
            "id": conv.id,
            "agent_type": conv.agent_type,
            "country": conv.get_country_display(),
            "conversation": conv.conversation_text,
            "documents_identified": [
                d.file_name for d in conv.documents_identified.all()
            ],
            "logged_at": conv.created_at.isoformat(),
        }
        for conv in conversations
    ]

    return Response(
        {
            "student": {
                "id": student.id,
                "name": student.name,
                "phone": student.phone,
                "email": student.email,
            },
            "document_requests": {
                "total": len(requests_list),
                "requests": requests_list,
            },
            "conversations": {"total": len(conv_list), "conversations": conv_list},
        },
        status=200,
    )
