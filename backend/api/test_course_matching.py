from django.test import SimpleTestCase, TestCase

from api.models import (
    AcademicRequirement, Course, CourseFee, CourseIntake, DocumentRequirement,
    EnglishRequirement, University,
)
from services.course_matching import calculate_course_match, english_eligibility, preference_match
from services.document_checklist import build_document_checklist
from services.normalization import (
    currency_quality, location_matches_city, normalize_city, normalize_degree, normalize_field,
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
        self.assertFalse(location_matches_city("N/A", "Dunedin"))
        self.assertFalse(location_matches_city("International", "Dunedin"))
        self.assertFalse(location_matches_city("Auckland", "Dunedin"))
        self.assertTrue(location_matches_city("Dunedin Campus", "Dunedin"))
        self.assertTrue(location_matches_city("Auckland / Dunedin", "Dunedin"))
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

    def test_dynamic_match_score_and_structured_failures(self):
        base = {"preferred_countries": ["New Zealand"], "academic_score": 75, "grading_scale": "percentage"}
        full = calculate_course_match(self.course, base)
        below = calculate_course_match(self.course, {**base, "academic_score": 60})
        self.assertEqual(full["percentage"], 100)
        self.assertLess(below["percentage"], 100)
        academic_failure = next(item for item in below["unmatched_factors"] if item["key"] == "academic_score")
        self.assertEqual(academic_failure["status"], "not_matched")
        self.assertIn("below", academic_failure["reason"])

    def test_optional_preferences_and_english_do_not_change_score(self):
        profile = {"preferred_countries": ["New Zealand"], "academic_score": 75, "grading_scale": "percentage"}
        base = calculate_course_match(self.course, profile)
        with_english = calculate_course_match(self.course, {**profile, "english_test_type": "IELTS", "english_overall": 4})
        self.assertEqual(base["percentage"], with_english["percentage"])
        self.assertFalse(any(item["key"] in {"university", "course"} for item in base["matched_factors"] + base["unmatched_factors"]))

    def test_incompatible_grading_scale_requires_review_without_conversion(self):
        result = calculate_course_match(self.course, {"preferred_countries": ["New Zealand"], "academic_score": 7.5, "grading_scale": "cgpa_10"})
        factor = next(item for item in result["review_factors"] if item["key"] == "academic_score")
        self.assertEqual(factor["status"], "review")
        self.assertFalse(factor["applicable"])

    def test_work_experience_failure_reduces_score(self):
        requirement = self.course.academic_requirement
        requirement.work_experience_required = True
        requirement.min_work_experience_months = 24
        requirement.save()
        result = calculate_course_match(self.course, {"preferred_countries": ["New Zealand"], "work_experience_months": 6})
        self.assertLess(result["percentage"], 100)
        self.assertTrue(any(item["key"] == "work_experience" for item in result["unmatched_factors"]))

    def test_qualification_falls_back_to_imported_bachelor_background(self):
        requirement = self.course.academic_requirement
        requirement.required_qualification = ""
        requirement.required_bachelor_background = "Completion of a bachelor's degree or equivalent, Minimum GPA: 3.0"
        requirement.min_percentage = None
        requirement.save()
        result = calculate_course_match(self.course, {"qualification": "Bachelor’s degree", "academic_score": 8.2, "grading_scale": "cgpa_10"})
        self.assertTrue(any(item["key"] == "academic_qualification" for item in result["matched_factors"]))
        score_review = next(item for item in result["review_factors"] if item["key"] == "academic_score")
        self.assertIn("Minimum GPA: 3.0", score_review["course_value"])

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
