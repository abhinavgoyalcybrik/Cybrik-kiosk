from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from api.models import Course, KioskSession, SessionOTP, StudentProfile, University


class AuthenticationSessionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def start_registration(self):
        response = self.client.post(
            "/api/session/start/",
            {
                "mode": "register",
                "name": "Aarav Sharma",
                "email": "aarav@example.com",
                "phone": "+91 98765 43210",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        return response.json()["session_key"]

    @patch(
        "services.meta_whatsapp_service.MetaWhatsAppService.send_otp_message",
        return_value={"success": True},
    )
    def test_registration_otp_session_and_logout_flow(self, _send_message):
        session_key = self.start_registration()

        send_response = self.client.post(
            f"/api/session/{session_key}/otp/send/", {}, format="json"
        )
        self.assertEqual(send_response.status_code, 200)
        otp = SessionOTP.objects.get(session__session_key=session_key)

        verify_response = self.client.post(
            f"/api/session/{session_key}/otp/verify/",
            {"otp_code": otp.otp_code},
            format="json",
        )
        self.assertEqual(verify_response.status_code, 200)
        self.assertIn("cybrik_session", verify_response.cookies)

        status_response = self.client.get("/api/session/status/")
        self.assertEqual(status_response.status_code, 200)
        self.assertTrue(status_response.json()["authenticated"])

        save_response = self.client.patch(
            f"/api/session/{session_key}/autosave/",
            {"preferred_countries": ["Australia"]},
            format="json",
        )
        self.assertEqual(save_response.status_code, 200)
        self.assertEqual(
            save_response.json()["profile_data"]["preferred_countries"],
            ["Australia"],
        )

        legacy_score_response = self.client.patch(
            f"/api/session/{session_key}/autosave/",
            {"academic_score": "8.2 CGPA", "preferred_countries": ["New Zealand"]},
            format="json",
        )
        self.assertEqual(legacy_score_response.status_code, 200)
        self.assertEqual(legacy_score_response.json()["profile_data"]["grading_scale"], "cgpa_10")
        self.assertEqual(legacy_score_response.json()["profile_data"]["academic_score"], 8.2)

        logout_response = self.client.post("/api/session/logout/", {}, format="json")
        self.assertEqual(logout_response.status_code, 200)
        logged_out_status = self.client.get("/api/session/status/")
        self.assertEqual(logged_out_status.status_code, 200)
        self.assertFalse(logged_out_status.json()["authenticated"])

    def test_login_requires_an_existing_account(self):
        missing = self.client.post(
            "/api/session/start/",
            {"mode": "login", "phone": "919000000001"},
            format="json",
        )
        self.assertEqual(missing.status_code, 404)

        student = StudentProfile.objects.create(
            name="Existing User",
            email="user@example.com",
            phone="919000000001",
        )
        found = self.client.post(
            "/api/session/start/",
            {"mode": "login", "phone": "+91 90000 00001"},
            format="json",
        )
        self.assertEqual(found.status_code, 201)
        session = KioskSession.objects.get(session_key=found.json()["session_key"])
        self.assertEqual(session.student_profile, student)

    def test_registration_rejects_duplicate_phone(self):
        StudentProfile.objects.create(name="Existing User", phone="919876543210")
        response = self.client.post(
            "/api/session/start/",
            {"mode": "register", "name": "Duplicate", "phone": "919876543210"},
            format="json",
        )
        self.assertEqual(response.status_code, 409)

    def test_autosave_rejects_an_unauthenticated_request(self):
        session_key = self.start_registration()
        response = self.client.patch(
            f"/api/session/{session_key}/autosave/",
            {"preferred_countries": ["Canada"]},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_recommendations_apply_strict_city_and_refresh_changed_city(self):
        dunedin = University.objects.create(name="Dunedin University", country="New Zealand", city="Dunedin")
        auckland = University.objects.create(name="Auckland University", country="New Zealand", city="Auckland")
        missing = University.objects.create(name="ATMC", country="New Zealand", city="N/A")
        dunedin_course = Course.objects.create(university=dunedin, title="Dunedin Course", degree_level="Bachelor", field_of_study="Business")
        auckland_course = Course.objects.create(university=auckland, title="Auckland Course", degree_level="Bachelor", field_of_study="Business")
        missing_course = Course.objects.create(university=missing, title="Unknown Location Course", degree_level="Bachelor", field_of_study="Business")
        campus_course = Course.objects.create(university=missing, title="Campus Course", degree_level="Bachelor", field_of_study="Business", campus="Auckland / Dunedin campuses")
        session = KioskSession.objects.create(phone="919999999999", profile_data={"preferred_countries": ["New Zealand"], "preferred_cities": ["Dunedin"]})

        city_options = self.client.get("/api/preference-options/?country=New+Zealand&city=Dunedin")
        self.assertEqual(city_options.status_code, 200)
        self.assertEqual(set(city_options.json()["universities"]), {"Dunedin University", "ATMC"})
        course_options = self.client.get("/api/preference-options/?country=New+Zealand&city=Dunedin&institution=Dunedin+University")
        self.assertEqual(course_options.json()["courses"], ["Dunedin Course"])

        response = self.client.get(f"/api/session/{session.session_key}/recommendations/")
        self.assertEqual(response.status_code, 200)
        ids = {item["course_id"] for item in response.json()["recommendations"]}
        self.assertEqual(ids, {dunedin_course.id, campus_course.id})
        self.assertNotIn(missing_course.id, ids)
        campus_result = next(item for item in response.json()["recommendations"] if item["course_id"] == campus_course.id)
        self.assertEqual(campus_result["location_display"], "Dunedin")
        self.assertIn("city", campus_result["reasons"])

        session.profile_data = {"preferred_countries": ["New Zealand"], "preferred_cities": ["Auckland"]}
        session.save(update_fields=["profile_data", "updated_at"])
        changed = self.client.get(f"/api/session/{session.session_key}/recommendations/")
        self.assertEqual({item["course_id"] for item in changed.json()["recommendations"]}, {auckland_course.id, campus_course.id})

        session.profile_data = {"preferred_countries": ["New Zealand"], "preferred_cities": []}
        session.save(update_fields=["profile_data", "updated_at"])
        any_city = self.client.get(f"/api/session/{session.session_key}/recommendations/")
        self.assertEqual({item["course_id"] for item in any_city.json()["recommendations"]}, {dunedin_course.id, auckland_course.id, missing_course.id, campus_course.id})

        session.profile_data = {"preferred_countries": ["New Zealand"], "preferred_cities": ["Dunedin"], "preferred_university": "Dunedin University", "preferred_course": ""}
        session.save(update_fields=["profile_data", "updated_at"])
        institution_only = self.client.get(f"/api/session/{session.session_key}/recommendations/")
        self.assertEqual([item["course_id"] for item in institution_only.json()["recommendations"]], [dunedin_course.id])

        session.profile_data = {"preferred_countries": ["New Zealand"], "preferred_cities": ["Dunedin"], "preferred_university": "Dunedin University", "preferred_course": "Dunedin Course"}
        session.save(update_fields=["profile_data", "updated_at"])
        exact = self.client.get(f"/api/session/{session.session_key}/recommendations/")
        self.assertEqual([item["course_id"] for item in exact.json()["recommendations"]], [dunedin_course.id])
