from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from api.models import KioskSession, SessionOTP, StudentProfile


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
