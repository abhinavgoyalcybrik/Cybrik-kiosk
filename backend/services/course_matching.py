from decimal import Decimal, InvalidOperation

from django.core.exceptions import ObjectDoesNotExist

from .normalization import normalize_city, normalize_degree, normalize_field, normalize_intake


PREFERENCE_WEIGHTS = {
    "country": 15, "degree_level": 15, "field_of_study": 15, "intake": 10,
    "tuition_fee": 10, "city": 8, "university": 8, "study_mode": 5,
    "duration": 5, "campus": 3, "scholarship": 3, "accommodation": 1.5,
    "institution_type": .75, "ownership": .75, "course_or_field": 15,
}


def related(instance, name):
    try:
        return getattr(instance, name)
    except ObjectDoesNotExist:
        return None


def text_match(actual, expected):
    actual, expected = str(actual or "").casefold().strip(), str(expected or "").casefold().strip()
    if not actual:
        return None
    if actual == expected:
        return 1
    return .5 if expected in actual or actual in expected else 0


def preference_match(course, profile):
    factors = []
    fee = related(course, "fee")
    values = {
        "country": (course.university.country, profile.get("preferred_countries")),
        "university": (course.university.name, profile.get("preferred_universities") or profile.get("preferred_university")),
        "city": (normalize_city(course.university.city), profile.get("preferred_cities")),
        "degree_level": (normalize_degree(course.degree_level), profile.get("preferred_degree")),
        "field_of_study": (normalize_field(course.field_of_study), profile.get("preferred_field")),
        "study_mode": (course.mode, profile.get("preferred_mode")),
        "campus": (course.campus, profile.get("preferred_campus")),
        "institution_type": (course.university.institution_type, profile.get("preferred_institution_type")),
        "ownership": (course.university.ownership_type, profile.get("preferred_ownership")),
        "course_or_field": (course.title, profile.get("preferred_course")),
    }
    for name, (actual, expected) in values.items():
        if expected in (None, "", []):
            continue
        choices = expected if isinstance(expected, list) else [expected]
        scores = [text_match(actual, item) for item in choices]
        score = max((item for item in scores if item is not None), default=None)
        factors.append((name, score, actual))

    if profile.get("preferred_intake"):
        wanted = normalize_intake(profile["preferred_intake"]).months
        available = {m for intake in course.intakes.all() for m in normalize_intake(intake.intake_month).months}
        factors.append(("intake", None if not available else float(bool(set(wanted) & available)), sorted(available)))
    if profile.get("preferred_duration_months") is not None:
        actual = course.duration_months
        preferred = int(profile["preferred_duration_months"])
        factors.append(("duration", None if actual is None else float(actual <= preferred), actual))
    if profile.get("scholarship_required"):
        factors.append(("scholarship", float(course.university.scholarship_available), course.university.scholarship_available))
    if profile.get("accommodation_preferred"):
        factors.append(("accommodation", float(course.university.accommodation_available), course.university.accommodation_available))

    selected_currency = str(profile.get("fee_currency") or "").upper()
    if profile.get("max_tuition_fee") is not None or profile.get("min_tuition_fee") is not None:
        if not selected_currency or not fee or not fee.currency or fee.currency.upper() != selected_currency or fee.tuition_fee is None:
            factors.append(("tuition_fee", None, fee.currency if fee else None))
        else:
            amount = Decimal(fee.tuition_fee)
            minimum = Decimal(str(profile.get("min_tuition_fee") or 0))
            maximum = Decimal(str(profile.get("max_tuition_fee") or amount))
            factors.append(("tuition_fee", float(minimum <= amount <= maximum), float(amount)))

    applicable = [(name, score, actual) for name, score, actual in factors if score is not None]
    denominator = sum(PREFERENCE_WEIGHTS[name] for name, _, _ in applicable)
    numerator = sum(PREFERENCE_WEIGHTS[name] * score for name, score, _ in applicable)
    percentage = round(numerator / denominator * 100, 1) if denominator else 0
    bucket = lambda score: "matched_factors" if score == 1 else "partial_factors" if score else "unmatched_factors"
    result = {"percentage": percentage, "matched_factors": [], "partial_factors": [], "unmatched_factors": [], "unavailable_factors": []}
    for name, score, actual in factors:
        target = "unavailable_factors" if score is None else bucket(score)
        result[target].append({"factor": name, "actual": actual})
    return result


def academic_eligibility(course, profile):
    requirement = related(course, "academic_requirement")
    if not requirement:
        return {"status": "requirement_unavailable", "reasons": ["Academic requirement data is unavailable."]}
    comparisons, reasons = [], []
    if requirement.min_percentage is not None and profile.get("percentage") is not None:
        comparisons.append(float(profile["percentage"]) >= requirement.min_percentage)
        reasons.append(f"Minimum percentage: {requirement.min_percentage:g}%")
    if requirement.min_cgpa is not None and profile.get("cgpa") is not None:
        comparisons.append(float(profile["cgpa"]) >= requirement.min_cgpa)
        reasons.append(f"Minimum CGPA: {requirement.min_cgpa:g}")
    if not comparisons:
        return {"status": "requires_manual_review", "reasons": [requirement.required_qualification or "No directly comparable academic threshold is available."]}
    return {"status": "eligible" if all(comparisons) else "not_currently_eligible", "reasons": reasons}


def english_eligibility(course, profile):
    requirement = related(course, "english_requirement")
    if not requirement:
        return {"status": "requirement_unavailable", "requirements": [], "student_scores": None, "gaps": []}
    requirements = {name: getattr(requirement, f"{name}_overall") for name in ("ielts", "pte", "toefl", "duolingo") if getattr(requirement, f"{name}_overall") is not None}
    test = str(profile.get("english_test_type") or "").casefold()
    score = profile.get("english_overall")
    if test in {"", "not taken", "none yet"} or score in (None, ""):
        status = "test_planned" if "plan" in test else "test_not_provided"
        return {"status": status, "requirements": requirements, "student_scores": None, "gaps": []}
    required = requirements.get(test)
    if required is None:
        return {"status": "alternative_test_may_be_accepted", "requirements": requirements, "student_scores": {test: score}, "gaps": []}
    gap = round(required - float(score), 2)
    return {"status": "meets_requirement" if gap <= 0 else "below_requirement", "requirements": requirements, "student_scores": {test: float(score)}, "gaps": [] if gap <= 0 else [{"test": test, "gap": gap}]}
