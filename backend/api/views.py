from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from functools import lru_cache
from urllib.error import URLError, HTTPError
from urllib.parse import quote_plus, urljoin
from urllib.request import Request, urlopen
from io import BytesIO
import json
import logging
import os
import re

from .models import StudentProfile, University, Course, WhatsAppLead, ShortlistItem
from services.eligibility import get_eligible_courses
from services.explanations import generate_explanations
from services.risk_flags import generate_risk_flags

from services.profile import compute_recommendation_confidence

logger = logging.getLogger(__name__)


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
        "tuition_fee": float(fee.tuition_fee) if fee and fee.tuition_fee is not None else None,
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
            "application_fee": float(university.application_fee)
            if university.application_fee is not None
            else None,
            "application_fee_currency": university.application_fee_currency or "",
            "scholarship_available": university.scholarship_available,
            "accommodation_available": university.accommodation_available,
            "estimated_monthly_living_cost": float(university.estimated_monthly_living_cost) if university.estimated_monthly_living_cost else None,
            "living_cost_currency": university.living_cost_currency,
        },
        "degree_level": course.degree_level,
        "field_of_study": course.field_of_study,
        "specialization": course.specialization,
        "department": course.department,
        "faculty": course.faculty,
        "duration_months": course.duration_months,
        "mode": course.mode,
        "campus": course.campus,
        "course_url": course.course_url,
        "course_summary": course.course_summary,
        "modules": course.modules,
        "credits": course.credits,
        "thesis_option": course.thesis_option,
        "project_option": course.project_option,
        "internship_available": course.internship_available,
        "career_outcomes": course.career_outcomes,
        "relevant_industries": course.relevant_industries,
        "application_difficulty": course.application_difficulty,
        "tuition_fee": float(fee.tuition_fee) if fee and fee.tuition_fee is not None else None,
        "tuition_currency": fee.currency if fee else "",
        "fee_period": fee.fee_period if fee else "",
        "intake_labels": serialize_intakes(course),
        "ielts_overall": (
            english_requirement.ielts_overall
            if english_requirement and english_requirement.ielts_overall is not None
            else None
        ),
        "admissions_notes": course.admissions_notes,
        "gallery_images": fetch_course_gallery_images(
            course.course_url,
            university.id,
            university.official_website,
        ),
    }


@lru_cache(maxsize=512)
def fetch_course_gallery_images(course_url, university_id, university_website):
    # Try to get from database first
    db_images = list(
        University.objects.filter(id=university_id)
        .values_list("gallery_images__image_url", flat=True)
    )
    db_images = [image for image in db_images if image]
    if db_images:
        return db_images

    source_url = (course_url or "").strip() or (university_website or "").strip()
    if not source_url:
        return []

    try:
        # Improved headers to avoid 403
        request = Request(
            source_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Cache-Control": "max-age=0",
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
        r"<img[^>]+src=[\"']([^\"']+)[\"']",
        html,
        flags=re.IGNORECASE,
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
    blocked_tokens = [
        "logo",
        "favicon",
        "icon",
        "sprite",
        "avatar",
        "badge",
        ".svg",
        "apple-touch",
    ]
    if any(token in lowered for token in blocked_tokens):
        return False

    allowed_extensions = (".jpg", ".jpeg", ".png", ".webp", ".avif")
    if any(ext in lowered for ext in allowed_extensions):
        return True

    return (
        "image" in lowered
        or "photo" in lowered
        or "media" in lowered
        or "uploads" in lowered
    )


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
        (
            "Application fee: "
            f"{format_currency(course.university.application_fee, course.university.application_fee_currency)}"
        ),
        (
            "IELTS: "
            f"{english_requirement.ielts_overall if english_requirement and english_requirement.ielts_overall is not None else 'N/A'}"
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
        os.getenv("CRM_WEBHOOK_URL")
        or getattr(settings, "CRM_WEBHOOK_URL", "")
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
            name__iexact=normalized_name,
            phone=normalized_phone,
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
        StudentProfile.objects.filter(id=student_id)
        .values_list("shortlist_items__course_id", flat=True)
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
        raise RuntimeError(
            "PDF generation dependency missing. Install reportlab in backend environment."
        ) from exc

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
    draw_line("Cybrik Edugraph - Shortlisted Courses", font="Helvetica-Bold", size=16, gap=8)
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
        draw_line(f"University: {course.university.name}", indent=5 * mm, size=10, gap=5)
        draw_line(
            f"Location: {course.university.city}, {course.university.country}",
            indent=5 * mm,
            size=10,
            gap=5,
        )
        draw_line(f"Program level: {course.degree_level or 'Not specified'}", indent=5 * mm, size=10, gap=5)
        draw_line(f"Duration: {format_duration(course.duration_months)}", indent=5 * mm, size=10, gap=5)
        draw_line(
            "Tuition: "
            + format_currency(
                fee.tuition_fee if fee else None,
                fee.currency if fee else "",
                " / First Year",
            ),
            indent=5 * mm,
            size=10,
            gap=5,
        )
        draw_line(
            "Application fee: "
            + format_currency(
                course.university.application_fee,
                course.university.application_fee_currency,
            ),
            indent=5 * mm,
            size=10,
            gap=5,
        )
        draw_line(
            "IELTS: "
            + str(
                english_requirement.ielts_overall
                if english_requirement and english_requirement.ielts_overall is not None
                else "N/A"
            ),
            indent=5 * mm,
            size=10,
            gap=5,
        )
        draw_line(
            f"Intakes: {', '.join(intakes) if intakes else 'TBA'}",
            indent=5 * mm,
            size=10,
            gap=5,
        )
        draw_line(
            f"Course URL: {course.course_url or 'Check portal'}",
            indent=5 * mm,
            size=9,
            gap=7,
        )

    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


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
    return Response({
        "universities": University.objects.count(),
        "courses": Course.objects.count(),
        "countries": University.objects.values("country").distinct().count(),
        "students": StudentProfile.objects.count(),
    })


@api_view(["GET"])
def courses_catalog(request):
    courses = (
        Course.objects.select_related("university", "fee", "english_requirement")
        .prefetch_related("intakes")
        .order_by("university__name", "title")
    )

    data = [serialize_course_catalog_item(course) for course in courses]

    return Response({
        "count": len(data),
        "courses": data,
    })


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
        lead_form_url = request.build_absolute_uri(
            f"/lead-form?course_id={course.id}"
        )

    message = build_whatsapp_course_message(course, student=student, lead_form_url=lead_form_url)
    encoded = quote_plus(message)

    return Response({
        "course_id": course.id,
        "student_id": student.id if student else None,
        "lead_form_url": lead_form_url,
        "message": message,
        "whatsapp_url": f"https://wa.me/?text={encoded}",
        "whatsapp_web_url": f"https://api.whatsapp.com/send?text={encoded}",
    })


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
                Course.objects.select_related("university", "fee", "english_requirement")
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
                    "course_url": course.course_url,
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
            {"error": "phone, email, or student_id is required"},
            status=400,
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

    return Response({
        "found": True,
        **build_student_lookup_payload(student),
    })


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
        student_id=student_id,
        phone=phone,
        email=email,
        name=name,
    )

    course = None
    course_id = parse_int_or_none(data.get("course_id"))
    if data.get("course_id") not in (None, "") and course_id is None:
        return Response({"error": "course_id must be a valid integer"}, status=400)
    if course_id is not None:
        try:
            course = Course.objects.select_related("university", "fee", "english_requirement").get(id=course_id)
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
        return Response(
            {"error": "No shortlisted courses found for PDF generation"},
            status=400,
        )

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
    response["Content-Disposition"] = 'attachment; filename="cybrik-shortlisted-courses.pdf"'
    return response


@api_view(["POST"])
def shortlist_whatsapp_share(request):
    payload = request.data or {}
    course_ids = parse_course_ids(payload.get("course_ids"))
    student_id = parse_int_or_none(payload.get("student_id"))
    lead_form_url = str(payload.get("lead_form_url", "")).strip()

    courses = get_shortlisted_courses(course_ids=course_ids, student_id=student_id)
    if not courses:
        return Response(
            {"error": "No shortlisted courses provided"},
            status=400,
        )

    ids_csv = ",".join(str(course.id) for course in courses)
    pdf_url = request.build_absolute_uri(
        f"/api/shortlist/pdf/?course_ids={ids_csv}"
        + (f"&student_id={student_id}" if student_id is not None else "")
    )
    if not lead_form_url:
        lead_form_url = request.build_absolute_uri(
            "/lead-form?course_ids=" + ids_csv
            + (f"&student_id={student_id}" if student_id is not None else "")
        )

    message = build_shortlist_whatsapp_message(
        courses=courses,
        lead_form_url=lead_form_url,
        pdf_url=pdf_url,
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

        confidence = compute_recommendation_confidence(student)

        data.append(
            {
                **serialize_course_catalog_item(course),
                "status": r["status"],
                "score": score_result["final_score"],
                "raw_score": score_result["raw_score"],
                "max_raw_score": score_result["max_raw_score"],
                "score_breakdown": score_breakdown,
                "explanations": explanations,
                "risk_flags": risk_flags,
                "reasons": r["reasons"],
            }
        )

    return Response({
        "student": {
            "id": student.id,
            "name": student.name,
            "highest_qualification": student.highest_qualification,
            "academic_stream": student.academic_stream,
            "percentage": student.percentage,
            "ielts_overall": student.ielts_overall,
        },
        "recommendation_confidence": confidence,
        "recommendations": data
    })
