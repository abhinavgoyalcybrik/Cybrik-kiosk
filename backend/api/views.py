from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import StudentProfile
from services.eligibility import get_eligible_courses
from services.explanations import generate_explanations
from services.risk_flags import generate_risk_flags

from services.profile import compute_recommendation_confidence


@api_view(["GET"])
def student_recommendations(request, student_id):
    try:
        student = StudentProfile.objects.get(id=student_id)
    except StudentProfile.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)

    results = get_eligible_courses(student)

    data = []

    for r in results:
        course = r["course"]
        score_result = r["score"]
        score_breakdown = score_result["breakdown"]

        explanations = generate_explanations(
            student=student,
            course=course,
            eligibility_result=r,
            score_breakdown=score_breakdown,
        )

        risk_flags = generate_risk_flags(
            student=student,
            course=course,
            eligibility_result=r,
            score_breakdown=score_breakdown,
        )

        confidence = compute_recommendation_confidence(student)

        data.append({
            "course_id": course.id,
            "title": course.title,
            "university": {
                "name": course.university.name,
                "country": course.university.country,
                "city": course.university.city,
            },
            "degree_level": course.degree_level,
            "field_of_study": course.field_of_study,

            "status": r["status"],
            "score": score_result["final_score"],
            "raw_score": score_result["raw_score"],
            "max_raw_score": score_result["max_raw_score"],
            "score_breakdown": score_breakdown,

            "explanations": explanations,
            "risk_flags": risk_flags,
            "reasons": r["reasons"],
        })

    return Response({
        "student": {
            "id": student.id,
            "name": student.name,
            "highest_qualification": student.highest_qualification,
            "academic_stream": student.academic_stream,
            "percentage": student.percentage,
            "ielts_overall": student.ielts_overall,
        },
        "recommendation_confidence": confidence,
        "recommendations": data
    })