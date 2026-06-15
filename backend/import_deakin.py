"""
Import Deakin University programs from the repo-level JSON export into Django.

Run with:
    cd backend && venv/bin/python import_deakin.py
"""

from __future__ import annotations

import json
import os
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

import django
from django.db import transaction

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import (  # noqa: E402
    AcademicRequirement,
    Course,
    CourseFee,
    CourseIntake,
    EnglishRequirement,
    University,
)


REPO_ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = REPO_ROOT / "deakin_university.json"


def normalize_whitespace(value: object) -> str:
    if value is None:
        return ""

    return " ".join(str(value).split())


def stringify(value: object) -> str:
    if value is None:
        return ""

    if isinstance(value, str):
        return normalize_whitespace(value)

    if isinstance(value, (int, float, Decimal, bool)):
        return str(value)

    if isinstance(value, list):
        parts = [stringify(item) for item in value]
        return " | ".join(part for part in parts if part)

    if isinstance(value, dict):
        if "type" in value or "requirements" in value:
            prefix = normalize_whitespace(value.get("type"))
            details = stringify(value.get("requirements"))

            if prefix and details:
                return f"{prefix}: {details}"

            return prefix or details

        parts = []
        for key, nested_value in value.items():
            nested_text = stringify(nested_value)
            if not nested_text:
                continue

            label = normalize_whitespace(str(key)).replace("_", " ")
            parts.append(f"{label}: {nested_text}")

        return " | ".join(parts)

    return normalize_whitespace(value)


def first_number(value: object) -> float | None:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value)

    matches = re.findall(r"\d+(?:\.\d+)?", str(value))
    if not matches:
        return None

    return float(matches[0])


def parse_duration_months(duration: object) -> int | None:
    if duration is None:
        return None

    if isinstance(duration, (int, float)):
        return int(float(duration) * 12)

    duration_text = normalize_whitespace(duration).lower()

    years_match = re.search(r"(\d+(?:\.\d+)?)\s*years?", duration_text)
    if years_match:
        return int(float(years_match.group(1)) * 12)

    months_match = re.search(r"(\d+(?:\.\d+)?)\s*months?", duration_text)
    if months_match:
        return int(float(months_match.group(1)))

    return None


def parse_fee(fee_data: object) -> tuple[Decimal | None, str, str]:
    if not isinstance(fee_data, dict):
        return None, "", ""

    currency = normalize_whitespace(fee_data.get("currency"))
    period = normalize_whitespace(fee_data.get("period"))
    amount = fee_data.get("amount")

    if not amount:
        return None, currency, period

    if isinstance(amount, (int, float)):
        parsed_amount = Decimal(str(amount))
    else:
        amount_match = re.search(r"\d[\d,]*(?:\.\d+)?", str(amount))
        if not amount_match:
            return None, currency, period

        cleaned_amount = amount_match.group(0).replace(",", "")

        try:
            parsed_amount = Decimal(cleaned_amount)
        except InvalidOperation:
            return None, currency, period

    # Deakin tuition fees should be in a realistic annual-course-fee range.
    if parsed_amount < Decimal("1000") or parsed_amount > Decimal("100000"):
        return None, currency, period

    return parsed_amount, currency, period


def normalize_campus_location(location: object) -> str:
    if isinstance(location, list):
        campuses = [normalize_whitespace(item) for item in location]
        return ", ".join(campus for campus in campuses if campus)

    return normalize_whitespace(location)


def extract_source_url(source_reference: object) -> str:
    if isinstance(source_reference, dict):
        return normalize_whitespace(source_reference.get("primary_source"))

    return ""


def infer_degree_level(program_name: str, raw_level: object) -> str:
    title = normalize_whitespace(program_name)
    title_lower = title.lower()
    raw_level_text = normalize_whitespace(raw_level)
    raw_level_lower = raw_level_text.lower()

    if title_lower.startswith("bachelor"):
        return "Bachelor"
    if title_lower.startswith("master"):
        return "Master"
    if title_lower.startswith("graduate diploma"):
        return "Graduate Diploma"
    if title_lower.startswith("graduate certificate"):
        return "Graduate Certificate"
    if title_lower.startswith("doctor") or "phd" in title_lower.replace(".", ""):
        return "Doctorate"
    if title_lower.startswith("diploma"):
        return "Diploma"
    if title_lower.startswith("certificate"):
        return "Certificate"

    if raw_level_lower == "undergraduate":
        return "Bachelor"
    if raw_level_lower == "postgraduate":
        return "Postgraduate"

    return raw_level_text or "Unknown"


def infer_field_of_study(program_name: str) -> str:
    degree_prefixes = [
        "Bachelor of ",
        "Master of ",
        "Graduate Diploma of ",
        "Graduate Certificate of ",
        "Diploma of ",
        "Certificate of ",
    ]

    cleaned_segments = []
    for segment in normalize_whitespace(program_name).split("/"):
        trimmed = segment.strip()

        for prefix in degree_prefixes:
            if trimmed.lower().startswith(prefix.lower()):
                trimmed = trimmed[len(prefix) :].strip()
                break

        cleaned_segments.append(trimmed or segment.strip())

    return " / ".join(part for part in cleaned_segments if part) or normalize_whitespace(
        program_name
    )


def parse_intake_entries(intakes: object) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []

    if not isinstance(intakes, list):
        return entries

    for intake in intakes:
        if isinstance(intake, dict):
            intake_label = normalize_whitespace(
                intake.get("start_date") or intake.get("intake") or intake.get("label")
            )
            notes = ""

            available_at = intake.get("available_at")
            if available_at:
                notes = f"Available at: {stringify(available_at)}"
        else:
            intake_label = normalize_whitespace(intake)
            notes = ""

        if not intake_label:
            continue

        year_match = re.search(r"\b(20\d{2})\b", intake_label)
        intake_year = int(year_match.group(1)) if year_match else None
        intake_month = re.sub(r"\b20\d{2}\b", "", intake_label).strip(" ,") or intake_label

        entries.append(
            {
                "intake_month": intake_month,
                "intake_year": intake_year,
                "notes": notes,
            }
        )

    return entries


def parse_ielts_scores(value: object) -> dict[str, float | None]:
    scores = {
        "ielts_overall": None,
        "ielts_listening": None,
        "ielts_reading": None,
        "ielts_writing": None,
        "ielts_speaking": None,
    }

    if value is None:
        return scores

    if isinstance(value, (int, float, str)):
        overall = first_number(value)
        if overall is not None:
            scores["ielts_overall"] = overall

        if isinstance(value, str) and "no band" in value.lower():
            band_score = None
            numbers = [float(match) for match in re.findall(r"\d+(?:\.\d+)?", value)]
            if len(numbers) >= 2:
                band_score = numbers[1]
            elif numbers:
                band_score = numbers[0]

            if band_score is not None:
                scores["ielts_listening"] = band_score
                scores["ielts_reading"] = band_score
                scores["ielts_writing"] = band_score
                scores["ielts_speaking"] = band_score

        return scores

    if not isinstance(value, dict):
        return scores

    overall = first_number(value.get("overall"))
    if overall is None:
        overall = first_number(value.get("overall_score"))
    if overall is not None:
        scores["ielts_overall"] = overall

    band_scores = value.get("bands") or value.get("band_scores")
    if isinstance(band_scores, list) and band_scores:
        if len(band_scores) == 1:
            parsed_band = first_number(band_scores[0])
            if parsed_band is not None:
                scores["ielts_listening"] = parsed_band
                scores["ielts_reading"] = parsed_band
                scores["ielts_writing"] = parsed_band
                scores["ielts_speaking"] = parsed_band
        elif len(band_scores) >= 4:
            listening, reading, writing, speaking = band_scores[:4]
            scores["ielts_listening"] = first_number(listening)
            scores["ielts_reading"] = first_number(reading)
            scores["ielts_writing"] = first_number(writing)
            scores["ielts_speaking"] = first_number(speaking)

    for raw_key, field_name in [
        ("listening", "ielts_listening"),
        ("reading", "ielts_reading"),
        ("writing", "ielts_writing"),
        ("speaking", "ielts_speaking"),
    ]:
        parsed_value = first_number(value.get(raw_key))
        if parsed_value is not None:
            scores[field_name] = parsed_value

    return scores


def parse_english_requirements(requirements: object) -> tuple[dict[str, float | None], str]:
    scores = {
        "ielts_overall": None,
        "ielts_listening": None,
        "ielts_reading": None,
        "ielts_writing": None,
        "ielts_speaking": None,
        "toefl_overall": None,
        "pte_overall": None,
        "duolingo_overall": None,
    }

    notes = stringify(requirements)
    if requirements is None:
        return scores, notes

    if isinstance(requirements, dict):
        if "overall_score" in requirements or "band_scores" in requirements:
            scores.update(parse_ielts_scores(requirements))

        for key, value in requirements.items():
            normalized_key = normalize_whitespace(key).lower()

            if "ielts" in normalized_key:
                for field_name, parsed_value in parse_ielts_scores(value).items():
                    if parsed_value is not None:
                        scores[field_name] = parsed_value
            elif "toefl" in normalized_key:
                parsed_value = first_number(value)
                if parsed_value is not None:
                    scores["toefl_overall"] = parsed_value
            elif "pte" in normalized_key or "pearson" in normalized_key:
                parsed_value = first_number(value)
                if parsed_value is not None:
                    scores["pte_overall"] = parsed_value
            elif "duolingo" in normalized_key or "det" in normalized_key:
                parsed_value = first_number(value)
                if parsed_value is not None:
                    scores["duolingo_overall"] = parsed_value

    return scores, notes


def build_admissions_notes(program: dict[str, object]) -> str:
    notes = []

    raw_level = normalize_whitespace(program.get("course_level"))
    if raw_level:
        notes.append(f"Source level: {raw_level}")

    accepted_tests = stringify(program.get("accepted_english_language_tests"))
    if accepted_tests:
        notes.append(f"Accepted English tests: {accepted_tests}")

    scholarships = stringify(program.get("available_scholarships"))
    if scholarships:
        notes.append(f"Scholarships: {scholarships}")

    internship_info = program.get("internship_work_placement_opportunities")
    if internship_info is not None:
        notes.append(f"Internship/work placement: {stringify(internship_info)}")

    confidence_score = program.get("confidence_score")
    if confidence_score is not None:
        notes.append(f"Extraction confidence: {confidence_score}")

    return "\n".join(notes)


def load_programs() -> tuple[dict[str, object], list[dict[str, object]]]:
    with JSON_PATH.open(encoding="utf-8") as file:
        payload = json.load(file)

    metadata = payload.get("metadata", {})
    programs = payload.get("programs", [])

    if not isinstance(metadata, dict) or not isinstance(programs, list):
        raise ValueError("Unexpected Deakin JSON structure.")

    return metadata, programs


def import_programs() -> None:
    metadata, programs = load_programs()

    university, _ = University.objects.get_or_create(
        name="Deakin University",
        defaults={
            "official_website": normalize_whitespace(metadata.get("source")),
            "country": "Australia",
            "state_province": "Victoria",
            "city": "Melbourne",
            "institution_type": "University",
        },
    )

    campus_values = {
        normalize_whitespace(campus)
        for program in programs
        for campus in (
            program.get("campus_location")
            if isinstance(program.get("campus_location"), list)
            else [program.get("campus_location")]
        )
        if campus
    }

    if campus_values:
        university.campus_locations = ", ".join(sorted(campus_values))
        university.save(update_fields=["campus_locations"])

    created_courses = 0
    updated_courses = 0
    created_fees = 0
    created_academic = 0
    updated_academic = 0
    created_english = 0
    updated_english = 0
    recreated_intakes = 0

    with transaction.atomic():
        existing_deakin_course_ids = list(
            Course.objects.filter(university=university).values_list("id", flat=True)
        )
        if existing_deakin_course_ids:
            CourseFee.objects.filter(course_id__in=existing_deakin_course_ids).delete()

        for program in programs:
            title = normalize_whitespace(program.get("program_course_name"))
            if not title:
                continue

            degree_level = infer_degree_level(title, program.get("course_level"))
            raw_academic_requirements = stringify(program.get("academic_requirements"))
            raw_english_scores, raw_english_notes = parse_english_requirements(
                program.get("minimum_english_language_score_requirements")
            )
            fee_amount, fee_currency, fee_period = parse_fee(program.get("annual_tuition_fee"))

            course, created = Course.objects.update_or_create(
                university=university,
                title=title,
                defaults={
                    "degree_level": degree_level,
                    "field_of_study": infer_field_of_study(title),
                    "duration_months": parse_duration_months(program.get("course_duration")),
                    "campus": normalize_campus_location(program.get("campus_location")),
                    "mode": "Full-time",
                    "course_url": extract_source_url(program.get("source_reference")),
                    "course_summary": normalize_whitespace(program.get("course_duration")),
                    "internship_available": bool(
                        program.get("internship_work_placement_opportunities")
                    ),
                    "admissions_notes": build_admissions_notes(program),
                },
            )

            if created:
                created_courses += 1
            else:
                updated_courses += 1

            CourseIntake.objects.filter(course=course).delete()
            intake_entries = parse_intake_entries(program.get("intakes"))
            for intake_entry in intake_entries:
                CourseIntake.objects.create(
                    course=course,
                    intake_month=str(intake_entry["intake_month"]),
                    intake_year=intake_entry["intake_year"],
                    notes=str(intake_entry["notes"]),
                )
            recreated_intakes += len(intake_entries)

            CourseFee.objects.filter(course=course).delete()
            if fee_amount is not None:
                CourseFee.objects.create(
                    course=course,
                    tuition_fee=fee_amount,
                    currency=fee_currency,
                    fee_period=fee_period,
                )
                created_fees += 1

            _, academic_created = AcademicRequirement.objects.update_or_create(
                course=course,
                defaults={
                    "academic_flexibility_notes": raw_academic_requirements,
                },
            )
            if academic_created:
                created_academic += 1
            else:
                updated_academic += 1

            _, english_created = EnglishRequirement.objects.update_or_create(
                course=course,
                defaults={
                    **raw_english_scores,
                    "english_score_flexibility_notes": raw_english_notes,
                },
            )
            if english_created:
                created_english += 1
            else:
                updated_english += 1

    total_deakin_courses = Course.objects.filter(university=university).count()

    print(f"Imported Deakin payload from: {JSON_PATH}")
    print(f"Source metadata total_programs: {metadata.get('total_programs')}")
    print(f"Deakin courses in DB: {total_deakin_courses}")
    print(f"Courses created: {created_courses}")
    print(f"Courses updated: {updated_courses}")
    print(f"Course fees created: {created_fees}")
    print(f"Academic requirements created: {created_academic}")
    print(f"Academic requirements updated: {updated_academic}")
    print(f"English requirements created: {created_english}")
    print(f"English requirements updated: {updated_english}")
    print(f"Intakes recreated: {recreated_intakes}")


if __name__ == "__main__":
    import_programs()
