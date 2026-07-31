from decimal import Decimal, InvalidOperation
import re

from django.core.exceptions import ObjectDoesNotExist

from .normalization import location_matches_city, normalize_city, normalize_degree, normalize_field, normalize_intake


PREFERENCE_WEIGHTS = {
    "country": 15, "degree_level": 15, "field_of_study": 15, "intake": 10,
    "tuition_fee": 10, "city": 8, "university": 8, "study_mode": 5,
    "duration": 5, "campus": 3, "scholarship": 3, "accommodation": 1.5,
    "institution_type": .75, "ownership": .75, "course_or_field": 15,
}

MATCHING_WEIGHTS = {
    "country": 10, "city": 8, "university": 8, "course": 10,
    "degree_level": 10, "field_of_study": 8, "intake": 8,
    "tuition_fee": 8, "study_mode": 4, "duration": 4,
    "academic_qualification": 8, "academic_score": 8,
    "work_experience": 3, "portfolio": 1, "sop": 1,
    "lor": .5, "resume": .5, "backlogs": 3,
}

FACTOR_LABELS = {
    "country": "Preferred Country", "city": "Preferred City",
    "university": "Preferred University", "course": "Preferred Course",
    "degree_level": "Preferred Degree Level", "field_of_study": "Field of Study",
    "intake": "Preferred Intake", "tuition_fee": "Tuition Fee",
    "study_mode": "Study Mode", "duration": "Course Duration",
    "academic_qualification": "Academic Qualification", "academic_score": "Academic Score",
    "work_experience": "Work Experience", "portfolio": "Portfolio",
    "sop": "Statement of Purpose", "lor": "Letters of Recommendation",
    "resume": "Résumé or CV", "backlogs": "Backlogs",
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
    preferred_cities = profile.get("preferred_cities")
    city_choices = preferred_cities if isinstance(preferred_cities, list) else [preferred_cities]
    matched_city = next(
        (
            normalize_city(choice) for choice in city_choices
            if choice and (
                location_matches_city(course.university.city, choice)
                or location_matches_city(course.campus, choice)
            )
        ),
        None,
    )
    values = {
        "country": (course.university.country, profile.get("preferred_countries")),
        "university": (course.university.name, profile.get("preferred_universities") or profile.get("preferred_university")),
        "city": (matched_city or normalize_city(course.university.city), preferred_cities),
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


def _factor(key, user_value, course_value, status, reason="", fraction=None):
    maximum = MATCHING_WEIGHTS[key]
    earned = maximum * fraction if fraction is not None else 0
    return {
        "key": key,
        "label": FACTOR_LABELS[key],
        "user_value": user_value,
        "course_value": course_value,
        "status": status,
        "reason": reason,
        "score": round(earned, 2),
        "maximum_score": maximum,
        "applicable": fraction is not None,
    }


def _text_factor(key, user_value, course_value):
    choices = user_value if isinstance(user_value, list) else [user_value]
    if not course_value:
        return _factor(key, user_value, None, "unavailable", f"{FACTOR_LABELS[key]} information is unavailable.")
    score = max((text_match(course_value, choice) for choice in choices if choice not in (None, "")), default=0)
    if score == 1:
        return _factor(key, user_value, course_value, "matched", "Exact match.", 1)
    if score and score > 0:
        return _factor(key, user_value, course_value, "partial", "The available value is related but not exact.", score)
    return _factor(key, user_value, course_value, "not_matched", "The course value does not match your preference.", 0)


def _qualification_level(value):
    text = str(value or "").casefold().replace("’", "'")
    levels = []
    if any(word in text for word in ("doctor", "phd")): levels.append(4)
    if any(word in text for word in ("master", "postgraduate")): levels.append(3)
    if any(word in text for word in ("bachelor", "undergraduate", "graduate diploma")): levels.append(2)
    lower_level_text = text.replace("graduate diploma", "").replace("postgraduate diploma", "")
    if any(word in lower_level_text for word in ("diploma", "certificate", "ncea", "secondary", "school", "university entrance")): levels.append(1)
    return min(levels) if levels else None


def _academic_requirement_text(requirement):
    if not requirement:
        return ""
    return str(requirement.required_qualification or requirement.required_bachelor_background or "").strip()


def _explicit_score_requirements(requirement):
    text = _academic_requirement_text(requirement)
    percentages = [float(value) for value in re.findall(r"(?<!\d)(\d{2}(?:\.\d+)?)\s*%", text)]
    cgpas = []
    patterns = (
        r"(?:cgpa|gpa)[^.;,]{0,35}?(\d+(?:\.\d+)?)\s*(?:on|out of)\s*(?:a\s*)?(\d+(?:\.\d+)?)",
        r"(?:cgpa|gpa)[^.;,]{0,35}?(\d+(?:\.\d+)?)\s*(?:on\s*)?(\d+)[- ]point scale",
    )
    for pattern in patterns:
        cgpas.extend((float(score), float(scale)) for score, scale in re.findall(pattern, text, re.IGNORECASE))
    return percentages, cgpas


def calculate_course_match(course, profile):
    """Calculate an applicable-factor score. English is intentionally excluded."""
    factors = []
    university = course.university
    fee = related(course, "fee")
    academic = related(course, "academic_requirement")
    documents = related(course, "document_requirement")

    preference_values = (
        ("country", profile.get("preferred_countries"), university.country),
        ("university", profile.get("preferred_university") or profile.get("preferred_universities"), university.name),
        ("course", profile.get("preferred_course"), course.title),
        ("degree_level", profile.get("preferred_degree"), normalize_degree(course.degree_level)),
        ("field_of_study", profile.get("preferred_field"), normalize_field(course.field_of_study)),
        ("study_mode", profile.get("preferred_mode"), course.mode),
    )
    for key, wanted, actual in preference_values:
        if wanted not in (None, "", []):
            factors.append(_text_factor(key, wanted, actual))

    wanted_cities = profile.get("preferred_cities") or []
    if wanted_cities:
        actual_location = normalize_city(university.city) or course.campus or None
        matched = any(location_matches_city(university.city, city) or location_matches_city(course.campus, city) for city in wanted_cities)
        if not actual_location:
            factors.append(_factor("city", wanted_cities, None, "unavailable", "Course location is not specified."))
        else:
            factors.append(_factor("city", wanted_cities, actual_location, "matched" if matched else "not_matched", "Location matches your selected city." if matched else "Course location differs from your selected city.", 1 if matched else 0))

    if profile.get("preferred_intake"):
        wanted = normalize_intake(profile["preferred_intake"]).months
        available = sorted({month for intake in course.intakes.all() for month in normalize_intake(intake.intake_month).months})
        if not available:
            factors.append(_factor("intake", profile["preferred_intake"], None, "unavailable", "Intake information is unavailable."))
        else:
            matched = bool(set(wanted) & set(available))
            factors.append(_factor("intake", profile["preferred_intake"], available, "matched" if matched else "not_matched", "Preferred intake is available." if matched else "Preferred intake is not listed for this course.", 1 if matched else 0))

    if profile.get("preferred_duration_months") is not None:
        wanted = int(profile["preferred_duration_months"])
        if course.duration_months is None:
            factors.append(_factor("duration", wanted, None, "unavailable", "Course duration is unavailable."))
        else:
            difference = course.duration_months - wanted
            fraction = 1 if difference <= 0 else .5 if difference <= 6 else 0
            status = "matched" if fraction == 1 else "partial" if fraction else "not_matched"
            factors.append(_factor("duration", f"Up to {wanted} months", f"{course.duration_months} months", status, "Duration is within your preference." if fraction == 1 else "Course duration exceeds your preference.", fraction))

    selected_currency = str(profile.get("fee_currency") or "").upper()
    if profile.get("max_tuition_fee") is not None:
        if not fee or fee.tuition_fee is None or not fee.currency:
            factors.append(_factor("tuition_fee", profile.get("max_tuition_fee"), None, "unavailable", "Tuition information is unavailable."))
        elif not selected_currency or fee.currency.upper() != selected_currency:
            factors.append(_factor("tuition_fee", f"{selected_currency or 'Currency not provided'} {profile['max_tuition_fee']}", f"{fee.currency} {fee.tuition_fee}", "review", "Currencies cannot be compared without a verified conversion."))
        else:
            matched = Decimal(fee.tuition_fee) <= Decimal(str(profile["max_tuition_fee"]))
            factors.append(_factor("tuition_fee", f"{selected_currency} {profile['max_tuition_fee']}", f"{fee.currency} {fee.tuition_fee}", "matched" if matched else "not_matched", "Tuition is within budget." if matched else "Tuition exceeds your maximum budget.", 1 if matched else 0))

    qualification = profile.get("qualification") or profile.get("highest_qualification")
    if qualification:
        requirement_text = _academic_requirement_text(academic)
        if not requirement_text:
            factors.append(_factor("academic_qualification", qualification, None, "unavailable", "Academic qualification requirement is not specified."))
        else:
            student_level, required_level = _qualification_level(qualification), _qualification_level(requirement_text)
            if student_level is None or required_level is None:
                factors.append(_factor("academic_qualification", qualification, requirement_text, "review", "Qualification equivalency requires manual review."))
            else:
                matched = student_level >= required_level
                factors.append(_factor("academic_qualification", qualification, requirement_text, "matched" if matched else "not_matched", "Qualification level meets the published requirement." if matched else "Qualification level is below the published requirement.", 1 if matched else 0))

    student_score = profile.get("academic_score")
    grading_scale = profile.get("grading_scale")
    if student_score not in (None, ""):
        percentages, cgpas = _explicit_score_requirements(academic) if academic else ([], [])
        structured_percentage = academic.min_percentage if academic else None
        structured_cgpa = academic.min_cgpa if academic else None
        if structured_percentage is not None and structured_percentage not in percentages: percentages.append(float(structured_percentage))
        if structured_cgpa is not None and not cgpas: cgpas.append((float(structured_cgpa), 10.0))
        requirement_value = None
        if grading_scale == "percentage" and percentages:
            requirement_value = max(percentages)
            matched = float(student_score) >= requirement_value
            factors.append(_factor("academic_score", f"{student_score}%", f"Minimum {requirement_value:g}%", "matched" if matched else "not_matched", "Academic score meets the requirement." if matched else "Your academic score is below the course requirement.", 1 if matched else 0))
        elif grading_scale in {"cgpa_10", "gpa_4", "gpa_5"} and cgpas:
            scale = {"cgpa_10": 10, "gpa_4": 4, "gpa_5": 5}[grading_scale]
            compatible = [score for score, maximum in cgpas if maximum == scale]
            if compatible:
                requirement_value = max(compatible)
                matched = float(student_score) >= requirement_value
                factors.append(_factor("academic_score", f"{student_score}/{scale}", f"Minimum {requirement_value:g}/{scale}", "matched" if matched else "not_matched", "Academic score meets the requirement." if matched else "Your academic score is below the course requirement.", 1 if matched else 0))
        if requirement_value is None:
            requirement_text = _academic_requirement_text(academic) or None
            requirement_display = requirement_text or (f"Minimum {max(percentages):g}%" if percentages else ", ".join(f"Minimum {score:g}/{scale:g}" for score, scale in cgpas) if cgpas else None)
            factors.append(_factor("academic_score", f"{student_score} ({grading_scale or 'scale not provided'})", requirement_display, "review" if requirement_display else "unavailable", "The grading systems are incompatible or no structured score threshold is available; manual review is required." if requirement_display else "Academic score requirement is not specified."))

    if academic and academic.work_experience_required:
        required_months = academic.min_work_experience_months
        student_months = profile.get("work_experience_months")
        if required_months is None or student_months in (None, ""):
            factors.append(_factor("work_experience", student_months, required_months, "review", "Work-experience information is incomplete."))
        else:
            matched = int(student_months) >= required_months
            factors.append(_factor("work_experience", f"{student_months} months", f"Minimum {required_months} months", "matched" if matched else "not_matched", "Work experience meets the requirement." if matched else "Your work experience is below the course requirement.", 1 if matched else 0))

    available_documents = set(profile.get("available_documents") or [])
    document_fields = (("portfolio", "portfolio_required"), ("sop", "sop_required"), ("lor", "lor_required"), ("resume", "resume_required"))
    if documents:
        for key, field in document_fields:
            if getattr(documents, field):
                if "available_documents" not in profile:
                    factors.append(_factor(key, None, "Required", "review", f"Confirm whether your {FACTOR_LABELS[key]} is available."))
                else:
                    matched = key in available_documents
                    factors.append(_factor(key, "Available" if matched else "Not available", "Required", "matched" if matched else "not_matched", "Required document is available." if matched else "This required document is not available yet.", 1 if matched else 0))

    applicable = [factor for factor in factors if factor["applicable"]]
    denominator = sum(float(factor["maximum_score"]) for factor in applicable)
    numerator = sum(float(factor["score"]) for factor in applicable)
    percentage = round(numerator / denominator * 100, 1) if denominator else 0
    groups = {
        "matched_factors": [factor for factor in factors if factor["status"] == "matched"],
        "partial_factors": [factor for factor in factors if factor["status"] == "partial"],
        "unmatched_factors": [factor for factor in factors if factor["status"] == "not_matched"],
        "review_factors": [factor for factor in factors if factor["status"] in {"review", "unavailable"}],
    }
    return {
        "percentage": percentage,
        "match_summary": {
            "matched_count": len(groups["matched_factors"]),
            "not_matched_count": len(groups["unmatched_factors"]),
            "partial_count": len(groups["partial_factors"]),
            "review_count": len(groups["review_factors"]),
        },
        **groups,
    }


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
        return {"status": "requires_manual_review", "reasons": [_academic_requirement_text(requirement) or "No directly comparable academic threshold is available."]}
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
