from django.contrib import admin, messages
from django import forms
from django.conf import settings
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404, render
from django.urls import path, reverse
from django.utils import timezone
from decimal import Decimal
import subprocess
import json
import re
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from django.core.exceptions import ObjectDoesNotExist
from .models import (
    University,
    Course,
    CourseIntake,
    CourseFee,
    AcademicRequirement,
    EnglishRequirement,
    DocumentRequirement,
    ConsultantRule,
    StudentProfile,
    ShortlistItem,
    RecommendationLog,
    WhatsAppLead,
    KioskSession,
    SessionOTP,
)


class CrawlerComparisonForm(forms.Form):
    crawler_endpoint = forms.CharField(
        required=True,
        label="Crawler endpoint",
        help_text='Use "local" to run crawler directly (no port), or provide http(s) URL.',
    )
    correct_course_url = forms.URLField(required=True, label="Correct course URL")
    match_existing_source_url = forms.URLField(
        required=False,
        label="Existing source URL to match (optional)",
    )
    overwrite_existing_fields = forms.BooleanField(
        required=False,
        initial=False,
        label="Overwrite existing non-empty fields",
    )
    full_sync_all_sections = forms.BooleanField(
        required=False,
        initial=True,
        label="Full sync all course sections",
    )
    corrected_payload = forms.CharField(
        required=False,
        widget=forms.HiddenInput(),
    )


class CourseIntakeInline(admin.TabularInline):
    model = CourseIntake
    extra = 1


class CourseFeeInline(admin.StackedInline):
    model = CourseFee
    extra = 0
    max_num = 1

    class Media:
        js = ("api/js/course_fee_autocalc.js",)


class AcademicRequirementInline(admin.StackedInline):
    model = AcademicRequirement
    extra = 0
    max_num = 1


class EnglishRequirementInline(admin.StackedInline):
    model = EnglishRequirement
    extra = 0
    max_num = 1


class DocumentRequirementInline(admin.StackedInline):
    model = DocumentRequirement
    extra = 0
    max_num = 1


class ConsultantRuleInline(admin.StackedInline):
    model = ConsultantRule
    extra = 0
    max_num = 1


@admin.register(University)
class UniversityAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "country",
        "city",
        "institution_type",
        "ownership_type",
        "qs_ranking",
        "scholarship_available",
    )
    search_fields = ("name", "country", "city", "institution_type", "ownership_type")
    list_filter = ("country", "city", "ownership_type", "scholarship_available", "accommodation_available")
    fieldsets = (
        ("Basic Info", {"fields": (
            "name", "official_website", "country", "state_province", "city",
            "campus_locations", "institution_type", "ownership_type", "accreditation", "established_year",
        )}),
        ("Rankings", {"fields": ("qs_ranking", "the_ranking", "national_ranking", "ranking_notes")}),
        ("Admissions Metadata", {"fields": (
            "application_portal_url", "international_admissions_email",
            "application_fee", "application_fee_currency", "average_offer_timeline",
            "deposit_required", "deposit_amount", "refund_policy", "scholarship_available",
        )}),
        ("Student Life / Location", {"fields": (
            "accommodation_available", "estimated_monthly_living_cost", "living_cost_currency",
            "part_time_work_friendliness", "indian_student_presence", "public_transport_quality",
            "safety_rating", "job_market_rating", "nearby_industry_hubs", "weather_notes",
        )}),
        ("Consultant Notes", {"fields": ("visa_success_notes", "internal_notes", "common_concerns")}),
    )


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    change_form_template = "admin/api/course/change_form.html"
    list_display = (
        "title",
        "university",
        "degree_level",
        "field_of_study",
        "specialization",
        "mode",
        "human_verified",
    )
    search_fields = (
        "title",
        "university__name",
        "field_of_study",
        "specialization",
    )
    list_filter = (
        "university",
        "degree_level",
        "field_of_study",
        "mode",
        "human_verified",
    )
    autocomplete_fields = ("university",)
    inlines = (
        CourseIntakeInline,
        CourseFeeInline,
        AcademicRequirementInline,
        EnglishRequirementInline,
        DocumentRequirementInline,
        ConsultantRuleInline,
    )

    def changelist_view(self, request, extra_context=None):
        university_filter_id = request.GET.get("university__id__exact")
        if university_filter_id and not University.objects.filter(pk=university_filter_id).exists():
            cleaned_query = request.GET.copy()
            cleaned_query.pop("university__id__exact", None)
            redirect_url = request.path
            encoded_query = cleaned_query.urlencode()
            if encoded_query:
                redirect_url = f"{redirect_url}?{encoded_query}"
            return HttpResponseRedirect(redirect_url)
        return super().changelist_view(request, extra_context=extra_context)

    fieldsets = (
        ("Program Basics", {"fields": (
            "university", "title", "degree_level", "field_of_study",
            "specialization", "duration_months", "mode", "campus", "course_url",
        )}),
        ("Academic Details", {"fields": ("course_summary",)}),
        ("Human Review", {"fields": ("human_verified", "human_verified_by", "human_verified_at")}),
    )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "<path:object_id>/crawler-compare/",
                self.admin_site.admin_view(self.crawler_compare_view),
                name="api_course_crawler_compare",
            ),
        ]
        return custom_urls + urls

    def change_view(self, request, object_id, form_url="", extra_context=None):
        extra_context = extra_context or {}
        extra_context["crawler_compare_url"] = reverse("admin:api_course_crawler_compare", args=[object_id])
        return super().change_view(request, object_id, form_url, extra_context=extra_context)

    def crawler_compare_view(self, request, object_id):
        course = get_object_or_404(Course, pk=object_id)
        initial = {
            "crawler_endpoint": settings.CRAWLER_CORRECTION_ENDPOINT,
            "correct_course_url": course.course_url or "",
            "match_existing_source_url": course.course_url or "",
            "overwrite_existing_fields": False,
        }
        comparison_rows = []
        corrected_program = None
        corrected_payload_json = ""

        if request.method == "POST":
            form = CrawlerComparisonForm(request.POST)
            action = request.POST.get("action", "compare")
            if form.is_valid():
                cleaned = form.cleaned_data
                if action == "apply":
                    payload_text = cleaned.get("corrected_payload") or ""
                    if not payload_text:
                        self.message_user(request, "No corrected payload to apply.", level=messages.ERROR)
                    else:
                        corrected_program = json.loads(payload_text)
                        corrected_program = self._inject_selected_values(corrected_program=corrected_program, post_data=request.POST)
                        self._apply_corrected_program_to_course(
                            course=course,
                            corrected_program=corrected_program,
                            overwrite_existing=bool(cleaned.get("overwrite_existing_fields")),
                            verified_by=request.user.get_username() or "admin",
                            apply_fields=self._extract_selected_apply_fields(request.POST),
                            full_sync_all_sections=bool(cleaned.get("full_sync_all_sections")),
                        )
                        self.message_user(request, "Crawler corrections applied successfully.")
                        return HttpResponseRedirect(reverse("admin:api_course_change", args=[course.id]))
                else:
                    try:
                        corrected_program = self._fetch_crawler_correction(
                            endpoint=cleaned["crawler_endpoint"],
                            course=course,
                            correct_course_url=cleaned["correct_course_url"],
                            match_existing_source_url=cleaned.get("match_existing_source_url") or "",
                            overwrite_existing_fields=bool(cleaned.get("overwrite_existing_fields")),
                        )
                        comparison_rows = self._build_comparison_rows(course, corrected_program)
                        corrected_payload_json = json.dumps(corrected_program)
                    except Exception as exc:
                        self.message_user(request, f"Crawler compare failed: {exc}", level=messages.ERROR)
            else:
                self.message_user(request, "Please fix the form errors below.", level=messages.ERROR)
        else:
            form = CrawlerComparisonForm(initial=initial)

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": f"Crawler Compare: {course.title}",
            "original": course,
            "course": course,
            "form": form,
            "comparison_rows": comparison_rows,
            "corrected_program": corrected_program,
            "corrected_payload_json": corrected_payload_json,
        }
        return render(request, "admin/api/course/crawler_compare.html", context)

    def _fetch_crawler_correction(self, endpoint, course, correct_course_url, match_existing_source_url, overwrite_existing_fields):
        endpoint_normalized = (endpoint or "").strip()
        if endpoint_normalized.lower() in {"local", "local://", "direct"}:
            return self._fetch_crawler_correction_local(
                course=course,
                correct_course_url=correct_course_url,
                match_existing_source_url=match_existing_source_url,
                overwrite_existing_fields=overwrite_existing_fields,
            )
        payload = {
            "university_name": course.university.name,
            "base_url": course.university.official_website or "",
            "correct_course_url": correct_course_url,
            "match_existing_source_url": match_existing_source_url,
            "overwrite_existing_fields": overwrite_existing_fields,
        }
        req = Request(endpoint, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(req, timeout=120) as response:
                data = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore") if exc.fp else str(exc)
            raise ValueError(f"Crawler request failed ({exc.code}): {detail}")
        except URLError as exc:
            raise ValueError(f"Crawler endpoint unreachable: {exc.reason}")
        except Exception as exc:
            raise ValueError(f"Crawler request failed: {exc}")
        if isinstance(data, dict) and isinstance(data.get("corrected_program"), dict):
            return data["corrected_program"]
        if isinstance(data, dict):
            return data
        raise ValueError("Crawler response format is invalid.")

    def _fetch_crawler_correction_local(self, course, correct_course_url, match_existing_source_url, overwrite_existing_fields):
        payload = {
            "university_name": course.university.name,
            "base_url": course.university.official_website or "",
            "correct_course_url": correct_course_url,
            "match_existing_source_url": match_existing_source_url,
            "overwrite_existing_fields": overwrite_existing_fields,
        }
        python_bin = settings.CRAWLER_LOCAL_PYTHON
        crawler_root = settings.CRAWLER_SOURCE_ROOT
        runner_code = """
import asyncio, json, sys
from main import UniversityScraperEngine
payload = json.loads(sys.stdin.read())
async def _run():
    engine = UniversityScraperEngine(payload["university_name"], payload["base_url"])
    return await engine.recrawl_single_course(
        correct_course_url=payload["correct_course_url"],
        match_existing_source_url=payload.get("match_existing_source_url", ""),
        overwrite_existing_fields=bool(payload.get("overwrite_existing_fields", False)),
    )
result = asyncio.run(_run())
print(json.dumps(result))
"""
        try:
            completed = subprocess.run(
                [python_bin, "-c", runner_code],
                input=json.dumps(payload), text=True, capture_output=True,
                cwd=crawler_root, timeout=240, check=False,
            )
        except FileNotFoundError:
            raise ValueError(f"Crawler python binary not found: {python_bin}")
        except subprocess.TimeoutExpired:
            raise ValueError("Local crawler execution timed out.")
        except Exception as exc:
            raise ValueError(f"Local crawler execution failed: {exc}")
        if completed.returncode != 0:
            raise ValueError(f"Local crawler failed (exit {completed.returncode}): {(completed.stderr or '').strip()}")
        stdout = (completed.stdout or "").strip()
        if not stdout:
            raise ValueError("Local crawler returned empty response.")
        try:
            data = self._extract_json_from_stdout(stdout)
        except ValueError:
            raise ValueError(f"Local crawler returned invalid JSON: {stdout[:500]}")
        if isinstance(data, dict) and isinstance(data.get("corrected_program"), dict):
            return data["corrected_program"]
        if isinstance(data, dict):
            return data
        raise ValueError("Local crawler response format is invalid.")

    def _build_comparison_rows(self, course, corrected_program):
        fee = getattr(course, "fee", None)
        current_intakes = [i.intake_month for i in course.intakes.all()]
        academic_requirement = self._safe_related(course, "academic_requirement")
        english_requirement = self._safe_related(course, "english_requirement")
        document_requirement = self._safe_related(course, "document_requirement")

        corrected_fee = corrected_program.get("annual_tuition_fee") or {}
        corrected_english = corrected_program.get("minimum_english_language_score_requirements") or {}
        corrected_documents = corrected_program.get("document_requirements") or {}
        corrected_campus = corrected_program.get("campus_location")
        if isinstance(corrected_campus, list):
            corrected_campus = ", ".join(str(x) for x in corrected_campus)

        corrected_duration = corrected_program.get("course_duration")
        corrected_duration_months = self._parse_duration_months(corrected_duration)
        corrected_source = (
            (corrected_program.get("source_reference") or {}).get("primary_source")
            if isinstance(corrected_program.get("source_reference"), dict) else None
        )

        rows = [
            ("title", "Title", course.title, corrected_program.get("program_course_name"), "text"),
            ("degree_level", "Degree level", course.degree_level, corrected_program.get("course_level"), "text"),
            ("campus", "Campus", course.campus, corrected_campus, "text"),
            ("course_url", "Course URL", course.course_url, corrected_source, "text"),
            ("duration_months", "Duration (months)", course.duration_months, corrected_duration_months, "number"),
            ("tuition_fee", "Tuition fee", fee.tuition_fee if fee else None, corrected_fee.get("amount"), "number"),
            ("fee_currency", "Fee currency", fee.currency if fee else "", corrected_fee.get("currency"), "text"),
            ("fee_period", "Fee period", fee.fee_period if fee else "", corrected_fee.get("period"), "text"),
            ("intakes", "Intakes", ", ".join(current_intakes), ", ".join(corrected_program.get("intakes") or []), "text"),
            ("academic_requirements", "Academic requirements", academic_requirement.required_qualification if academic_requirement else "", corrected_program.get("academic_requirements"), "text"),
            ("work_experience_required", "Work experience required", academic_requirement.work_experience_required if academic_requirement else None, corrected_program.get("work_experience_required"), "boolean"),
            ("min_work_experience_months", "Min work exp (months)", academic_requirement.min_work_experience_months if academic_requirement else None, corrected_program.get("min_work_experience_months"), "number"),
            ("ielts_overall", "IELTS overall", english_requirement.ielts_overall if english_requirement else None, corrected_english.get("ielts_overall") or corrected_english.get("ielts"), "number"),
            ("toefl_overall", "TOEFL overall", english_requirement.toefl_overall if english_requirement else None, corrected_english.get("toefl_overall") or corrected_english.get("toefl"), "number"),
            ("pte_overall", "PTE overall", english_requirement.pte_overall if english_requirement else None, corrected_english.get("pte_overall") or corrected_english.get("pte"), "number"),
            ("sop_required", "SOP required", document_requirement.sop_required if document_requirement else None, corrected_documents.get("sop_required"), "boolean"),
            ("lor_required", "LOR required", document_requirement.lor_required if document_requirement else None, corrected_documents.get("lor_required"), "boolean"),
            ("number_of_lors", "Number of LORs", document_requirement.number_of_lors if document_requirement else None, corrected_documents.get("number_of_lors"), "number"),
            ("resume_required", "Resume required", document_requirement.resume_required if document_requirement else None, corrected_documents.get("resume_required"), "boolean"),
            ("portfolio_required", "Portfolio required", document_requirement.portfolio_required if document_requirement else None, corrected_documents.get("portfolio_required"), "boolean"),
            ("gre_required", "GRE required", document_requirement.gre_required if document_requirement else None, corrected_documents.get("gre_required"), "boolean"),
            ("gmat_required", "GMAT required", document_requirement.gmat_required if document_requirement else None, corrected_documents.get("gmat_required"), "boolean"),
            ("financial_documents_required", "Financial docs required", document_requirement.financial_documents_required if document_requirement else None, corrected_documents.get("financial_documents_required"), "boolean"),
        ]

        output = []
        for key, label, current, proposed, editor_type in rows:
            output.append({
                "key": key,
                "label": label,
                "current": "" if current is None else str(current),
                "proposed": "" if proposed is None else str(proposed),
                "changed": ("" if current is None else str(current)) != ("" if proposed is None else str(proposed)),
                "editor_type": editor_type,
            })
        return output

    def _apply_corrected_program_to_course(self, course, corrected_program, overwrite_existing, verified_by, apply_fields=None, full_sync_all_sections=False):
        apply_fields = apply_fields or set()

        def should_apply(field_key):
            if full_sync_all_sections:
                return True
            return not apply_fields or field_key in apply_fields

        def is_empty(value):
            return value is None or (isinstance(value, str) and not value.strip())

        def assign_if_allowed(current, new_value, field_key=None):
            if new_value is None:
                return current
            if isinstance(new_value, str) and not new_value.strip():
                return current
            if field_key and field_key in apply_fields:
                return new_value
            if overwrite_existing or is_empty(current):
                return new_value
            return current

        if should_apply("title"):
            course.title = assign_if_allowed(course.title, corrected_program.get("program_course_name"), "title")
        if should_apply("degree_level"):
            course.degree_level = assign_if_allowed(course.degree_level, corrected_program.get("course_level"), "degree_level")

        campus_location = corrected_program.get("campus_location")
        if isinstance(campus_location, list):
            campus_location = ", ".join(str(x) for x in campus_location if str(x).strip())
        if should_apply("campus"):
            course.campus = assign_if_allowed(course.campus, campus_location, "campus")

        source_reference = corrected_program.get("source_reference") or {}
        source_url = source_reference.get("primary_source") if isinstance(source_reference, dict) else None
        if should_apply("course_url"):
            course.course_url = assign_if_allowed(course.course_url, source_url, "course_url")

        duration_months = self._parse_duration_months(corrected_program.get("course_duration"))
        if should_apply("duration_months") and duration_months is not None and (overwrite_existing or course.duration_months is None):
            course.duration_months = duration_months

        if should_apply("course_summary"):
            course.course_summary = assign_if_allowed(course.course_summary, corrected_program.get("course_summary"), "course_summary")
        if should_apply("mode"):
            course.mode = assign_if_allowed(course.mode, corrected_program.get("mode"), "mode")
        if should_apply("specialization"):
            course.specialization = assign_if_allowed(course.specialization, corrected_program.get("specialization"), "specialization")
        if should_apply("field_of_study"):
            course.field_of_study = assign_if_allowed(course.field_of_study, corrected_program.get("field_of_study"), "field_of_study")

        course.human_verified = True
        course.human_verified_by = verified_by
        course.human_verified_at = timezone.now()
        course.save()

        fee_payload = corrected_program.get("annual_tuition_fee")
        if isinstance(fee_payload, dict) and (should_apply("tuition_fee") or should_apply("fee_currency") or should_apply("fee_period")):
            fee_obj, _ = CourseFee.objects.get_or_create(course=course)
            amount = fee_payload.get("amount")
            decimal_amount = None
            if amount is not None:
                try:
                    decimal_amount = Decimal(str(amount))
                except Exception:
                    decimal_amount = None
            if should_apply("tuition_fee") and decimal_amount is not None and (overwrite_existing or fee_obj.tuition_fee is None):
                fee_obj.tuition_fee = decimal_amount
            if should_apply("fee_currency"):
                fee_obj.currency = assign_if_allowed(fee_obj.currency, fee_payload.get("currency") or "", "fee_currency")
            if should_apply("fee_period"):
                fee_obj.fee_period = assign_if_allowed(fee_obj.fee_period, fee_payload.get("period") or "", "fee_period")
            fee_obj.save()

        academic_req, _ = AcademicRequirement.objects.get_or_create(course=course)
        if should_apply("academic_requirements"):
            academic_req.required_qualification = assign_if_allowed(academic_req.required_qualification, corrected_program.get("academic_requirements"), "academic_requirements")
        if should_apply("work_experience_required"):
            v = corrected_program.get("work_experience_required")
            if v is not None and (overwrite_existing or academic_req.work_experience_required is False):
                academic_req.work_experience_required = bool(v)
        if should_apply("min_work_experience_months"):
            v = corrected_program.get("min_work_experience_months")
            if v is not None and (overwrite_existing or academic_req.min_work_experience_months is None):
                try:
                    academic_req.min_work_experience_months = int(float(v))
                except Exception:
                    pass
        if should_apply("min_cgpa"):
            v = corrected_program.get("min_cgpa")
            if v is not None and (overwrite_existing or academic_req.min_cgpa is None):
                try:
                    academic_req.min_cgpa = float(v)
                except Exception:
                    pass
        if should_apply("min_percentage"):
            v = corrected_program.get("min_percentage")
            if v is not None and (overwrite_existing or academic_req.min_percentage is None):
                try:
                    academic_req.min_percentage = float(v)
                except Exception:
                    pass
        if should_apply("backlog_limit"):
            v = corrected_program.get("backlog_limit")
            if v is not None and (overwrite_existing or academic_req.backlog_limit is None):
                try:
                    academic_req.backlog_limit = int(float(v))
                except Exception:
                    pass
        if should_apply("active_backlog_allowed"):
            v = corrected_program.get("active_backlog_allowed")
            if v is not None and (overwrite_existing or academic_req.active_backlog_allowed is False):
                academic_req.active_backlog_allowed = bool(v)
        if should_apply("research_experience_required"):
            v = corrected_program.get("research_experience_required")
            if v is not None and (overwrite_existing or academic_req.research_experience_required is False):
                academic_req.research_experience_required = bool(v)
        academic_req.save()

        english_obj, _ = EnglishRequirement.objects.get_or_create(course=course)
        english_scores = corrected_program.get("minimum_english_language_score_requirements") or {}
        for score_key, attr in [("ielts_overall", "ielts_overall"), ("toefl_overall", "toefl_overall"), ("pte_overall", "pte_overall"), ("duolingo_overall", "duolingo_overall")]:
            if should_apply(score_key):
                v = english_scores.get(score_key) or english_scores.get(score_key.split("_")[0])
                if v is not None and (overwrite_existing or getattr(english_obj, attr) is None):
                    try:
                        setattr(english_obj, attr, float(v))
                    except Exception:
                        pass
        english_obj.save()

        documents_obj, _ = DocumentRequirement.objects.get_or_create(course=course)
        doc_data = corrected_program.get("document_requirements") or {}
        for doc_field in ["sop_required", "lor_required", "resume_required", "portfolio_required", "gre_required", "gmat_required", "passport_required", "financial_documents_required"]:
            if not should_apply(doc_field) or doc_field not in doc_data:
                continue
            val = doc_data.get(doc_field)
            if val is not None and (overwrite_existing or getattr(documents_obj, doc_field) is False):
                setattr(documents_obj, doc_field, bool(val))
        if should_apply("number_of_lors") and doc_data.get("number_of_lors") is not None:
            try:
                doc_lors = int(float(doc_data.get("number_of_lors")))
                if overwrite_existing or documents_obj.number_of_lors is None:
                    documents_obj.number_of_lors = doc_lors
            except Exception:
                pass
        documents_obj.save()

        intakes = corrected_program.get("intakes")
        if should_apply("intakes") and isinstance(intakes, list) and intakes:
            if overwrite_existing:
                CourseIntake.objects.filter(course=course).delete()
            if overwrite_existing or course.intakes.count() == 0:
                for intake in intakes:
                    month = str(intake).strip()
                    if month:
                        CourseIntake.objects.get_or_create(course=course, intake_month=month)

    def _extract_selected_apply_fields(self, post_data):
        selected = set()
        for key in post_data.keys():
            if key.startswith("apply_field_"):
                selected.add(key.replace("apply_field_", "", 1))
        return selected

    def _inject_selected_values(self, corrected_program, post_data):
        value_map = {
            "title": ("program_course_name", "str"),
            "degree_level": ("course_level", "str"),
            "campus": ("campus_location", "str"),
            "course_url": ("source_reference.primary_source", "str"),
            "duration_months": ("course_duration", "months_to_duration"),
            "tuition_fee": ("annual_tuition_fee.amount", "float"),
            "fee_currency": ("annual_tuition_fee.currency", "str"),
            "fee_period": ("annual_tuition_fee.period", "str"),
            "intakes": ("intakes", "csv"),
            "academic_requirements": ("academic_requirements", "str"),
            "work_experience_required": ("work_experience_required", "bool"),
            "min_work_experience_months": ("min_work_experience_months", "float"),
            "ielts_overall": ("minimum_english_language_score_requirements.ielts_overall", "float"),
            "toefl_overall": ("minimum_english_language_score_requirements.toefl_overall", "float"), 
            "pte_overall": ("minimum_english_language_score_requirements.pte_overall", "float"),
            "sop_required": ("document_requirements.sop_required", "bool"),
            "lor_required": ("document_requirements.lor_required", "bool"),
            "number_of_lors": ("document_requirements.number_of_lors", "float"),
            "resume_required": ("document_requirements.resume_required", "bool"),
            "portfolio_required": ("document_requirements.portfolio_required", "bool"),
            "gre_required": ("document_requirements.gre_required", "bool"),
            "gmat_required": ("document_requirements.gmat_required", "bool"),
            "financial_documents_required": ("document_requirements.financial_documents_required", "bool"),
            "course_summary": ("course_summary", "str"),
            "mode": ("mode", "str"),
            "specialization": ("specialization", "str"),
            "field_of_study": ("field_of_study", "str"),
            "min_cgpa": ("min_cgpa", "float"),
            "min_percentage": ("min_percentage", "float"),
            "backlog_limit": ("backlog_limit", "float"),
            "active_backlog_allowed": ("active_backlog_allowed", "bool"),
            "research_experience_required": ("research_experience_required", "bool"),
        }
        for key, (target, cast_type) in value_map.items():
            posted_key = f"value_{key}"
            if posted_key not in post_data:
                continue
            raw_value = (post_data.get(posted_key) or "").strip()
            value = self._cast_posted_value(raw_value, cast_type)
            self._set_nested_value(corrected_program, target, value)
        return corrected_program

    def _cast_posted_value(self, raw_value, cast_type):
        if cast_type == "str":
            return raw_value
        if cast_type == "float":
            if not raw_value:
                return None
            try:
                return float(raw_value)
            except Exception:
                return None
        if cast_type == "bool":
            return raw_value.lower() in {"1", "true", "yes", "on"}
        if cast_type == "csv":
            if not raw_value:
                return []
            return [part.strip() for part in raw_value.split(",") if part.strip()]
        if cast_type == "months_to_duration":
            if not raw_value:
                return ""
            try:
                months = int(float(raw_value))
            except Exception:
                return raw_value
            years = months / 12.0
            if months % 12 == 0:
                y = int(years)
                return f"{y} year" if y == 1 else f"{y} years"
            return f"{months} months"
        return raw_value

    def _set_nested_value(self, obj, dotted_path, value):
        keys = dotted_path.split(".")
        current = obj
        for key in keys[:-1]:
            if key not in current or not isinstance(current[key], dict):
                current[key] = {}
            current = current[key]
        current[keys[-1]] = value

    def _safe_related(self, model_obj, relation_name):
        try:
            return getattr(model_obj, relation_name)
        except ObjectDoesNotExist:
            return None

    def _extract_json_from_stdout(self, stdout):
        text = stdout.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        start = text.find("{")
        if start != -1:
            try:
                obj, _ = json.JSONDecoder().raw_decode(text, start)
                if isinstance(obj, dict):
                    return obj
            except json.JSONDecodeError:
                pass
        raise ValueError(f"No JSON object found in crawler output: {text[:300]}")

    def _parse_duration_months(self, duration_value):
        if duration_value is None:
            return None
        text = str(duration_value).strip().lower()
        if not text:
            return None
        year_match = re.search(r"(\d+(?:\.\d+)?)\s*years?", text)
        if year_match:
            return int(float(year_match.group(1)) * 12)
        month_match = re.search(r"(\d+(?:\.\d+)?)\s*months?", text)
        if month_match:
            return int(float(month_match.group(1)))
        return None


@admin.register(CourseIntake)
class CourseIntakeAdmin(admin.ModelAdmin):
    list_display = ("course", "intake_month", "intake_year", "application_deadline")
    search_fields = ("course__title", "course__university__name", "intake_month")
    list_filter = ("course__university", "intake_month", "intake_year")
    autocomplete_fields = ("course",)


@admin.register(CourseFee)
class CourseFeeAdmin(admin.ModelAdmin):
    list_display = ("course", "tuition_fee", "currency", "fee_period", "estimated_total_cost")
    search_fields = ("course__title", "course__university__name", "currency")
    list_filter = ("course__university", "currency", "fee_period")
    autocomplete_fields = ("course",)

    class Media:
        js = ("api/js/course_fee_autocalc.js",)


@admin.register(AcademicRequirement)
class AcademicRequirementAdmin(admin.ModelAdmin):
    list_display = ("course", "min_cgpa", "min_percentage", "backlog_limit", "active_backlog_allowed", "work_experience_required")
    search_fields = ("course__title", "course__university__name", "required_qualification")
    list_filter = ("course__university", "active_backlog_allowed", "work_experience_required", "research_experience_required")
    autocomplete_fields = ("course",)


@admin.register(EnglishRequirement)
class EnglishRequirementAdmin(admin.ModelAdmin):
    list_display = ("course", "ielts_overall", "toefl_overall", "pte_overall", "duolingo_overall")
    search_fields = ("course__title", "course__university__name")
    list_filter = ("course__university",)
    autocomplete_fields = ("course",)


@admin.register(DocumentRequirement)
class DocumentRequirementAdmin(admin.ModelAdmin):
    list_display = ("course", "sop_required", "lor_required", "number_of_lors", "resume_required", "gre_required", "gmat_required")
    search_fields = ("course__title", "course__university__name", "document_notes")
    list_filter = ("course__university", "sop_required", "lor_required", "resume_required", "portfolio_required", "gre_required", "gmat_required", "financial_documents_required")
    autocomplete_fields = ("course",)


@admin.register(ConsultantRule)
class ConsultantRuleAdmin(admin.ModelAdmin):
    list_display = ("course", "cgpa_flexible", "english_score_flexible", "background_flexible", "backlog_flexible")
    search_fields = ("course__title", "course__university__name")
    list_filter = ("course__university", "cgpa_flexible", "english_score_flexible", "background_flexible", "backlog_flexible")
    autocomplete_fields = ("course",)


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "highest_qualification", "academic_stream", "academic_major", "percentage", "cgpa", "ielts_overall", "max_budget", "budget_currency")
    search_fields = ("name", "email", "phone", "academic_stream", "academic_major", "career_goal", "counselor_notes")
    list_filter = ("highest_qualification", "academic_stream", "budget_currency", "scholarship_required", "low_tuition_required", "public_university_preferred", "english_waiver_required", "no_gre_required")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Personal Info", {"fields": ("name", "email", "phone")}),
        ("Preferences", {"fields": ("preferred_countries", "preferred_cities", "preferred_intake", "preferred_field", "preferred_degree", "preferred_duration_months", "max_budget", "budget_currency", "career_goal")}),
        ("Discovery Inputs", {"fields": ("interested_career_paths", "preferred_subject_areas", "disliked_subject_areas")}),
        ("Academics", {"fields": ("highest_qualification", "institution_name", "academic_stream", "academic_major", "subjects_studied", "cgpa", "percentage", "grading_scale", "total_backlogs", "active_backlogs", "gap_years", "graduation_year")}),
        ("Test Scores", {"fields": ("ielts_overall", "ielts_listening", "ielts_reading", "ielts_writing", "ielts_speaking", "toefl_overall", "pte_overall", "duolingo_overall", "gre_score", "gmat_score")}),
        ("Experience", {"fields": ("work_experience_months", "internship_experience", "research_experience", "projects", "certifications")}),
        ("Constraints", {"fields": ("scholarship_required", "low_tuition_required", "public_university_preferred", "english_waiver_required", "no_gre_required", "no_application_fee_preferred")}),
        ("Internal Notes", {"fields": ("counselor_notes", "created_at", "updated_at")}),
    )


@admin.register(ShortlistItem)
class ShortlistItemAdmin(admin.ModelAdmin):
    list_display = ("student_profile", "course", "eligibility_status", "match_score", "created_at")
    search_fields = ("student_profile__name", "course__title", "course__university__name", "eligibility_status")
    list_filter = ("eligibility_status", "created_at")
    autocomplete_fields = ("student_profile", "course")
    readonly_fields = ("created_at",)
    fieldsets = (
        ("Student & Course", {"fields": ("student_profile", "course", "eligibility_status", "match_score")}),
        ("Score Breakdown", {"fields": ("academic_score", "budget_score", "course_relevance_score", "country_score", "city_score", "intake_score", "career_score")}),
        ("Recommendation Details", {"fields": ("risk_flags", "recommendation_reason", "created_at")}),
    )


@admin.register(RecommendationLog)
class RecommendationLogAdmin(admin.ModelAdmin):
    list_display = ("student_profile", "model_used", "created_at")
    search_fields = ("student_profile__name", "user_question", "ai_response", "model_used")
    list_filter = ("model_used", "created_at")
    autocomplete_fields = ("student_profile", "shortlisted_courses")
    readonly_fields = ("created_at",)
    fieldsets = (
        ("Recommendation Session", {"fields": ("student_profile", "shortlisted_courses", "user_question", "model_used", "created_at")}),
        ("AI Response", {"fields": ("ai_response",)}),
    )


@admin.register(WhatsAppLead)
class WhatsAppLeadAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "source", "crm_status", "student_profile", "course", "created_at")
    search_fields = ("name", "phone", "email", "crm_response", "source")
    list_filter = ("crm_status", "source", "created_at")
    autocomplete_fields = ("student_profile", "course")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Lead Info", {"fields": ("name", "phone", "email", "source", "student_profile", "course", "lead_form_url")}),
        ("Message + CRM", {"fields": ("whatsapp_message", "metadata", "crm_status", "crm_response", "created_at", "updated_at")}),
    )


@admin.register(KioskSession)
class KioskSessionAdmin(admin.ModelAdmin):
    list_display = ("phone", "status", "student_profile", "visit_count", "created_at", "updated_at")
    search_fields = ("phone", "student_profile__name")
    list_filter = ("status", "created_at")
    readonly_fields = ("session_key", "created_at", "updated_at", "last_visited_at")
    fieldsets = (
        ("Session Info", {"fields": ("session_key", "phone", "status", "student_profile", "visit_count")}),
        ("Profile Data", {"fields": ("profile_data",)}),
        ("Recommendations", {"fields": ("shortlisted_course_ids", "shortlisted_university_ids", "selected_course_ids")}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "last_visited_at")}),
    )


@admin.register(SessionOTP)
class SessionOTPAdmin(admin.ModelAdmin):
    list_display = ("session", "otp_code", "is_verified", "attempts", "expires_at", "created_at")
    search_fields = ("session__phone",)
    list_filter = ("is_verified", "created_at")
    readonly_fields = ("created_at",)