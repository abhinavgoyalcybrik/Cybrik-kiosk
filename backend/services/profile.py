def compute_profile_completeness(student):
    fields = {
        "academic_stream": student.academic_stream,
        "percentage": student.percentage,
        "ielts_overall": student.ielts_overall,
        "subjects_studied": student.subjects_studied,
        "career_goal": student.career_goal,
        "max_budget": student.max_budget,
        "preferred_countries": student.preferred_countries,
        "preferred_cities": student.preferred_cities,
    }

    total_fields = len(fields)
    filled_fields = 0
    missing_fields = []

    for field, value in fields.items():
        if value:
            filled_fields += 1
        else:
            missing_fields.append(field)

    completeness_score = (filled_fields / total_fields) * 100

    return {
        "score": round(completeness_score, 2),
        "filled": filled_fields,
        "total": total_fields,
        "missing_fields": missing_fields,
    }

def compute_recommendation_confidence(student):
    completeness = compute_profile_completeness(student)

    score = completeness["score"]

    if score >= 80:
        level = "High"
    elif score >= 50:
        level = "Medium"
    else:
        level = "Low"

    return {
        "confidence_score": score,
        "confidence_level": level,
        "missing_fields": completeness["missing_fields"],
    }