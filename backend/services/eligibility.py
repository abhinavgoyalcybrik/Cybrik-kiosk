from typing import Dict, List, Tuple
from api.models import Course
from services.scoring import compute_score

DEGREE_ELIGIBILITY = {
    "high school": ["bachelors"],
    "higher secondary": ["bachelors"],
    "12th": ["bachelors"],
    "class 12": ["bachelors"],
    "bachelor": ["masters"],
    "bachelors": ["masters"],
    "undergraduate": ["masters"],
    "masters": ["phd"],
    "master": ["phd"],
}


TECHNICAL_FIELDS = [
    "computer science",
    "information technology",
    "software engineering",
    "data science",
    "engineering",
    "mathematics",
    "statistics",
    "artificial intelligence",
    "machine learning",
    "cybersecurity",
]


def normalize(text: str) -> str:
    return text.lower().strip() if text else ""


def is_degree_compatible(student, course) -> bool:
    student_qual = normalize(student.highest_qualification)
    course_level = normalize(course.degree_level)

    allowed_levels = DEGREE_ELIGIBILITY.get(student_qual, [])

    return course_level in allowed_levels


def check_academic(student, requirement) -> Tuple[str, List[str]]:
    reasons = []

    if requirement.min_percentage:
        if student.percentage is None:
            return "Not Eligible", ["Student percentage missing"]

        if student.percentage < requirement.min_percentage:
            return "Not Eligible", [
                f"Percentage {student.percentage} below required {requirement.min_percentage}"
            ]

        if student.percentage == requirement.min_percentage:
            return "Borderline", [
                f"Percentage exactly at minimum requirement ({requirement.min_percentage})"
            ]

    return "Eligible", reasons


def check_english(student, requirement) -> Tuple[str, List[str]]:
    reasons = []

    if requirement.ielts_overall:
        if student.ielts_overall is None:
            return "Not Eligible", ["IELTS score missing"]

        if student.ielts_overall < requirement.ielts_overall:
            return "Not Eligible", [
                f"IELTS {student.ielts_overall} below required {requirement.ielts_overall}"
            ]

        if student.ielts_overall == requirement.ielts_overall:
            return "Borderline", [
                f"IELTS exactly at minimum requirement ({requirement.ielts_overall})"
            ]

    return "Eligible", reasons


def check_background(student, requirement) -> Tuple[str, List[str]]:
    reasons = []

    required_background = normalize(requirement.required_bachelor_background)
    student_major = normalize(student.academic_major)

    if not required_background:
        return "Eligible", reasons

    requires_technical = any(
        keyword in required_background
        for keyword in [
            "computer",
            "it",
            "engineering",
            "data",
            "mathematics",
            "statistics",
            "technical",
            "quantitative",
        ]
    )

    if requires_technical:
        if not any(field in student_major for field in TECHNICAL_FIELDS):
            major = student.academic_major or "Unknown"
            return "Not Eligible", [
                f"Course requires technical background but student has {major}"
            ]

    return "Eligible", reasons


def combine_results(statuses: List[str]) -> str:
    if "Not Eligible" in statuses:
        return "Not Eligible"

    if "Borderline" in statuses:
        return "Borderline"

    return "Eligible"


def evaluate_course(student, course) -> Dict:
    if not student:
        return {
            "status": "Not Eligible",
            "reasons": ["Student profile missing"],
        }

    if not is_degree_compatible(student, course):
        return {
            "status": "Not Applicable",
            "reasons": [
                f"{student.highest_qualification} students are not eligible for {course.degree_level} courses"
            ],
        }

    try:
        academic_req = course.academic_requirement
        english_req = course.english_requirement
    except Exception:
        return {
            "status": "Not Eligible",
            "reasons": ["Missing requirement data"],
        }

    statuses = []
    reasons = []

    academic_status, academic_reasons = check_academic(student, academic_req)
    statuses.append(academic_status)
    reasons.extend(academic_reasons)

    english_status, english_reasons = check_english(student, english_req)
    statuses.append(english_status)
    reasons.extend(english_reasons)

    background_status, background_reasons = check_background(student, academic_req)
    statuses.append(background_status)
    reasons.extend(background_reasons)

    final_status = combine_results(statuses)

    return {
        "status": final_status,
        "reasons": reasons,
    }


def get_eligible_courses(student) -> List[Dict]:
    results = []

    courses = Course.objects.all()

    for course in courses:
        if not is_degree_compatible(student, course):
            continue

        result = evaluate_course(student, course)

        score = compute_score(student, course)

        results.append({
            "course": course,
            "status": result["status"],
            "score": score,
            "reasons": result["reasons"],
        })

    results = sorted(
    results,
    key=lambda x: x["score"]["final_score"],
    reverse=True
    )

    return results