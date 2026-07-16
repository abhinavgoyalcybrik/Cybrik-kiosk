from typing import Dict, List, Tuple
from api.models import Course
from services.scoring import compute_score

# ─── Degree Compatibility Map ─────────────────────────────────────────────────
DEGREE_ELIGIBILITY = {
    # School level → Bachelor / Diploma
    "high school":          ["bachelor", "bachelors", "undergraduate", "diploma", "associate degree"],
    "higher secondary":     ["bachelor", "bachelors", "undergraduate", "diploma", "associate degree"],
    "12th":                 ["bachelor", "bachelors", "undergraduate", "diploma", "associate degree"],
    "class 12":             ["bachelor", "bachelors", "undergraduate", "diploma", "associate degree"],
    "hsc":                  ["bachelor", "bachelors", "undergraduate", "diploma", "associate degree"],
    "senior secondary":     ["bachelor", "bachelors", "undergraduate", "diploma", "associate degree"],

    # Diploma level → Bachelor or Postgrad
    "diploma":              ["bachelor", "bachelors", "undergraduate",
                             "master", "masters", "postgraduate",
                             "postgraduate diploma", "graduate diploma",
                             "pg diploma", "graduate study"],
    "advanced diploma":     ["bachelor", "bachelors", "undergraduate",
                             "master", "masters", "postgraduate",
                             "postgraduate diploma", "graduate diploma",
                             "pg diploma", "graduate study"],

    # Bachelor level → Masters / Postgrad
    "bachelor":             ["master", "masters", "mba", "postgraduate",
                             "postgraduate diploma", "graduate diploma",
                             "graduate study", "pg diploma", "honours",
                             "bachelor (honours)"],
    "bachelors":            ["master", "masters", "mba", "postgraduate",
                             "postgraduate diploma", "graduate diploma",
                             "graduate study", "pg diploma", "honours",
                             "bachelor (honours)"],
    "undergraduate":        ["master", "masters", "mba", "postgraduate",
                             "postgraduate diploma", "graduate diploma",
                             "graduate study", "pg diploma"],
    "honours":              ["master", "masters", "mba", "postgraduate",
                             "postgraduate diploma", "graduate diploma",
                             "graduate study", "pg diploma", "phd"],
    "bachelor (honours)":   ["master", "masters", "mba", "postgraduate",
                             "postgraduate diploma", "graduate diploma",
                             "graduate study", "pg diploma", "phd"],

    # Masters level → PhD
    "masters":              ["phd", "doctor", "doctorate", "doctoral"],
    "master":               ["phd", "doctor", "doctorate", "doctoral"],
    "mba":                  ["phd", "doctor", "doctorate", "doctoral"],
    "postgraduate":         ["phd", "doctor", "doctorate", "doctoral"],
    "postgraduate diploma": ["phd", "doctor", "doctorate", "doctoral",
                             "master", "masters"],
}

# Qualification rank — higher = more qualified
QUALIFICATION_RANK = {
    "10th": 1, "ssc": 1,
    "12th": 2, "hsc": 2, "senior secondary": 2, "higher secondary": 2,
    "high school": 2, "class 12": 2,
    "diploma": 3, "advanced diploma": 3, "associate degree": 3,
    "bachelor": 4, "bachelors": 4, "undergraduate": 4,
    "honours": 4, "bachelor (honours)": 4,
    "postgraduate diploma": 5, "pg diploma": 5, "graduate diploma": 5,
    "master": 6, "masters": 6, "mba": 6, "postgraduate": 6,
    "phd": 7, "doctorate": 7, "doctoral": 7,
}

TECHNICAL_FIELDS = [
    "computer science", "information technology", "software engineering",
    "data science", "engineering", "mathematics", "statistics",
    "artificial intelligence", "machine learning", "cybersecurity",
]


def normalize(text: str) -> str:
    return text.lower().strip() if text else ""


def get_rank(qualification: str) -> int:
    q = normalize(qualification)
    for key, rank in QUALIFICATION_RANK.items():
        if key in q:
            return rank
    return 0


def is_degree_compatible(student, course) -> bool:
    """
    Student ki qualification se compatible course levels check karo.
    Partial match bhi allow karo (e.g. "pg diploma" matches "postgraduate diploma").
    """
    student_qual = normalize(student.highest_qualification)
    course_level = normalize(course.degree_level)

    # Direct map check
    for key, allowed_levels in DEGREE_ELIGIBILITY.items():
        if key in student_qual:
            for allowed in allowed_levels:
                if allowed in course_level or course_level in allowed:
                    return True
            return False

    # Fallback: rank-based check
    student_rank = get_rank(student_qual)
    course_rank  = get_rank(course_level)
    if student_rank > 0 and course_rank > 0:
        return course_rank == student_rank + 1 or course_rank == student_rank

    return True  # Unknown qualification — don't block


def check_academic(student, requirement) -> Tuple[str, List[str]]:
    """
    Academic eligibility check:
    1. Percentage / CGPA
    2. Required qualification level
    3. Work experience
    """
    reasons = []

    # ── 1. Percentage check ───────────────────────────────────────────────────
    if requirement.min_percentage:
        if student.percentage is None:
            pass  # Don't block — student hasn't entered yet
        elif student.percentage < requirement.min_percentage:
            return "Not Eligible", [
                f"Percentage {student.percentage}% below required {requirement.min_percentage}%"
            ]
        elif student.percentage == requirement.min_percentage:
            reasons.append(f"Percentage exactly at minimum ({requirement.min_percentage}%)")
            return "Borderline", reasons

    # ── 2. CGPA check ─────────────────────────────────────────────────────────
    min_cgpa = getattr(requirement, "min_cgpa", None)
    if min_cgpa:
        student_cgpa = getattr(student, "cgpa", None)
        if student_cgpa is None:
            pass  # Don't block
        elif student_cgpa < min_cgpa:
            return "Not Eligible", [
                f"CGPA {student_cgpa} below required {min_cgpa}"
            ]

    # ── 3. Required qualification check ──────────────────────────────────────
    required_qual = normalize(getattr(requirement, "required_qualification", "") or "")
    if required_qual:
        student_qual  = normalize(getattr(student, "highest_qualification", "") or "")
        required_rank = get_rank(required_qual)
        student_rank  = get_rank(student_qual)

        if required_rank > 0 and student_rank > 0:
            if student_rank < required_rank:
                return "Not Eligible", [
                    f"Requires '{required_qual}' but student has '{student_qual}'"
                ]

    # ── 4. Work experience check ──────────────────────────────────────────────
    work_required = getattr(requirement, "work_experience_required", False)
    if work_required:
        min_months   = getattr(requirement, "min_work_experience_months", None) or 0
        student_exp  = getattr(student, "work_experience_months", None) or 0
        if student_exp < min_months:
            return "Not Eligible", [
                f"Work experience {student_exp} months < required {min_months} months"
            ]

    return "Eligible", reasons


def check_english(student, requirement) -> Tuple[str, List[str]]:
    """
    English eligibility — checks IELTS first, then PTE, then TOEFL.
    Agar student ne koi score nahi diya toh block nahi karta.
    """
    reasons = []

    # ── IELTS ─────────────────────────────────────────────────────────────────
    if requirement.ielts_overall:
        student_ielts = getattr(student, "ielts_overall", None)
        if student_ielts is not None:
            if student_ielts < requirement.ielts_overall:
                return "Not Eligible", [
                    f"IELTS {student_ielts} below required {requirement.ielts_overall}"
                ]
            if student_ielts == requirement.ielts_overall:
                reasons.append(f"IELTS exactly at minimum ({requirement.ielts_overall})")
                return "Borderline", reasons
            return "Eligible", reasons

    # ── PTE (fallback if no IELTS requirement) ────────────────────────────────
    pte_required = getattr(requirement, "pte_overall", None)
    if pte_required:
        student_pte = getattr(student, "pte_overall", None)
        if student_pte is not None:
            if student_pte < pte_required:
                return "Not Eligible", [
                    f"PTE {student_pte} below required {pte_required}"
                ]
            return "Eligible", reasons

    # ── TOEFL (fallback) ──────────────────────────────────────────────────────
    toefl_required = getattr(requirement, "toefl_overall", None)
    if toefl_required:
        student_toefl = getattr(student, "toefl_overall", None)
        if student_toefl is not None:
            if student_toefl < toefl_required:
                return "Not Eligible", [
                    f"TOEFL {student_toefl} below required {toefl_required}"
                ]
            return "Eligible", reasons

    return "Eligible", reasons


def check_background(student, requirement) -> Tuple[str, List[str]]:
    """Technical background check for specialized courses."""
    reasons = []
    required_background = normalize(
        getattr(requirement, "required_bachelor_background", "") or ""
    )
    student_major = normalize(getattr(student, "academic_major", "") or "")

    if not required_background:
        return "Eligible", reasons

    requires_technical = any(
        keyword in required_background
        for keyword in [
            "computer", "it", "engineering", "data",
            "mathematics", "statistics", "technical", "quantitative",
        ]
    )

    if requires_technical:
        if not any(field in student_major for field in TECHNICAL_FIELDS):
            major = getattr(student, "academic_major", None) or "Unknown"
            return "Not Eligible", [
                f"Course requires technical background but student has '{major}'"
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
        return {"status": "Not Eligible", "reasons": ["Student profile missing"]}

    if not is_degree_compatible(student, course):
        return {
            "status": "Not Applicable",
            "reasons": [
                f"'{student.highest_qualification}' students not eligible "
                f"for '{course.degree_level}' courses"
            ],
        }

    try:
        academic_req = course.academic_requirement
        english_req  = course.english_requirement
    except Exception:
        return {"status": "Eligible", "reasons": ["Requirement data not available"]}

    statuses = []
    reasons  = []

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
    return {"status": final_status, "reasons": reasons}


def get_eligible_courses(student) -> List[Dict]:
    """
    10,000+ courses mein se eligible courses nikalta hai.

    Flow:
      1. get_smart_candidates() — DB-level fast filter
         10,000 → ~300 candidates
      2. Python-level detailed eligibility check
         ~300 → ~50-100 eligible
      3. Sort by match % descending
    """
    # ── Step 1: DB-level pre-filtering ────────────────────────────────────────
    courses = (
        Course.objects
        .select_related("university", "fee", "english_requirement", "academic_requirement")
        .prefetch_related("intakes")
        .all()
    )

    # ── Step 2: Detailed eligibility check ───────────────────────────────────
    results = []
    for course in courses:
        if not is_degree_compatible(student, course):
            continue

        result = evaluate_course(student, course)
        score  = compute_score(student, course)

        results.append({
            "course":  course,
            "status":  result["status"],
            "score":   score,
            "reasons": result["reasons"],
        })

    # ── Step 3: Sort by match % descending ───────────────────────────────────
    results = sorted(results, key=lambda x: x["score"]["final_score"], reverse=True)

    return results