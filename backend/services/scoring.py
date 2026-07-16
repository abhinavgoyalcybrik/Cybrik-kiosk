def normalize(text):
    return text.lower().strip() if text else ""


STREAM_COURSE_MAP = {
    "non-medical": [
        "computer science", "data science", "information technology",
        "engineering", "software", "artificial intelligence", "cybersecurity",
    ],
    "medical": [
        "health", "biomedical", "biology", "nursing", "public health", "psychology",
    ],
    "commerce": [
        "business", "business analytics", "finance", "accounting",
        "management", "economics", "marketing",
    ],
    "arts": [
        "arts", "humanities", "media", "communication",
        "design", "education", "social science",
    ],
    "humanities": [
        "arts", "humanities", "media", "communication", "education", "social science",
    ],
    "engineering": [
        "engineering", "mechanical", "civil", "electrical", "computer",
        "software", "data science", "artificial intelligence",
    ],
    "business": [
        "business", "mba", "finance", "accounting", "management",
        "economics", "marketing", "commerce",
    ],
    "computer science": [
        "computer science", "software", "data science", "information technology",
        "artificial intelligence", "cybersecurity", "machine learning",
    ],
    "health sciences": [
        "health", "nursing", "medicine", "public health", "biomedical",
        "pharmacy", "psychology",
    ],
}

# Field of study aliases — what student picks on frontend → maps to stream
FIELD_ALIASES = {
    "cs": "computer science",
    "it": "computer science",
    "computer science": "computer science",
    "data science": "computer science",
    "engineering": "engineering",
    "business": "business",
    "commerce": "commerce",
    "medical": "medical",
    "health sciences": "health sciences",
    "arts": "arts",
    "humanities": "humanities",
    "cyber security": "computer science",
    "cybersecurity": "computer science",
    "artificial intelligence": "computer science",
}

# English test score normalization to IELTS equivalent
def normalize_english_score(student):
    """Convert any english test score to IELTS equivalent for scoring."""
    if getattr(student, "ielts_overall", None) is not None:
        return student.ielts_overall, "ielts"
    if getattr(student, "pte_overall", None) is not None:
        # PTE to IELTS approximate mapping
        pte = student.pte_overall
        if pte >= 79:   return 9.0, "pte"
        if pte >= 73:   return 8.5, "pte"
        if pte >= 65:   return 8.0, "pte"
        if pte >= 58:   return 7.5, "pte"
        if pte >= 50:   return 7.0, "pte"
        if pte >= 43:   return 6.5, "pte"
        if pte >= 36:   return 6.0, "pte"
        if pte >= 30:   return 5.5, "pte"
        return 5.0, "pte"
    if getattr(student, "toefl_overall", None) is not None:
        # TOEFL to IELTS approximate mapping
        toefl = student.toefl_overall
        if toefl >= 110: return 8.5, "toefl"
        if toefl >= 102: return 8.0, "toefl"
        if toefl >= 94:  return 7.5, "toefl"
        if toefl >= 83:  return 7.0, "toefl"
        if toefl >= 72:  return 6.5, "toefl"
        if toefl >= 60:  return 6.0, "toefl"
        if toefl >= 46:  return 5.5, "toefl"
        return 5.0, "toefl"
    if getattr(student, "duolingo_overall", None) is not None:
        duo = student.duolingo_overall
        if duo >= 130: return 8.0, "duolingo"
        if duo >= 120: return 7.5, "duolingo"
        if duo >= 110: return 7.0, "duolingo"
        if duo >= 100: return 6.5, "duolingo"
        if duo >= 90:  return 6.0, "duolingo"
        return 5.5, "duolingo"
    return None, None


def score_academic(student):
    """Score based on percentage or CGPA."""
    percentage = getattr(student, "percentage", None)
    cgpa = getattr(student, "cgpa", None)

    if percentage is not None:
        return min(percentage, 100) * 0.3  # max 30

    if cgpa is not None:
        # Convert CGPA (out of 10) to percentage equivalent
        pct_equiv = min(cgpa * 10, 100)
        return pct_equiv * 0.3  # max 30

    return 0


def score_english(student):
    """Score based on any english test — IELTS, PTE, TOEFL, Duolingo."""
    score, _ = normalize_english_score(student)
    if score is None:
        return 0
    return min(score * 5, 35)  # max 35


def score_stream_relevance(student, course):
    """Score based on student's academic stream / field of interest vs course."""
    # Check preferred_field first (what student picks on frontend)
    preferred_field = normalize(getattr(student, "preferred_field", "") or "")
    stream = normalize(getattr(student, "academic_stream", "") or "")

    # Map field alias to stream
    mapped = FIELD_ALIASES.get(preferred_field) or FIELD_ALIASES.get(stream) or stream or preferred_field

    course_field = normalize(course.field_of_study)
    course_title = normalize(course.title)

    if not mapped:
        return 5

    relevant_keywords = STREAM_COURSE_MAP.get(mapped, [])
    if not relevant_keywords:
        # Direct keyword match
        if mapped in course_field or mapped in course_title:
            return 20
        return 5

    for keyword in relevant_keywords:
        if keyword in course_field or keyword in course_title:
            return 20

    return 2


def score_subject_relevance(student, course):
    course_text = (
        f"{normalize(course.title)} "
        f"{normalize(course.field_of_study)} "
        f"{normalize(course.course_summary)}"
    )
    subjects = getattr(student, "subjects_studied", None) or []
    if not subjects:
        return 5
    score = 0
    for subject in subjects:
        subject = normalize(subject)
        if subject and subject in course_text:
            score += 5
    return min(score, 15)


def score_career_alignment(student, course):
    career_goal = normalize(getattr(student, "career_goal", "") or "")
    course_text = (
        f"{normalize(course.title)} "
        f"{normalize(course.field_of_study)} "
        f"{normalize(course.career_outcomes)}"
    )
    if not career_goal:
        return 5
    career_words = career_goal.split()
    matched_words = [w for w in career_words if len(w) > 3 and w in course_text]
    if len(matched_words) >= 2:
        return 10
    if len(matched_words) == 1:
        return 5
    return 2


def score_budget(student, course):
    """Score based on budget fit — supports INR to foreign currency conversion."""
    try:
        fee = course.fee.tuition_fee
        currency = (course.fee.currency or "").upper()
    except Exception:
        return 5

    budget = getattr(student, "max_budget", None)
    if budget is None or fee is None:
        return 5

    # Convert student budget (INR lakh) to course currency
    # Approximate conversion rates
    INR_TO = {
        "AUD": 0.018,
        "NZD": 0.020,
        "CAD": 0.016,
        "GBP": 0.010,
        "USD": 0.012,
        "EUR": 0.011,
        "SGD": 0.016,
    }

    budget_in_inr = float(budget)
    # If budget looks like lakhs (< 1000), convert to actual INR
    if budget_in_inr < 10000:
        budget_in_inr = budget_in_inr * 100000  # lakhs to INR

    rate = INR_TO.get(currency)
    if rate:
        budget_converted = budget_in_inr * rate
    else:
        budget_converted = budget_in_inr  # same currency assumed

    if fee <= budget_converted:
        return 10
    if fee <= budget_converted * 1.2:
        return 5
    return 0


def score_country(student, course):
    preferred_countries = getattr(student, "preferred_countries", None) or []
    if not preferred_countries:
        return 5
    university_country = normalize(course.university.country)
    for country in preferred_countries:
        if normalize(country) in university_country:
            return 10
    return 2


def score_city(student, course):
    preferred_cities = getattr(student, "preferred_cities", None) or []
    if not preferred_cities:
        return 5
    university_city = normalize(course.university.city)
    for city in preferred_cities:
        if normalize(city) in university_city:
            return 5
    return 1


def score_backlogs(student, course):
    """Penalize if student has backlogs beyond course limit."""
    total_backlogs = getattr(student, "total_backlogs", None)
    active_backlogs = getattr(student, "active_backlogs", None)

    if total_backlogs is None:
        return 5  # neutral if not provided

    try:
        req = course.academic_requirement
        backlog_limit = req.backlog_limit
        active_allowed = req.active_backlog_allowed
    except Exception:
        return 5

    # Active backlogs check
    if active_backlogs and active_backlogs > 0 and not active_allowed:
        return 0  # hard fail

    if backlog_limit is not None:
        if total_backlogs == 0:
            return 10  # clean academic record
        if total_backlogs <= backlog_limit:
            return 5  # within limit
        return 0  # exceeds limit

    if total_backlogs == 0:
        return 10
    if total_backlogs <= 3:
        return 5
    return 2


def score_work_experience(student, course):
    """Score based on work experience vs course requirement."""
    work_months = getattr(student, "work_experience_months", None)

    if work_months is None:
        return 3  # neutral

    try:
        req = course.academic_requirement
        required = req.work_experience_required
        min_months = req.min_work_experience_months or 0
    except Exception:
        # No requirement — any experience is a bonus
        if work_months > 0:
            return 8
        return 5

    if required:
        if work_months >= min_months:
            return 10
        if work_months >= min_months * 0.7:
            return 5
        return 0
    else:
        # Not required but having it is a bonus
        if work_months >= 24:
            return 8
        if work_months >= 12:
            return 6
        if work_months > 0:
            return 4
        return 3


def score_intake(student, course):
    """Score based on preferred intake match."""
    preferred_intake = normalize(getattr(student, "preferred_intake", "") or "")
    if not preferred_intake:
        return 3  # neutral

    intakes = list(course.intakes.all())
    if not intakes:
        return 3

    intake_months = [normalize(i.intake_month) for i in intakes]

    # Map intake season to months
    INTAKE_MAP = {
        "fall": ["september", "october", "august"],
        "winter": ["january", "february", "december"],
        "spring": ["march", "april", "may"],
        "summer": ["june", "july"],
    }

    # Direct month match
    if preferred_intake in intake_months:
        return 8

    # Season match
    for season, months in INTAKE_MAP.items():
        if season in preferred_intake:
            if any(m in intake_months for m in months):
                return 6

    # Partial match
    for month in intake_months:
        if month in preferred_intake or preferred_intake in month:
            return 5

    return 1


def score_duration(student, course):
    """Score based on preferred course duration."""
    preferred_duration = getattr(student, "preferred_duration_months", None)
    if preferred_duration is None:
        return 3  # neutral

    course_duration = course.duration_months
    if course_duration is None:
        return 3

    diff = abs(course_duration - preferred_duration)
    if diff == 0:
        return 5
    if diff <= 3:
        return 4
    if diff <= 6:
        return 3
    if diff <= 12:
        return 2
    return 1


def compute_score_breakdown(student, course):
    breakdown = {}
    total_weight = 0
    total_score = 0

    # ── Academic (% or CGPA) ──────────────────────────────────────────────────
    percentage = getattr(student, "percentage", None)
    cgpa = getattr(student, "cgpa", None)
    if percentage is not None or cgpa is not None:
        val = score_academic(student)
        breakdown["academic"] = round(val, 2)
        total_score += val
        total_weight += 30

    # ── English (IELTS / PTE / TOEFL / Duolingo) ─────────────────────────────
    eng_score, eng_type = normalize_english_score(student)
    if eng_score is not None:
        val = score_english(student)
        breakdown[f"english_{eng_type}"] = round(val, 2)
        total_score += val
        total_weight += 35

    # ── Stream / Field of Study ───────────────────────────────────────────────
    preferred_field = getattr(student, "preferred_field", None)
    stream = getattr(student, "academic_stream", None)
    if preferred_field or stream:
        val = score_stream_relevance(student, course)
        breakdown["stream_relevance"] = round(val, 2)
        total_score += val
        total_weight += 20

    # ── Subjects studied ──────────────────────────────────────────────────────
    if getattr(student, "subjects_studied", None):
        val = score_subject_relevance(student, course)
        breakdown["subject_relevance"] = round(val, 2)
        total_score += val
        total_weight += 15

    # ── Career goal ───────────────────────────────────────────────────────────
    if getattr(student, "career_goal", None):
        val = score_career_alignment(student, course)
        breakdown["career_alignment"] = round(val, 2)
        total_score += val
        total_weight += 10

    # ── Budget ───────────────────────────────────────────────────────────────
    if getattr(student, "max_budget", None) is not None:
        val = score_budget(student, course)
        breakdown["budget_fit"] = round(val, 2)
        total_score += val
        total_weight += 10

    # ── Country ───────────────────────────────────────────────────────────────
    if getattr(student, "preferred_countries", None):
        val = score_country(student, course)
        breakdown["country_preference"] = round(val, 2)
        total_score += val
        total_weight += 10

    # ── City ──────────────────────────────────────────────────────────────────
    if getattr(student, "preferred_cities", None):
        val = score_city(student, course)
        breakdown["city_preference"] = round(val, 2)
        total_score += val
        total_weight += 5

    # ── Backlogs ──────────────────────────────────────────────────────────────
    if getattr(student, "total_backlogs", None) is not None:
        val = score_backlogs(student, course)
        breakdown["backlogs"] = round(val, 2)
        total_score += val
        total_weight += 10

    # ── Work Experience ───────────────────────────────────────────────────────
    if getattr(student, "work_experience_months", None) is not None:
        val = score_work_experience(student, course)
        breakdown["work_experience"] = round(val, 2)
        total_score += val
        total_weight += 10

    # ── Intake ────────────────────────────────────────────────────────────────
    if getattr(student, "preferred_intake", None):
        val = score_intake(student, course)
        breakdown["intake_match"] = round(val, 2)
        total_score += val
        total_weight += 8

    # ── Duration ─────────────────────────────────────────────────────────────
    if getattr(student, "preferred_duration_months", None) is not None:
        val = score_duration(student, course)
        breakdown["duration_match"] = round(val, 2)
        total_score += val
        total_weight += 5

    return {
        "breakdown": breakdown,
        "total_score": total_score,
        "total_weight": total_weight,
    }


def compute_score(student, course):
    result = compute_score_breakdown(student, course)
    total_score = result["total_score"]
    total_weight = result["total_weight"]

    if total_weight == 0:
        normalized = 0
    else:
        normalized = (total_score / total_weight) * 100

    return {
        "final_score": round(min(normalized, 100), 2),
        "raw_score": round(total_score, 2),
        "max_raw_score": total_weight,
        "breakdown": result["breakdown"],
    }
