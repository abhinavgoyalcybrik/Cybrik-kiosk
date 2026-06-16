from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase, TestCase

from api.models import Course, University
from import_university_courses import REPO_ROOT, main, resolve_source_files


class ResolveSourceFilesTests(SimpleTestCase):
    def test_resolve_source_files_supports_repo_relative_paths(self) -> None:
        resolved = resolve_source_files(["universities/deakin_university.json"])

        self.assertEqual(
            resolved,
            [REPO_ROOT / "universities" / "deakin_university.json"],
        )


class MainImportTests(TestCase):
    def test_main_with_explicit_paths_keeps_unrelated_universities(self) -> None:
        University.objects.create(
            name="Keep Me University",
            official_website="https://example.edu",
            country="Australia",
            city="Sydney",
        )

        with TemporaryDirectory() as temp_dir:
            json_path = Path(temp_dir) / "charles_darwin_university.json"
            json_path.write_text(
                json.dumps(
                    {
                        "metadata": {
                            "university_name": "Charles Darwin University",
                            "source": "https://www.cdu.edu.au",
                            "total_programs": 0,
                        },
                        "programs": [],
                    }
                ),
                encoding="utf-8",
            )

            main([str(json_path)])

        self.assertTrue(University.objects.filter(name="Keep Me University").exists())

    def test_main_collapses_duplicate_course_titles_before_upsert(self) -> None:
        university = University.objects.create(
            name="RMIT University",
            official_website="https://www.rmit.edu.au",
            country="Australia",
            city="Melbourne",
        )
        Course.objects.create(
            university=university,
            title="Master of Engineering (Electrical and Electronic Engineering)",
            degree_level="Master",
            field_of_study="Engineering",
        )
        Course.objects.create(
            university=university,
            title="Master of Engineering (Electrical and Electronic Engineering)",
            degree_level="Bachelor",
            field_of_study="Engineering",
        )

        with TemporaryDirectory() as temp_dir:
            json_path = Path(temp_dir) / "royal_melbourne_institute_of_technology.json"
            json_path.write_text(
                json.dumps(
                    {
                        "metadata": {
                            "university_name": "Royal Melbourne Institute of Technology",
                            "source": "https://www.rmit.edu.au",
                            "total_programs": 1,
                        },
                        "programs": [
                            {
                                "program_course_name": "Master of Engineering (Electrical and Electronic Engineering)",
                                "course_level": "Master",
                                "campus_location": "Melbourne City",
                                "intakes": ["February"],
                                "course_duration": "2 years full-time",
                                "annual_tuition_fee": {
                                    "amount": 45120,
                                    "currency": "AUD",
                                    "period": "per year",
                                },
                                "minimum_english_language_score_requirements": {
                                    "IELTS": "6.5 overall, no band below 6.0"
                                },
                                "source_reference": {
                                    "primary_source": "https://www.rmit.edu.au/example"
                                },
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            main([str(json_path)])

        courses = Course.objects.filter(
            university__name="RMIT University",
            title="Master of Engineering (Electrical and Electronic Engineering)",
        )
        self.assertEqual(courses.count(), 1)
        self.assertEqual(courses.get().degree_level, "Master")

    def test_main_merges_royal_melbourne_into_rmit_university(self) -> None:
        canonical = University.objects.create(
            name="RMIT University",
            official_website="https://www.rmit.edu.au",
            country="Australia",
            city="Melbourne",
        )
        alias = University.objects.create(
            name="Royal Melbourne Institute of Technology",
            official_website="https://www.rmit.edu.au",
            country="Australia",
            city="Melbourne",
        )
        Course.objects.create(
            university=canonical,
            title="Bachelor of Business",
            degree_level="Bachelor",
            field_of_study="Business",
        )
        Course.objects.create(
            university=alias,
            title="Bachelor of Business",
            degree_level="Diploma",
            field_of_study="Business",
        )

        with TemporaryDirectory() as temp_dir:
            json_path = Path(temp_dir) / "royal_melbourne_institute_of_technology.json"
            json_path.write_text(
                json.dumps(
                    {
                        "metadata": {
                            "university_name": "Royal Melbourne Institute of Technology",
                            "source": "https://www.rmit.edu.au",
                            "total_programs": 1,
                        },
                        "programs": [
                            {
                                "program_course_name": "Bachelor of Business",
                                "course_level": "Bachelor",
                                "campus_location": "Melbourne City",
                                "intakes": ["February"],
                                "course_duration": "3 years full-time",
                                "annual_tuition_fee": {
                                    "amount": 45120,
                                    "currency": "AUD",
                                    "period": "per year",
                                },
                                "minimum_english_language_score_requirements": {
                                    "IELTS": "6.5 overall, no band below 6.0"
                                },
                                "source_reference": {
                                    "primary_source": "https://www.rmit.edu.au/example"
                                },
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            main([str(json_path)])

        self.assertFalse(
            University.objects.filter(name="Royal Melbourne Institute of Technology").exists()
        )
        courses = Course.objects.filter(
            university__name="RMIT University",
            title="Bachelor of Business",
        )
        self.assertEqual(courses.count(), 1)
        self.assertEqual(courses.get().degree_level, "Bachelor")
