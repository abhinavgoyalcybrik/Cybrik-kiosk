def generate_risk_flags(student, course, eligibility_result, score_breakdown):
    flags = []

    status = eligibility_result.get("status")
    reasons = eligibility_result.get("reasons", [])

    if status == "Borderline":
        flags.append({
            "type": "BORDERLINE_ELIGIBILITY",
            "severity": "medium",
            "message": "Student is close to the minimum eligibility threshold for this course."
        })

    if status == "Not Eligible":
        flags.append({
            "type": "NOT_ELIGIBLE",
            "severity": "high",
            "message": "Student does not meet minimum eligibility requirements."
        })

    if reasons:
        flags.append({
            "type": "REQUIREMENT_GAP",
            "severity": "high" if status == "Not Eligible" else "medium",
            "message": "One or more admission requirements are not satisfied.",
            "details": reasons,
        })

    # Budget → only if provided
    if student.max_budget is not None:
        if score_breakdown.get("budget_fit", 0) == 5:
            flags.append({
                "type": "BUDGET_STRETCH",
                "severity": "medium",
                "message": "Course fees are slightly above the student's preferred budget."
            })

        if score_breakdown.get("budget_fit", 0) == 0:
            flags.append({
                "type": "BUDGET_RISK",
                "severity": "high",
                "message": "Course fees may significantly exceed the student's preferred budget."
            })

    # English → only if explicitly missing
    if student.ielts_overall is None:
        flags.append({
            "type": "MISSING_ENGLISH_SCORE",
            "severity": "low",
            "message": "English test score not provided."
        })

    # Academic → only if explicitly missing
    if student.percentage is None:
        flags.append({
            "type": "MISSING_ACADEMIC_SCORE",
            "severity": "low",
            "message": "Academic percentage not provided."
        })

    # Stream mismatch → only if stream exists
    if student.academic_stream:
        if score_breakdown.get("stream_relevance", 0) <= 3:
            flags.append({
                "type": "BACKGROUND_MISMATCH",
                "severity": "medium",
                "message": "Student's academic stream has limited alignment with this course."
            })

    # Subjects → only if provided
    if student.subjects_studied:
        if score_breakdown.get("subject_relevance", 0) <= 2:
            flags.append({
                "type": "LOW_SUBJECT_RELEVANCE",
                "severity": "low",
                "message": "Subjects studied have limited relevance."
            })

    return flags