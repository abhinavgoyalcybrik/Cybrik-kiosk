"""
Import attached university course JSON exports into the Django database.

Run with:
    cd backend && python import_university_courses.py
    cd backend && python import_university_courses.py ../universities/deakin_university.json
"""

from __future__ import annotations

import argparse
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
    GalleryImage,
    University,
)


REPO_ROOT = Path(__file__).resolve().parent.parent
UNIVERSITIES_DIR = REPO_ROOT / "universities"
SOURCE_FILE_NAMES = [
    "acap_college_university.json",
    "curtin_university.json",
    "deakin_university.json",
    "edith_cowan_university.json",
    "federation_university_australia.json",
    "griffith_university.json",
    "latrobe_university.json",
    "melbourne_polytechnic.json",
    "rmit_university.json",
]

UNIVERSITY_DEFAULTS = {
    "ACAP College University": {
        "official_website": "https://www.acap.edu.au",
        "country": "Australia",
        "state_province": "",
        "city": "Sydney",
        "institution_type": "University",
        "ownership_type": "Private",
    },
    "Avondale University": {
        "official_website": "http://www.avondale.edu.au/",
        "country": "Australia",
        "state_province": "New South Wales",
        "city": "Lake Macquarie",
        "institution_type": "University",
        "ownership_type": "Private",
    },
    "Melbourne Polytechnic": {
        "official_website": "https://www.melbournepolytechnic.edu.au",
        "country": "Australia",
        "state_province": "Victoria",
        "city": "Melbourne",
        "institution_type": "Polytechnic",
        "ownership_type": "Public",
    },
    "RMIT University": {
        "official_website": "https://www.rmit.edu.au",
        "country": "Australia",
        "state_province": "Victoria",
        "city": "Melbourne",
        "institution_type": "University",
        "ownership_type": "Public",
    },
}

UNIVERSITY_NAME_ALIASES = {
    "Royal Melbourne Institute of Technology": "RMIT University",
}


def resolve_source_files(json_paths: list[str] | None = None) -> list[Path]:
    if json_paths:
        resolved_paths = []
        for raw_path in json_paths:
            candidate = Path(raw_path).expanduser()
            if not candidate.is_absolute():
                candidate = REPO_ROOT / candidate
            resolved_paths.append(candidate.resolve())
        return resolved_paths

    return [UNIVERSITIES_DIR / file_name for file_name in SOURCE_FILE_NAMES]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import university JSON exports into Django DB.",
    )
    parser.add_argument(
        "json_paths",
        nargs="*",
        help="Repo-relative or absolute paths to university JSON files.",
    )
    return parser.parse_args()


def canonicalize_university_name(name: str) -> str:
    return UNIVERSITY_NAME_ALIASES.get(name, name)


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
        if "type" in value or "requirement" in value:
            prefix = normalize_whitespace(value.get("type") or value.get("requirement"))
            details = stringify(
                value.get("requirements") or value.get("description") or value.get("value")
            )
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

    match = re.search(r"\d+(?:\.\d+)?", str(value))
    if not match:
        return None

    return float(match.group(0))


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

    if amount is None:
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

    if parsed_amount <= 0 or parsed_amount < Decimal("1000") or parsed_amount > Decimal("100000"):
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

    return " / ".join(part for part in cleaned_segments if part) or normalize_whitespace(program_name)


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
    if overall is None:
        overall = first_number(value.get("score"))
    if overall is not None:
        scores["ielts_overall"] = overall

    band_scores = value.get("bands") or value.get("band_scores") or value.get("sub-bands") or value.get("sub_bands")
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
        if any(key in requirements for key in ("overall", "overall_score", "score", "bands", "band_scores")):
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


def upsert_course(
    university: University,
    title: str,
    defaults: dict[str, object],
) -> tuple[Course, bool, int]:
    matching_courses = list(
        Course.objects.select_for_update()
        .filter(university=university, title=title)
        .order_by("id")
    )

    if not matching_courses:
        return Course.objects.create(university=university, title=title, **defaults), True, 0

    primary_course = matching_courses[0]
    duplicate_course_ids = [course.id for course in matching_courses[1:]]
    if duplicate_course_ids:
        Course.objects.filter(id__in=duplicate_course_ids).delete()

    for field_name, value in defaults.items():
        setattr(primary_course, field_name, value)
    primary_course.save(update_fields=list(defaults.keys()))

    return primary_course, False, len(duplicate_course_ids)


def load_payload(json_path: Path) -> tuple[dict[str, object], list[dict[str, object]]]:
    with json_path.open(encoding="utf-8") as file:
        payload = json.load(file)

    metadata = payload.get("metadata", {})
    programs = payload.get("programs", [])

    if not isinstance(metadata, dict) or not isinstance(programs, list):
        raise ValueError(f"Unexpected JSON structure in {json_path.name}.")

    return metadata, programs


def get_or_merge_university(
    source_university_name: str,
    university_defaults: dict[str, object],
) -> University:
    canonical_name = canonicalize_university_name(source_university_name)
    university, _ = University.objects.update_or_create(
        name=canonical_name,
        defaults=university_defaults,
    )

    if source_university_name == canonical_name:
        return university

    alias_university = (
        University.objects.filter(name=source_university_name).exclude(id=university.id).first()
    )
    if alias_university is None:
        return university

    Course.objects.filter(university=alias_university).update(university=university)
    GalleryImage.objects.filter(university=alias_university).update(university=university)
    alias_university.delete()

    return university


def import_university_courses(json_path: Path) -> str:
    metadata, programs = load_payload(json_path)
    source_university_name = normalize_whitespace(metadata.get("university_name"))
    university_name = canonicalize_university_name(source_university_name)

    if not source_university_name:
        raise ValueError(f"Missing university name in {json_path.name}.")

    university_defaults = UNIVERSITY_DEFAULTS.get(
        university_name,
        {
            "official_website": normalize_whitespace(metadata.get("source")),
            "country": "Australia",
            "state_province": "",
            "city": "",
            "institution_type": "University",
            "ownership_type": "",
        },
    )

    university = get_or_merge_university(
        source_university_name=source_university_name,
        university_defaults=university_defaults,
    )

    campus_values = set()
    scholarship_available = False
    created_courses = 0
    updated_courses = 0
    deduplicated_courses = 0
    created_fees = 0
    created_academic = 0
    updated_academic = 0
    created_english = 0
    updated_english = 0
    recreated_intakes = 0
    skipped_programs = 0
    imported_course_titles = set()

    for program in programs:
        title = normalize_whitespace(program.get("program_course_name"))
        if not title:
            skipped_programs += 1
            continue

        imported_course_titles.add(title)

        campuses = program.get("campus_location")
        if isinstance(campuses, list):
            campus_values.update(normalize_whitespace(campus) for campus in campuses if campus)
        elif campuses:
            campus_values.add(normalize_whitespace(campuses))

        scholarship_available = scholarship_available or bool(program.get("available_scholarships"))

        with transaction.atomic():
            course_defaults = {
                "degree_level": infer_degree_level(title, program.get("course_level")),
                "field_of_study": infer_field_of_study(title),
                "specialization": "",
                "department": "",
                "faculty": "",
                "duration_months": parse_duration_months(program.get("course_duration")),
                "mode": "Part-time"
                if "part-time" in normalize_whitespace(program.get("course_duration")).lower()
                else "Full-time"
                if normalize_whitespace(program.get("course_duration")).lower()
                else "",
                "campus": normalize_campus_location(program.get("campus_location")),
                "course_url": extract_source_url(program.get("source_reference")),
                "course_summary": normalize_whitespace(program.get("course_duration")),
                "admissions_notes": build_admissions_notes(program),
            }
            course, created, duplicate_count = upsert_course(
                university=university,
                title=title,
                defaults=course_defaults,
            )

            if created:
                created_courses += 1
            else:
                updated_courses += 1
            deduplicated_courses += duplicate_count

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

            fee_amount, fee_currency, fee_period = parse_fee(program.get("annual_tuition_fee"))
            if fee_amount is not None:
                CourseFee.objects.update_or_create(
                    course=course,
                    defaults={
                        "tuition_fee": fee_amount,
                        "currency": fee_currency or "AUD",
                        "fee_period": fee_period or "per year",
                    },
                )
                created_fees += 1

            academic_notes = stringify(program.get("academic_requirements"))
            _, academic_created = AcademicRequirement.objects.update_or_create(
                course=course,
                defaults={
                    "required_qualification": academic_notes[:255],
                    "required_bachelor_background": academic_notes,
                    "academic_flexibility_notes": academic_notes,
                },
            )
            if academic_created:
                created_academic += 1
            else:
                updated_academic += 1

            english_scores, english_notes = parse_english_requirements(
                program.get("minimum_english_language_score_requirements")
            )
            _, english_created = EnglishRequirement.objects.update_or_create(
                course=course,
                defaults={
                    **english_scores,
                    "english_score_flexibility_notes": english_notes,
                },
            )
            if english_created:
                created_english += 1
            else:
                updated_english += 1

    campus_locations = ", ".join(sorted(campus_values))

    stale_courses = Course.objects.filter(university=university).exclude(
        title__in=imported_course_titles
    )
    deleted_stale_courses = stale_courses.count()
    stale_courses.delete()

    if campus_locations:
        university.campus_locations = campus_locations
    university.scholarship_available = scholarship_available
    if campus_locations:
        university.save(update_fields=["campus_locations", "scholarship_available"])
    else:
        university.save(update_fields=["scholarship_available"])

    total_courses = Course.objects.filter(university=university).count()

    print(f"Imported {university_name} from: {json_path.name}")
    print(f"Source metadata total_programs: {metadata.get('total_programs')}")
    print(f"Courses in DB: {total_courses}")
    print(f"Courses created: {created_courses}")
    print(f"Courses updated: {updated_courses}")
    print(f"Duplicate course rows removed: {deduplicated_courses}")
    print(f"Course fees upserted: {created_fees}")
    print(f"Academic requirements created: {created_academic}")
    print(f"Academic requirements updated: {updated_academic}")
    print(f"English requirements created: {created_english}")
    print(f"English requirements updated: {updated_english}")
    print(f"Intakes recreated: {recreated_intakes}")
    print(f"Stale courses removed: {deleted_stale_courses}")
    if skipped_programs:
        print(f"Skipped empty program entries: {skipped_programs}")

    return university_name


def main(json_paths: list[str] | None = None) -> None:
    source_files = resolve_source_files(json_paths)
    prune_missing_universities = not json_paths
    imported_files = 0
    imported_university_names = set()

    for json_path in source_files:
        if not json_path.exists():
            print(f"Skipping missing file: {json_path.name}")
            continue

        university_name = import_university_courses(json_path)
        imported_university_names.add(university_name)
        imported_files += 1

    deleted_stale_universities = 0
    if prune_missing_universities:
        stale_universities = University.objects.exclude(name__in=imported_university_names)
        deleted_stale_universities = stale_universities.count()
        stale_universities.delete()

    print(f"\nDone. Processed {imported_files} university file(s).")
    print(f"Stale universities removed: {deleted_stale_universities}")
    print(f"Total universities in DB: {University.objects.count()}")
    print(f"Total courses in DB: {Course.objects.count()}")


if __name__ == "__main__":
    args = parse_args()
    main(args.json_paths)
