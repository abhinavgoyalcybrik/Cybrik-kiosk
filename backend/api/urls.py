from django.urls import path
from .views import student_recommendations

urlpatterns = [
    path(
        "students/<int:student_id>/recommendations/",
        student_recommendations,
        name="student-recommendations"
    ),
]