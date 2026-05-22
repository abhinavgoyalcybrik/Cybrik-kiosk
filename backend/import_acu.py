"""
Import Australian Catholic University courses from the scraped JSON into the Django DB.
Run with: python manage.py shell < import_acu.py
"""
import json, re, os, django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from api.models import University, Course, CourseIntake, CourseFee

JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "australian_catholic_university.json")

with open(JSON_PATH, "r") as f:
    data = json.load(f)

uni_data = data["universities"]["Australian Catholic University"]

# Get or create the university
uni, created = University.objects.get_or_create(
    name="Australian Catholic University",
    defaults={
        "official_website": "https://www.acu.edu.au",
        "country": "Australia",
        "state_province": "Victoria",
        "city": "Melbourne",
        "institution_type": "University",
        "ownership_type": "Public",
    }
)
print(f"University {'created' if created else 'exists'}: {uni}")

# Parse duration string to months
def parse_duration_months(dur_str):
    if not dur_str:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)\s*year", dur_str)
    if m:
        return int(float(m.group(1)) * 12)
    m = re.search(r"(\d+)\s*month", dur_str)
    if m:
        return int(m.group(1))
    return None

# Map course_level to degree_level
LEVEL_MAP = {
    "Bachelor": "Bachelor",
    "Master": "Master",
    "Doctorate": "Doctorate",
    "Graduate Certificate": "Graduate Certificate",
    "Graduate Diploma": "Graduate Diploma",
    "Diploma": "Diploma",
    "Certificate": "Certificate",
}

imported = 0
skipped = 0

for prog_name, prog in uni_data["programs_by_name"].items():
    # Determine degree level
    raw_level = prog.get("course_level") or ""
    degree_level = LEVEL_MAP.get(raw_level, raw_level)
    
    # Fallback/Infer if degree_level is empty
    if not degree_level:
        clean_name = re.sub(r"^\d{4}\s*/\s*", "", prog_name).strip()
        if "Bachelor" in clean_name:
            degree_level = "Bachelor"
        elif "Master" in clean_name:
            degree_level = "Master"
        elif "Doctor" in clean_name or "Ph.D" in clean_name:
            degree_level = "Doctorate"
        elif "Diploma" in clean_name:
            degree_level = "Diploma"
        elif "Certificate" in clean_name:
            degree_level = "Certificate"
        else:
            degree_level = "Bachelor"

    # Determine field of study from the program name
    clean_name = re.sub(r"^\d{4}\s*/\s*", "", prog_name).strip()

    # Check if course already exists (avoid duplicates)
    exists = Course.objects.filter(university=uni, title=clean_name, degree_level=degree_level).exists()
    if exists:
        skipped += 1
        continue

    duration = parse_duration_months(prog.get("course_duration"))
    campus = prog.get("campus_location", "")

    course = Course.objects.create(
        university=uni,
        title=clean_name,
        degree_level=degree_level,
        field_of_study=clean_name,
        duration_months=duration,
        mode="Full-time",
        campus=campus or "Melbourne",
        course_url=prog.get("source_url", ""),
        course_summary=prog.get("academic_requirements", "")[:500] if prog.get("academic_requirements") else "",
        internship_available=bool(prog.get("internship_work_placement_opportunities")),
    )

    # Create intakes
    for intake in (prog.get("intakes") or []):
        CourseIntake.objects.create(
            course=course,
            intake_month=intake,
            intake_year=2026,
        )

    # Create fee record if tuition info exists
    raw_fee = prog.get("annual_tuition_fee")
    if raw_fee:
        try:
            if isinstance(raw_fee, str):
                cleaned = re.sub(r"[^\d.]", "", raw_fee)
                fee_val = float(cleaned) if cleaned else None
            else:
                fee_val = float(raw_fee)
            if fee_val:
                CourseFee.objects.create(
                    course=course,
                    tuition_fee=fee_val,
                    currency="AUD",
                    fee_period="Annual",
                )
        except (ValueError, Exception):
            pass  # skip unparseable fees

    imported += 1

print(f"\nDone! Imported {imported} courses, skipped {skipped} duplicates.")
print(f"Total courses in DB: {Course.objects.count()}")
print(f"Total universities in DB: {University.objects.count()}")
