import sqlite3
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from api.models import (
    AcademicRequirement,
    Course,
    CourseFee,
    CourseIntake,
    DocumentRequirement,
    EnglishRequirement,
    GalleryImage,
    University,
)


UNIVERSITY_FIELDS = [
    field.name for field in University._meta.fields if field.name not in {"id"}
]
COURSE_FIELDS = [
    field.name for field in Course._meta.fields if field.name not in {"id", "university"}
]
RELATED_MODELS = (
    ("api_coursefee", CourseFee),
    ("api_academicrequirement", AcademicRequirement),
    ("api_englishrequirement", EnglishRequirement),
    ("api_documentrequirement", DocumentRequirement),
)


def clean_url(value):
    return (value or "").strip().rstrip("/").casefold()


def row_values(row, fields):
    keys = set(row.keys())
    return {field: row[field] for field in fields if field in keys}


def course_values(row):
    values = row_values(row, COURSE_FIELDS)
    verified_at = values.get("human_verified_at")
    if isinstance(verified_at, str):
        verified_at = parse_datetime(verified_at)
    if verified_at is not None and timezone.is_naive(verified_at):
        verified_at = timezone.make_aware(verified_at, timezone.get_default_timezone())
    values["human_verified_at"] = verified_at
    return values


class Command(BaseCommand):
    help = "Import an EduGraph SQLite export without deleting existing project data."

    def add_arguments(self, parser):
        parser.add_argument("database", type=Path)
        parser.add_argument(
            "--dry-run", action="store_true", help="Validate and report, then roll back."
        )

    def handle(self, *args, **options):
        source = options["database"].expanduser().resolve()
        if not source.is_file():
            raise CommandError(f"Source database does not exist: {source}")

        connection = sqlite3.connect(f"file:{source.as_posix()}?mode=ro", uri=True)
        connection.row_factory = sqlite3.Row
        self._validate_source(connection)
        counts = {
            "universities_created": 0,
            "universities_updated": 0,
            "courses_created": 0,
            "courses_updated": 0,
            "intakes_created": 0,
            "intakes_existing": 0,
            "gallery_images_created": 0,
        }
        for _, model in RELATED_MODELS:
            counts[f"{model._meta.model_name}_created"] = 0
            counts[f"{model._meta.model_name}_updated"] = 0

        try:
            with transaction.atomic():
                university_map = self._import_universities(connection, counts)
                course_map = self._import_courses(connection, university_map, counts)
                self._import_related(connection, course_map, counts)
                self._import_intakes(connection, course_map, counts)
                self._import_gallery(connection, university_map, counts)
                if options["dry_run"]:
                    transaction.set_rollback(True)
        finally:
            connection.close()

        mode = "DRY RUN (rolled back)" if options["dry_run"] else "IMPORT COMPLETE"
        self.stdout.write(self.style.SUCCESS(mode))
        for key, value in counts.items():
            self.stdout.write(f"{key}: {value}")

    def _validate_source(self, connection):
        required = {
            "api_university", "api_course", "api_courseintake", "api_coursefee",
            "api_academicrequirement", "api_englishrequirement",
            "api_documentrequirement", "api_galleryimage",
        }
        present = {
            row[0] for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        missing = sorted(required - present)
        if missing:
            raise CommandError("Source database is missing tables: " + ", ".join(missing))

    def _import_universities(self, connection, counts):
        mapping = {}
        for row in connection.execute("SELECT * FROM api_university ORDER BY id"):
            university = University.objects.filter(
                name__iexact=row["name"].strip(), country__iexact=row["country"].strip()
            ).first()
            values = row_values(row, UNIVERSITY_FIELDS)
            if university:
                for field, value in values.items():
                    setattr(university, field, value)
                university.save(update_fields=list(values))
                counts["universities_updated"] += 1
            else:
                university = University.objects.create(**values)
                counts["universities_created"] += 1
            mapping[row["id"]] = university
        return mapping

    def _import_courses(self, connection, universities, counts):
        mapping = {}
        used_course_ids = set()
        for row in connection.execute("SELECT * FROM api_course ORDER BY id"):
            university = universities[row["university_id"]]
            course = None
            source_url = clean_url(row["course_url"])
            if source_url:
                course = next(
                    (item for item in university.courses.filter(course_url__isnull=False)
                     if item.id not in used_course_ids
                     and clean_url(item.course_url) == source_url),
                    None,
                )
            if course is None:
                candidates = university.courses.filter(
                    title__iexact=row["title"].strip()
                ).exclude(id__in=used_course_ids)
                campus = (row["campus"] or "").strip()
                course = candidates.filter(campus__iexact=campus).first() or candidates.first()

            values = course_values(row)
            if course:
                for field, value in values.items():
                    setattr(course, field, value)
                course.save(update_fields=list(values))
                counts["courses_updated"] += 1
            else:
                course = Course.objects.create(university=university, **values)
                counts["courses_created"] += 1
            mapping[row["id"]] = course
            used_course_ids.add(course.id)
        return mapping

    def _import_related(self, connection, courses, counts):
        for table, model in RELATED_MODELS:
            fields = [f.name for f in model._meta.fields if f.name not in {"id", "course"}]
            key = model._meta.model_name
            for row in connection.execute(f"SELECT * FROM {table} ORDER BY id"):
                _, created = model.objects.update_or_create(
                    course=courses[row["course_id"]],
                    defaults=row_values(row, fields),
                )
                counts[f"{key}_{'created' if created else 'updated'}"] += 1

    def _import_intakes(self, connection, courses, counts):
        fields = [
            f.name for f in CourseIntake._meta.fields if f.name not in {"id", "course"}
        ]
        for row in connection.execute("SELECT * FROM api_courseintake ORDER BY id"):
            values = row_values(row, fields)
            _, created = CourseIntake.objects.get_or_create(
                course=courses[row["course_id"]], **values
            )
            counts[f"intakes_{'created' if created else 'existing'}"] += 1

    def _import_gallery(self, connection, universities, counts):
        for row in connection.execute("SELECT * FROM api_galleryimage ORDER BY id"):
            _, created = GalleryImage.objects.get_or_create(
                university=universities[row["university_id"]],
                image_url=row["image_url"],
                defaults={"caption": row["caption"], "is_primary": row["is_primary"]},
            )
            counts["gallery_images_created"] += int(created)
