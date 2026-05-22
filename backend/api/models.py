from django.db import models

class University(models.Model):
    # Basic Info
    name = models.CharField(max_length=255)
    official_website = models.URLField(blank=True)
    country = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100)
    campus_locations = models.TextField(blank=True)
    institution_type = models.CharField(max_length=100, blank=True)
    ownership_type = models.CharField(max_length=100, blank=True)
    accreditation = models.TextField(blank=True)
    established_year = models.PositiveIntegerField(null=True, blank=True)

    # Rankings
    qs_ranking = models.PositiveIntegerField(null=True, blank=True)
    the_ranking = models.PositiveIntegerField(null=True, blank=True)
    national_ranking = models.PositiveIntegerField(null=True, blank=True)
    ranking_notes = models.TextField(blank=True)

    # Admissions Metadata
    application_portal_url = models.URLField(blank=True)
    international_admissions_email = models.EmailField(blank=True)
    application_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    application_fee_currency = models.CharField(max_length=10, blank=True)
    average_offer_timeline = models.CharField(max_length=100, blank=True)
    deposit_required = models.BooleanField(default=False)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    refund_policy = models.TextField(blank=True)
    scholarship_available = models.BooleanField(default=False)

    # Student Life / Location
    accommodation_available = models.BooleanField(default=False)
    estimated_monthly_living_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    living_cost_currency = models.CharField(max_length=10, blank=True)
    part_time_work_friendliness = models.PositiveSmallIntegerField(null=True, blank=True)
    indian_student_presence = models.PositiveSmallIntegerField(null=True, blank=True)
    public_transport_quality = models.PositiveSmallIntegerField(null=True, blank=True)
    safety_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    job_market_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    nearby_industry_hubs = models.TextField(blank=True)
    weather_notes = models.TextField(blank=True)

    # Consultant Notes
    visa_success_notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    common_concerns = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} - {self.city}, {self.country}"

class GalleryImage(models.Model):
    university = models.ForeignKey(
        University,
        on_delete=models.CASCADE,
        related_name="gallery_images"
    )
    image_url = models.URLField(max_length=500)
    caption = models.CharField(max_length=255, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.university.name} - {self.image_url}"

class Course(models.Model):
    university = models.ForeignKey(
        University,
        on_delete=models.CASCADE,
        related_name="courses"
    )

    # Program Basics
    title = models.CharField(max_length=255)
    degree_level = models.CharField(max_length=100)
    field_of_study = models.CharField(max_length=255)
    specialization = models.CharField(max_length=255, blank=True)
    department = models.CharField(max_length=255, blank=True)
    faculty = models.CharField(max_length=255, blank=True)
    duration_months = models.PositiveIntegerField(null=True, blank=True)
    mode = models.CharField(max_length=100, blank=True)
    campus = models.CharField(max_length=255, blank=True)
    course_url = models.URLField(blank=True)

    # Academic Details
    course_summary = models.TextField(blank=True)
    modules = models.TextField(blank=True)
    credits = models.PositiveIntegerField(null=True, blank=True)
    thesis_option = models.BooleanField(default=False)
    project_option = models.BooleanField(default=False)
    internship_available = models.BooleanField(default=False)
    coop_available = models.BooleanField(default=False)
    placement_year_available = models.BooleanField(default=False)

    # Career Outcomes
    career_outcomes = models.TextField(blank=True)
    relevant_industries = models.TextField(blank=True)
    average_salary_notes = models.TextField(blank=True)
    employability_notes = models.TextField(blank=True)

    # Admissions
    application_difficulty = models.CharField(max_length=100, blank=True)
    competitiveness = models.CharField(max_length=100, blank=True)
    seats_available = models.PositiveIntegerField(null=True, blank=True)
    admissions_notes = models.TextField(blank=True)

    # Human Review
    human_verified = models.BooleanField(default=False, help_text="Mark when a human has reviewed and confirmed this course is complete and accurate.")
    human_verified_by = models.CharField(max_length=150, blank=True, help_text="Name of the person who verified this course.")
    human_verified_at = models.DateTimeField(null=True, blank=True, help_text="When this course was last verified.")

    def __str__(self):
        return f"{self.title} - {self.university.name}"


class CourseIntake(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="intakes"
    )

    intake_month = models.CharField(max_length=50)
    intake_year = models.PositiveIntegerField(null=True, blank=True)
    application_open_date = models.DateField(null=True, blank=True)
    application_deadline = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.course.title} - {self.intake_month} {self.intake_year or ''}"


class CourseFee(models.Model):
    course = models.OneToOneField(
        Course,
        on_delete=models.CASCADE,
        related_name="fee"
    )

    tuition_fee = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, blank=True)
    fee_period = models.CharField(max_length=100, blank=True)
    estimated_total_tuition = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    estimated_total_living_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    estimated_total_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    scholarship_notes = models.TextField(blank=True)
    fee_notes = models.TextField(blank=True)

    def __str__(self):
        return f"Fees for {self.course.title}"


class AcademicRequirement(models.Model):
    course = models.OneToOneField(
        Course,
        on_delete=models.CASCADE,
        related_name="academic_requirement"
    )

    min_cgpa = models.FloatField(null=True, blank=True)
    min_percentage = models.FloatField(null=True, blank=True)
    accepted_grading_scale = models.CharField(max_length=100, blank=True)
    required_qualification = models.CharField(max_length=255, blank=True)
    required_bachelor_background = models.TextField(blank=True)
    accepted_disciplines = models.TextField(blank=True)
    prerequisite_subjects = models.TextField(blank=True)
    backlog_limit = models.PositiveIntegerField(null=True, blank=True)
    active_backlog_allowed = models.BooleanField(default=False)
    gap_year_tolerance = models.PositiveIntegerField(null=True, blank=True)
    work_experience_required = models.BooleanField(default=False)
    min_work_experience_months = models.PositiveIntegerField(null=True, blank=True)
    research_experience_required = models.BooleanField(default=False)
    academic_flexibility_notes = models.TextField(blank=True)
    common_academic_rejection_reasons = models.TextField(blank=True)

    def __str__(self):
        return f"Academic requirements for {self.course.title}"


class EnglishRequirement(models.Model):
    course = models.OneToOneField(
        Course,
        on_delete=models.CASCADE,
        related_name="english_requirement"
    )

    ielts_overall = models.FloatField(null=True, blank=True)
    ielts_listening = models.FloatField(null=True, blank=True)
    ielts_reading = models.FloatField(null=True, blank=True)
    ielts_writing = models.FloatField(null=True, blank=True)
    ielts_speaking = models.FloatField(null=True, blank=True)

    toefl_overall = models.FloatField(null=True, blank=True)
    pte_overall = models.FloatField(null=True, blank=True)
    duolingo_overall = models.FloatField(null=True, blank=True)

    english_waiver_available = models.BooleanField(default=False)
    waiver_conditions = models.TextField(blank=True)
    english_score_flexibility_notes = models.TextField(blank=True)

    def __str__(self):
        return f"English requirements for {self.course.title}"


class DocumentRequirement(models.Model):
    course = models.OneToOneField(
        Course,
        on_delete=models.CASCADE,
        related_name="document_requirement"
    )

    sop_required = models.BooleanField(default=False)
    lor_required = models.BooleanField(default=False)
    number_of_lors = models.PositiveIntegerField(null=True, blank=True)
    resume_required = models.BooleanField(default=False)
    portfolio_required = models.BooleanField(default=False)
    gre_required = models.BooleanField(default=False)
    gmat_required = models.BooleanField(default=False)
    passport_required = models.BooleanField(default=True)
    financial_documents_required = models.BooleanField(default=False)
    document_notes = models.TextField(blank=True)

    def __str__(self):
        return f"Document requirements for {self.course.title}"


class ConsultantRule(models.Model):
    course = models.OneToOneField(
        Course,
        on_delete=models.CASCADE,
        related_name="consultant_rule"
    )

    cgpa_flexible = models.BooleanField(default=False)
    english_score_flexible = models.BooleanField(default=False)
    background_flexible = models.BooleanField(default=False)
    backlog_flexible = models.BooleanField(default=False)

    high_risk_profile_notes = models.TextField(blank=True)
    borderline_profile_notes = models.TextField(blank=True)
    strong_profile_notes = models.TextField(blank=True)
    common_rejection_reasons = models.TextField(blank=True)
    consultant_recommendation_notes = models.TextField(blank=True)
    visa_risk_notes = models.TextField(blank=True)

    def __str__(self):
        return f"Consultant rules for {self.course.title}"


class StudentProfile(models.Model):
    # Personal Info
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)

    # Preferences
    preferred_countries = models.JSONField(default=list, blank=True)
    preferred_cities = models.JSONField(default=list, blank=True)
    preferred_intake = models.CharField(max_length=100, blank=True)
    max_budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    budget_currency = models.CharField(max_length=10, blank=True)
    career_goal = models.TextField(blank=True)

    # Discovery Inputs
    interested_career_paths = models.JSONField(default=list, blank=True)
    preferred_subject_areas = models.JSONField(default=list, blank=True)
    disliked_subject_areas = models.JSONField(default=list, blank=True)

    # Academics
    highest_qualification = models.CharField(max_length=255, blank=True)
    institution_name = models.CharField(max_length=255, blank=True)

    academic_stream = models.CharField(
        max_length=100,
        blank=True,
        help_text="For school students: Medical, Non-Medical, Commerce, Arts, Humanities, etc."
    )

    academic_major = models.CharField(
        max_length=255,
        blank=True,
        help_text="For undergraduate students: Computer Science, BCom, Mechanical Engineering, etc."
    )

    subjects_studied = models.JSONField(
        default=list,
        blank=True,
        help_text="Example: ['Maths', 'Physics', 'Computer Science', 'Economics']"
    )

    cgpa = models.FloatField(null=True, blank=True)
    percentage = models.FloatField(null=True, blank=True)
    grading_scale = models.CharField(max_length=100, blank=True)
    total_backlogs = models.PositiveIntegerField(null=True, blank=True)
    active_backlogs = models.PositiveIntegerField(null=True, blank=True)
    gap_years = models.PositiveIntegerField(null=True, blank=True)
    graduation_year = models.PositiveIntegerField(null=True, blank=True)

    # Test Scores
    ielts_overall = models.FloatField(null=True, blank=True)
    ielts_listening = models.FloatField(null=True, blank=True)
    ielts_reading = models.FloatField(null=True, blank=True)
    ielts_writing = models.FloatField(null=True, blank=True)
    ielts_speaking = models.FloatField(null=True, blank=True)

    toefl_overall = models.FloatField(null=True, blank=True)
    pte_overall = models.FloatField(null=True, blank=True)
    duolingo_overall = models.FloatField(null=True, blank=True)
    gre_score = models.PositiveIntegerField(null=True, blank=True)
    gmat_score = models.PositiveIntegerField(null=True, blank=True)

    # Experience
    work_experience_months = models.PositiveIntegerField(null=True, blank=True)
    internship_experience = models.TextField(blank=True)
    research_experience = models.TextField(blank=True)
    projects = models.TextField(blank=True)
    certifications = models.TextField(blank=True)

    # Constraints
    scholarship_required = models.BooleanField(default=False)
    low_tuition_required = models.BooleanField(default=False)
    public_university_preferred = models.BooleanField(default=False)
    english_waiver_required = models.BooleanField(default=False)
    no_gre_required = models.BooleanField(default=False)
    no_application_fee_preferred = models.BooleanField(default=False)

    # Internal Notes
    counselor_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ShortlistItem(models.Model):
    student_profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="shortlist_items"
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="shortlist_items"
    )

    eligibility_status = models.CharField(max_length=100, blank=True)
    match_score = models.FloatField(null=True, blank=True)

    academic_score = models.FloatField(null=True, blank=True)
    budget_score = models.FloatField(null=True, blank=True)
    course_relevance_score = models.FloatField(null=True, blank=True)
    country_score = models.FloatField(null=True, blank=True)
    city_score = models.FloatField(null=True, blank=True)
    intake_score = models.FloatField(null=True, blank=True)
    career_score = models.FloatField(null=True, blank=True)

    risk_flags = models.JSONField(default=list, blank=True)
    recommendation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student_profile.name} - {self.course.title}"


class RecommendationLog(models.Model):
    student_profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name="recommendation_logs"
    )
    shortlisted_courses = models.ManyToManyField(
        Course,
        related_name="recommendation_logs",
        blank=True
    )

    user_question = models.TextField(blank=True)
    ai_response = models.TextField(blank=True)
    model_used = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Recommendation for {self.student_profile.name} - {self.created_at}"


class WhatsAppLead(models.Model):
    CRM_STATUS_PENDING = "pending"
    CRM_STATUS_SENT = "sent"
    CRM_STATUS_FAILED = "failed"

    CRM_STATUS_CHOICES = (
        (CRM_STATUS_PENDING, "Pending"),
        (CRM_STATUS_SENT, "Sent"),
        (CRM_STATUS_FAILED, "Failed"),
    )

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True)

    student_profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_leads",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_leads",
    )

    source = models.CharField(max_length=100, blank=True, default="whatsapp")
    lead_form_url = models.URLField(blank=True)
    whatsapp_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    crm_status = models.CharField(
        max_length=20,
        choices=CRM_STATUS_CHOICES,
        default=CRM_STATUS_PENDING,
    )
    crm_response = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.phone}) - {self.crm_status}"
