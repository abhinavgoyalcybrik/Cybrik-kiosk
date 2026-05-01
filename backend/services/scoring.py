def normalize(text):
    return text.lower().strip() if text else ""


STREAM_COURSE_MAP = {
    "non-medical": [
        "computer science",
        "data science",
        "information technology",
        "engineering",
        "software",
        "artificial intelligence",
        "cybersecurity",
    ],
    "medical": [
        "health",
        "biomedical",
        "biology",
        "nursing",
        "public health",
        "psychology",
    ],
    "commerce": [
        "business",
        "business analytics",
        "finance",
        "accounting",
        "management",
        "economics",
        "marketing",
    ],
    "arts": [
        "arts",
        "humanities",
        "media",
        "communication",
        "design",
        "education",
        "social science",
    ],
    "humanities": [
        "arts",
        "humanities",
        "media",
        "communication",
        "education",
        "social science",
    ],
}


MAX_RAW_SCORE = 135


def score_academic(student):
    if student.percentage is None:
        return 0

    return min(student.percentage, 100) * 0.3  # max 30


def score_english(student):
    if student.ielts_overall is None:
        return 0

    return min(student.ielts_overall * 5, 35)  # max 35


def score_stream_relevance(student, course):
    stream = normalize(student.academic_stream)
    course_field = normalize(course.field_of_study)
    course_title = normalize(course.title)

    if not stream:
        return 5

    relevant_keywords = STREAM_COURSE_MAP.get(stream, [])

    if not relevant_keywords:
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

    subjects = student.subjects_studied or []

    if not subjects:
        return 5

    score = 0

    for subject in subjects:
        subject = normalize(subject)

        if subject and subject in course_text:
            score += 5

    return min(score, 15)


def score_career_alignment(student, course):
    career_goal = normalize(student.career_goal)
    course_text = (
        f"{normalize(course.title)} "
        f"{normalize(course.field_of_study)} "
        f"{normalize(course.career_outcomes)}"
    )

    if not career_goal:
        return 5

    career_words = career_goal.split()

    matched_words = [
        word for word in career_words
        if len(word) > 3 and word in course_text
    ]

    if len(matched_words) >= 2:
        return 10

    if len(matched_words) == 1:
        return 5

    return 2


def score_budget(student, course):
    try:
        fee = course.fee.tuition_fee
    except Exception:
        return 5

    if student.max_budget is None or fee is None:
        return 5

    if fee <= student.max_budget:
        return 10

    if fee <= student.max_budget * 1.2:
        return 5

    return 0


def score_country(student, course):
    preferred_countries = student.preferred_countries or []

    if not preferred_countries:
        return 5

    university_country = normalize(course.university.country)

    for country in preferred_countries:
        if normalize(country) in university_country:
            return 10

    return 2


def score_city(student, course):
    preferred_cities = student.preferred_cities or []

    if not preferred_cities:
        return 5

    university_city = normalize(course.university.city)

    for city in preferred_cities:
        if normalize(city) in university_city:
            return 5

    return 1


def compute_score_breakdown(student, course):
    breakdown = {}

    total_weight = 0
    total_score = 0

    # Academic (always important if present)
    if student.percentage is not None:
        val = score_academic(student)
        breakdown["academic"] = round(val, 2)
        total_score += val
        total_weight += 30

    # English
    if student.ielts_overall is not None:
        val = score_english(student)
        breakdown["english"] = round(val, 2)
        total_score += val
        total_weight += 35

    # Stream
    if student.academic_stream:
        val = score_stream_relevance(student, course)
        breakdown["stream_relevance"] = round(val, 2)
        total_score += val
        total_weight += 20

    # Subjects
    if student.subjects_studied:
        val = score_subject_relevance(student, course)
        breakdown["subject_relevance"] = round(val, 2)
        total_score += val
        total_weight += 15

    # Career
    if student.career_goal:
        val = score_career_alignment(student, course)
        breakdown["career_alignment"] = round(val, 2)
        total_score += val
        total_weight += 10

    # Budget
    if student.max_budget is not None:
        val = score_budget(student, course)
        breakdown["budget_fit"] = round(val, 2)
        total_score += val
        total_weight += 10

    # Country
    if student.preferred_countries:
        val = score_country(student, course)
        breakdown["country_preference"] = round(val, 2)
        total_score += val
        total_weight += 10

    # City
    if student.preferred_cities:
        val = score_city(student, course)
        breakdown["city_preference"] = round(val, 2)
        total_score += val
        total_weight += 5

    return {
        "breakdown": breakdown,
        "total_score": total_score,
        "total_weight": total_weight
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