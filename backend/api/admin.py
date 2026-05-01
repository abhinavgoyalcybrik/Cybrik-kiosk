from django.contrib import admin
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
)


class CourseIntakeInline(admin.TabularInline):
    model = CourseIntake
    extra = 1


class CourseFeeInline(admin.StackedInline):
    model = CourseFee
    extra = 0
    max_num = 1


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

    search_fields = (
        "name",
        "country",
        "city",
        "institution_type",
        "ownership_type",
    )

    list_filter = (
        "country",
        "city",
        "ownership_type",
        "scholarship_available",
        "accommodation_available",
    )

    fieldsets = (
        ("Basic Info", {
            "fields": (
                "name",
                "official_website",
                "country",
                "state_province",
                "city",
                "campus_locations",
                "institution_type",
                "ownership_type",
                "accreditation",
                "established_year",
            )
        }),
        ("Rankings", {
            "fields": (
                "qs_ranking",
                "the_ranking",
                "national_ranking",
                "ranking_notes",
            )
        }),
        ("Admissions Metadata", {
            "fields": (
                "application_portal_url",
                "international_admissions_email",
                "application_fee",
                "application_fee_currency",
                "average_offer_timeline",
                "deposit_required",
                "deposit_amount",
                "refund_policy",
                "scholarship_available",
            )
        }),
        ("Student Life / Location", {
            "fields": (
                "accommodation_available",
                "estimated_monthly_living_cost",
                "living_cost_currency",
                "part_time_work_friendliness",
                "indian_student_presence",
                "public_transport_quality",
                "safety_rating",
                "job_market_rating",
                "nearby_industry_hubs",
                "weather_notes",
            )
        }),
        ("Consultant Notes", {
            "fields": (
                "visa_success_notes",
                "internal_notes",
                "common_concerns",
            )
        }),
    )


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "university",
        "degree_level",
        "field_of_study",
        "specialization",
        "mode",
        "application_difficulty",
    )

    search_fields = (
        "title",
        "university__name",
        "field_of_study",
        "specialization",
        "department",
        "faculty",
    )

    list_filter = (
        "degree_level",
        "field_of_study",
        "mode",
        "internship_available",
        "coop_available",
        "placement_year_available",
        "application_difficulty",
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

    fieldsets = (
        ("Program Basics", {
            "fields": (
                "university",
                "title",
                "degree_level",
                "field_of_study",
                "specialization",
                "department",
                "faculty",
                "duration_months",
                "mode",
                "campus",
                "course_url",
            )
        }),
        ("Academic Details", {
            "fields": (
                "course_summary",
                "modules",
                "credits",
                "thesis_option",
                "project_option",
                "internship_available",
                "coop_available",
                "placement_year_available",
            )
        }),
        ("Career Outcomes", {
            "fields": (
                "career_outcomes",
                "relevant_industries",
                "average_salary_notes",
                "employability_notes",
            )
        }),
        ("Admissions", {
            "fields": (
                "application_difficulty",
                "competitiveness",
                "seats_available",
                "admissions_notes",
            )
        }),
    )


@admin.register(CourseIntake)
class CourseIntakeAdmin(admin.ModelAdmin):
    list_display = (
        "course",
        "intake_month",
        "intake_year",
        "application_deadline",
        "status",
    )

    search_fields = (
        "course__title",
        "course__university__name",
        "intake_month",
        "status",
    )

    list_filter = (
        "intake_month",
        "intake_year",
        "status",
    )

    autocomplete_fields = ("course",)


@admin.register(CourseFee)
class CourseFeeAdmin(admin.ModelAdmin):
    list_display = (
        "course",
        "tuition_fee",
        "currency",
        "fee_period",
        "estimated_total_cost",
    )

    search_fields = (
        "course__title",
        "course__university__name",
        "currency",
    )

    list_filter = (
        "currency",
        "fee_period",
    )

    autocomplete_fields = ("course",)


@admin.register(AcademicRequirement)
class AcademicRequirementAdmin(admin.ModelAdmin):
    list_display = (
        "course",
        "min_cgpa",
        "min_percentage",
        "backlog_limit",
        "active_backlog_allowed",
        "work_experience_required",
    )

    search_fields = (
        "course__title",
        "course__university__name",
        "required_qualification",
        "accepted_disciplines",
    )

    list_filter = (
        "active_backlog_allowed",
        "work_experience_required",
        "research_experience_required",
    )

    autocomplete_fields = ("course",)


@admin.register(EnglishRequirement)
class EnglishRequirementAdmin(admin.ModelAdmin):
    list_display = (
        "course",
        "ielts_overall",
        "toefl_overall",
        "pte_overall",
        "duolingo_overall",
        "english_waiver_available",
    )

    search_fields = (
        "course__title",
        "course__university__name",
        "waiver_conditions",
    )

    list_filter = (
        "english_waiver_available",
    )

    autocomplete_fields = ("course",)


@admin.register(DocumentRequirement)
class DocumentRequirementAdmin(admin.ModelAdmin):
    list_display = (
        "course",
        "sop_required",
        "lor_required",
        "number_of_lors",
        "resume_required",
        "gre_required",
        "gmat_required",
    )

    search_fields = (
        "course__title",
        "course__university__name",
        "document_notes",
    )

    list_filter = (
        "sop_required",
        "lor_required",
        "resume_required",
        "portfolio_required",
        "gre_required",
        "gmat_required",
        "financial_documents_required",
    )

    autocomplete_fields = ("course",)


@admin.register(ConsultantRule)
class ConsultantRuleAdmin(admin.ModelAdmin):
    list_display = (
        "course",
        "cgpa_flexible",
        "english_score_flexible",
        "background_flexible",
        "backlog_flexible",
    )

    search_fields = (
        "course__title",
        "course__university__name",
        "high_risk_profile_notes",
        "borderline_profile_notes",
        "strong_profile_notes",
        "common_rejection_reasons",
    )

    list_filter = (
        "cgpa_flexible",
        "english_score_flexible",
        "background_flexible",
        "backlog_flexible",
    )

    autocomplete_fields = ("course",)


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "highest_qualification",
        "academic_stream",
        "academic_major",
        "percentage",
        "cgpa",
        "ielts_overall",
        "max_budget",
        "budget_currency",
    )

    search_fields = (
        "name",
        "email",
        "phone",
        "academic_stream",
        "academic_major",
        "career_goal",
        "counselor_notes",
    )

    list_filter = (
        "highest_qualification",
        "academic_stream",
        "budget_currency",
        "scholarship_required",
        "low_tuition_required",
        "public_university_preferred",
        "english_waiver_required",
        "no_gre_required",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    fieldsets = (
        ("Personal Info", {
            "fields": (
                "name",
                "email",
                "phone",
            )
        }),
        ("Preferences", {
            "fields": (
                "preferred_countries",
                "preferred_cities",
                "preferred_intake",
                "max_budget",
                "budget_currency",
                "career_goal",
            )
        }),
        ("Discovery Inputs", {
            "fields": (
                "interested_career_paths",
                "preferred_subject_areas",
                "disliked_subject_areas",
            )
        }),
        ("Academics", {
            "fields": (
                "highest_qualification",
                "institution_name",
                "academic_stream",
                "academic_major",
                "subjects_studied",
                "cgpa",
                "percentage",
                "grading_scale",
                "total_backlogs",
                "active_backlogs",
                "gap_years",
                "graduation_year",
            )
        }),
        ("Test Scores", {
            "fields": (
                "ielts_overall",
                "ielts_listening",
                "ielts_reading",
                "ielts_writing",
                "ielts_speaking",
                "toefl_overall",
                "pte_overall",
                "duolingo_overall",
                "gre_score",
                "gmat_score",
            )
        }),
        ("Experience", {
            "fields": (
                "work_experience_months",
                "internship_experience",
                "research_experience",
                "projects",
                "certifications",
            )
        }),
        ("Constraints", {
            "fields": (
                "scholarship_required",
                "low_tuition_required",
                "public_university_preferred",
                "english_waiver_required",
                "no_gre_required",
                "no_application_fee_preferred",
            )
        }),
        ("Internal Notes", {
            "fields": (
                "counselor_notes",
                "created_at",
                "updated_at",
            )
        }),
    )


@admin.register(ShortlistItem)
class ShortlistItemAdmin(admin.ModelAdmin):
    list_display = (
        "student_profile",
        "course",
        "eligibility_status",
        "match_score",
        "created_at",
    )

    search_fields = (
        "student_profile__name",
        "course__title",
        "course__university__name",
        "eligibility_status",
    )

    list_filter = (
        "eligibility_status",
        "created_at",
    )

    autocomplete_fields = (
        "student_profile",
        "course",
    )

    readonly_fields = (
        "created_at",
    )

    fieldsets = (
        ("Student & Course", {
            "fields": (
                "student_profile",
                "course",
                "eligibility_status",
                "match_score",
            )
        }),
        ("Score Breakdown", {
            "fields": (
                "academic_score",
                "budget_score",
                "course_relevance_score",
                "country_score",
                "city_score",
                "intake_score",
                "career_score",
            )
        }),
        ("Recommendation Details", {
            "fields": (
                "risk_flags",
                "recommendation_reason",
                "created_at",
            )
        }),
    )


@admin.register(RecommendationLog)
class RecommendationLogAdmin(admin.ModelAdmin):
    list_display = (
        "student_profile",
        "model_used",
        "created_at",
    )

    search_fields = (
        "student_profile__name",
        "user_question",
        "ai_response",
        "model_used",
    )

    list_filter = (
        "model_used",
        "created_at",
    )

    autocomplete_fields = (
        "student_profile",
        "shortlisted_courses",
    )

    readonly_fields = (
        "created_at",
    )

    fieldsets = (
        ("Recommendation Session", {
            "fields": (
                "student_profile",
                "shortlisted_courses",
                "user_question",
                "model_used",
                "created_at",
            )
        }),
        ("AI Response", {
            "fields": (
                "ai_response",
            )
        }),
    )