def normalize(text):
    return text.lower().strip() if text else ""


# 1. Academic Score (max 30)
def score_academic(student):
    if not student.percentage:
        return 0
    return min(student.percentage, 100) * 0.3


# 2. English Score (max ~35)
def score_english(student):
    if not student.ielts_overall:
        return 0
    return student.ielts_overall * 5


# 3. Course Relevance (max 20)
def score_relevance(student, course):
    interest = normalize(student.field_of_interest)
    field = normalize(course.field_of_study)

    if not interest:
        return 5  # neutral

    if interest in field:
        return 20

    if any(word in field for word in interest.split()):
        return 10

    return 2


# 4. Budget Fit (max 15)
def score_budget(student, course):
    try:
        fee = course.fee.tuition_fee
    except:
        return 5  # unknown → neutral

    if not student.max_budget:
        return 5

    if fee <= student.max_budget:
        return 15

    if fee <= student.max_budget * 1.2:
        return 8

    return 0


# 5. Country Preference (max 10)
def score_country(student, course):
    if not student.preferred_countries:
        return 5

    university_country = normalize(course.university.country)

    if any(
        normalize(c) in university_country
        for c in student.preferred_countries
    ):
        return 10

    return 2


# FINAL SCORE
def compute_score(student, course):
    score = 0

    score += score_academic(student)
    score += score_english(student)
    score += score_relevance(student, course)
    score += score_budget(student, course)
    score += score_country(student, course)

    return round(score, 2)