def normalize(text):
    return text.lower().strip() if text else ""


def generate_explanations(student, course, eligibility_result, score_breakdown):
    explanations = []

    status = eligibility_result.get("status")

    if status == "Eligible":
        explanations.append("Student meets the core eligibility requirements for this course.")
    elif status == "Borderline":
        explanations.append("Student is close to the minimum eligibility requirements for this course.")
    elif status == "Not Eligible":
        explanations.append("Student does not currently meet one or more core eligibility requirements.")

    # Academic → only if percentage provided
    if student.percentage is not None:
        if score_breakdown.get("academic", 0) >= 20:
            explanations.append("Academic profile is strong for this course.")
        elif score_breakdown.get("academic", 0) > 0:
            explanations.append("Academic profile has been considered in the recommendation score.")

    # English → only if IELTS provided
    if student.ielts_overall is not None:
        if score_breakdown.get("english", 0) >= 30:
            explanations.append("English language score is strong.")
        elif score_breakdown.get("english", 0) > 0:
            explanations.append("English language score contributes positively to the recommendation.")

    # Stream → only if provided
    if student.academic_stream:
        if score_breakdown.get("stream_relevance", 0) >= 15:
            explanations.append(f"{student.academic_stream} background aligns well with this course.")
        elif score_breakdown.get("stream_relevance", 0) <= 3:
            explanations.append(f"{student.academic_stream} background has limited direct alignment with this course.")

    # Subjects → only if provided
    if student.subjects_studied:
        if score_breakdown.get("subject_relevance", 0) >= 10:
            explanations.append("Subjects studied by the student are relevant to this course.")

    # Career → only if provided
    if student.career_goal:
        if score_breakdown.get("career_alignment", 0) >= 8:
            explanations.append("Course outcomes align well with the student's career goal.")

    # Budget → only if provided
    if student.max_budget is not None:
        if score_breakdown.get("budget_fit", 0) == 10:
            explanations.append("Course fees appear to be within the student's preferred budget.")
        elif score_breakdown.get("budget_fit", 0) == 5:
            explanations.append("Course fees are slightly above the student's preferred budget.")
        elif score_breakdown.get("budget_fit", 0) == 0:
            explanations.append("Course fees may exceed the student's preferred budget.")

    # Country → only if provided
    if student.preferred_countries:
        if score_breakdown.get("country_preference", 0) == 10:
            explanations.append(f"Preferred country matched: {course.university.country}.")

    # City → only if provided
    if student.preferred_cities:
        if score_breakdown.get("city_preference", 0) == 5:
            explanations.append(f"Preferred city matched: {course.university.city}.")

    return explanations