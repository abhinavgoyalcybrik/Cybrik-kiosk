from django.test import SimpleTestCase, TestCase

from api.models import (
    AcademicRequirement, Course, CourseFee, CourseIntake, DocumentRequirement,
    EnglishRequirement, University,
)
from services.course_matching import english_eligibility, preference_match
from services.document_checklist import build_document_checklist
from services.normalization import (
    currency_quality, normalize_city, normalize_degree, normalize_field,
    normalize_intake,
)


class NormalizationTests(SimpleTestCase):
    def test_intake_month_variants_and_structures(self):
        for label in ("February", "FEBRUARY", " Feb "):
            self.assertEqual(normalize_intake(label).months, ("February",))
        self.assertEqual(normalize_intake("February and July").months, ("February", "July"))
        self.assertEqual(normalize_intake("Trimester Two").classification, "Trimester")
        self.assertEqual(normalize_intake("Apply when accepted").classification, "Unstructured")

    def test_city_degree_field_and_currency(self):
        self.assertIsNone(normalize_city(" N/A "))
        self.assertIsNone(normalize_city("International"))
        self.assertEqual(normalize_city(" auckland "), "Auckland")
        for raw in ("Master", "Masters", "Master’s"):
            self.assertEqual(normalize_degree(raw), "Postgraduate")
        self.assertEqual(normalize_degree(""), "Unspecified")
        self.assertIsNone(normalize_field(" "))
        self.assertTrue(currency_quality("AUD", "New Zealand")["requires_confirmation"])
        self.assertFalse(currency_quality("NZD", "New Zealand")["requires_confirmation"])
        self.assertTrue(currency_quality("USD", "New Zealand")["requires_confirmation"])


class MatchingTests(TestCase):
    def setUp(self):
        university = University.objects.create(
            name="Test University", country="New Zealand", city="N/A",
            scholarship_available=True, accommodation_available=True,
        )
        self.course = Course.objects.create(
            university=university, title="Master of Computing", degree_level="Masters",
            field_of_study="Computer Science", duration_months=18, mode="Full-time",
        )
        CourseFee.objects.create(course=self.course, tuition_fee=30000, currency="NZD")
        CourseIntake.objects.create(course=self.course, intake_month="FEBRUARY")
        EnglishRequirement.objects.create(course=self.course, ielts_overall=6.5)
        AcademicRequirement.objects.create(course=self.course, min_percentage=70)
        DocumentRequirement.objects.create(
            course=self.course, sop_required=True, portfolio_required=True,
        )

    def test_english_never_changes_preference_percentage(self):
        base = {"preferred_countries": ["New Zealand"], "preferred_degree": "Postgraduate"}
        without = preference_match(self.course, base)["percentage"]
        high = preference_match(self.course, {**base, "english_test_type": "IELTS", "english_overall": 9})["percentage"]
        low = preference_match(self.course, {**base, "english_test_type": "IELTS", "english_overall": 4})["percentage"]
        self.assertEqual(without, high)
        self.assertEqual(high, low)
        self.assertEqual(english_eligibility(self.course, {"english_test_type": "IELTS", "english_overall": 4})["status"], "below_requirement")

    def test_missing_course_data_is_excluded_and_currency_is_explicit(self):
        result = preference_match(self.course, {"preferred_cities": ["Auckland"]})
        self.assertEqual(result["percentage"], 0)
        self.assertEqual(result["unavailable_factors"][0]["factor"], "city")
        no_currency = preference_match(self.course, {"max_tuition_fee": 35000})
        self.assertEqual(no_currency["unavailable_factors"][0]["factor"], "tuition_fee")
        nzd = preference_match(self.course, {"max_tuition_fee": 35000, "fee_currency": "NZD"})
        self.assertEqual(nzd["percentage"], 100)
        aud = preference_match(self.course, {"max_tuition_fee": 35000, "fee_currency": "AUD"})
        self.assertEqual(aud["unavailable_factors"][0]["factor"], "tuition_fee")

    def test_multiple_intakes_and_deduplicated_checklist(self):
        CourseIntake.objects.create(course=self.course, intake_month="July")
        self.assertEqual(preference_match(self.course, {"preferred_intake": "Feb"})["percentage"], 100)
        checklist = build_document_checklist([self.course, self.course], {})
        self.assertEqual(checklist["required_count"], 3)
        self.assertEqual(
            {item["id"] for item in checklist["items"]},
            {"passport", "sop", "portfolio"},
        )
