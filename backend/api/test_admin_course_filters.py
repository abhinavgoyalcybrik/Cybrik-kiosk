from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from api.models import Course, University


class CourseAdminFilterTests(TestCase):
    def setUp(self) -> None:
        user_model = get_user_model()
        self.admin_user = user_model.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="password123",
        )
        self.client.force_login(self.admin_user)

    def test_changelist_redirects_when_university_filter_points_to_deleted_row(self) -> None:
        university = University.objects.create(
            name="Temporary University",
            official_website="https://example.edu",
            country="Australia",
            city="Sydney",
        )
        stale_university_id = university.id
        university.delete()

        response = self.client.get(
            reverse("admin:api_course_changelist"),
            {"university__id__exact": stale_university_id},
            follow=False,
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], reverse("admin:api_course_changelist"))

    def test_changelist_keeps_valid_university_filter(self) -> None:
        university = University.objects.create(
            name="RMIT University",
            official_website="https://www.rmit.edu.au",
            country="Australia",
            city="Melbourne",
        )
        Course.objects.create(
            university=university,
            title="Bachelor of Business",
            degree_level="Bachelor",
            field_of_study="Business",
        )

        response = self.client.get(
            reverse("admin:api_course_changelist"),
            {"university__id__exact": university.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Bachelor of Business")
