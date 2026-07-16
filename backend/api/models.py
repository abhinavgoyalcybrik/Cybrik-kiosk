import uuid
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
    duration_months = models.PositiveIntegerField(null=True, blank=True)
    mode = models.CharField(max_length=100, blank=True)
    campus = models.CharField(max_length=255, blank=True)
    course_url = models.URLField(blank=True)

    # Academic Details
    course_summary = models.TextField(blank=True)

    # Human Review
    human_verified = models.BooleanField(default=False)
    human_verified_by = models.CharField(max_length=150, blank=True)
    human_verified_at = models.DateTimeField(null=True, blank=True)

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

    def save(self, *args, **kwargs):
        if self.estimated_total_tuition is not None and self.estimated_total_living_cost is not None:
            self.estimated_total_cost = self.estimated_total_tuition + self.estimated_total_living_cost
        super().save(*args, **kwargs)

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
    backlog_limit = models.PositiveIntegerField(null=True, blank=True)
    active_backlog_allowed = models.BooleanField(default=False)
    gap_year_tolerance = models.PositiveIntegerField(null=True, blank=True)
    work_experience_required = models.BooleanField(default=False)
    min_work_experience_months = models.PositiveIntegerField(null=True, blank=True)
    research_experience_required = models.BooleanField(default=False)

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
    preferred_field = models.CharField(max_length=255, blank=True)
    preferred_degree = models.CharField(max_length=100, blank=True)
    preferred_duration_months = models.PositiveIntegerField(null=True, blank=True)
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
    academic_stream = models.CharField(max_length=100, blank=True)
    academic_major = models.CharField(max_length=255, blank=True)
    subjects_studied = models.JSONField(default=list, blank=True)
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
        null=True, blank=True,
        related_name="whatsapp_leads",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True, blank=True,
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


# ─── Kiosk Session Models ──────────────────────────────────────────────────────

class KioskSession(models.Model):
    """
    One session per student visit.
    Same phone → resume existing session (never delete).
    All data preserved permanently for analytics + re-engagement.
    """

    STATUS_ACTIVE = "active"
    STATUS_VERIFIED = "verified"
    STATUS_EXPIRED = "expired"

    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_VERIFIED, "Verified"),
        (STATUS_EXPIRED, "Expired"),
    )

    # Identity
    session_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    phone = models.CharField(max_length=50, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)

    # Linked permanent profile (set after OTP verify)
    student_profile = models.ForeignKey(
        StudentProfile,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="kiosk_sessions",
    )

    # Live profile data — autosaved as student fills the form
    profile_data = models.JSONField(default=dict, blank=True)

    # Recommendation tracking
    shortlisted_course_ids = models.JSONField(default=list, blank=True)
    shortlisted_university_ids = models.JSONField(default=list, blank=True)

    # Student manually selected courses
    selected_course_ids = models.JSONField(default=list, blank=True)

    # Visit analytics
    visit_count = models.PositiveIntegerField(default=1)
    last_visited_at = models.DateTimeField(auto_now=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Session {self.session_key} - {self.phone} [{self.status}]"


class SessionOTP(models.Model):
    """OTP for verifying student phone number."""

    session = models.ForeignKey(
        KioskSession,
        on_delete=models.CASCADE,
        related_name="otps",
    )
    otp_code = models.CharField(max_length=10)
    is_verified = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"OTP for {self.session.phone} - verified={self.is_verified}"


# ═══════════════════════════════════════════════════════════════════════════════
# DOCUMENT MANAGEMENT MODELS (Add these at the END of models.py)
# ═══════════════════════════════════════════════════════════════════════════════

class CountryDocumentType(models.Model):
    """Types of documents (checklist, LOR template, SOP template, etc)"""
    DOCUMENT_TYPES = [
        ('checklist', 'Student Visa Checklist'),
        ('lor_template', 'Letter of Recommendation Template'),
        ('sop_template', 'Statement of Purpose Template'),
        ('financial_guide', 'Financial Documents Guide'),
        ('health_guide', 'Health Insurance Guide'),
        ('admission_letter', 'Admission Letter Template'),
        ('passport_guide', 'Passport & ID Documents Guide'),
    ]
    
    name = models.CharField(max_length=100, choices=DOCUMENT_TYPES, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Document Type"
        verbose_name_plural = "Document Types"
    
    def __str__(self):
        return self.get_name_display()


class CountryDocument(models.Model):
    """Store document metadata for each country - 7 countries supported"""
    COUNTRIES = [
        ('australia', 'Australia'),
        ('canada', 'Canada'),
        ('uk', 'United Kingdom'),
        ('germany', 'Germany'),
        ('latvia', 'Latvia'),
        ('newzealand', 'New Zealand'),
        ('cyprus', 'Cyprus'),
    ]
    
    country = models.CharField(max_length=50, choices=COUNTRIES)
    document_type = models.ForeignKey(CountryDocumentType, on_delete=models.CASCADE, related_name='documents')
    file_path = models.CharField(max_length=255, help_text="e.g., documents/australia/checklist.pdf")
    file_name = models.CharField(max_length=255, help_text="e.g., Australia_Student_Visa_Checklist.pdf")
    file_size = models.IntegerField(null=True, blank=True, help_text="File size in bytes")
    required = models.BooleanField(default=True, help_text="Is this document mandatory?")
    description = models.TextField(blank=True, help_text="Description of what this document contains")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('country', 'document_type')
        verbose_name = "Country Document"
        verbose_name_plural = "Country Documents"
        ordering = ['country', 'document_type']
    
    def __str__(self):
        return f"{self.get_country_display()} - {self.document_type.name}"


class StudentDocumentRequest(models.Model):
    """Track which documents student requested"""
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('preparing', 'Preparing to Send'),
        ('sent', 'Sent via WhatsApp'),
        ('downloaded', 'Downloaded by Student'),
        ('completed', 'Completed'),
    ]
    
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='document_requests')
    country = models.CharField(max_length=50, choices=CountryDocument.COUNTRIES)
    documents = models.ManyToManyField(CountryDocument, related_name='student_requests', blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    requested_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    whatsapp_message_id = models.CharField(max_length=255, blank=True, help_text="WhatsApp message ID from Meta API")
    notes = models.TextField(blank=True, help_text="Internal notes about this request")
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Student Document Request"
        verbose_name_plural = "Student Document Requests"
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"{self.student.name} - {self.get_country_display()}"
    
    def mark_sent(self):
        """Mark documents as sent"""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save()


class DocumentConversationLog(models.Model):
    """Log voice agent conversations about documents"""
    AGENT_TYPES = [
        ('voice', 'Voice Agent'),
        ('chatbot', 'Chatbot'),
        ('manual', 'Manual (Admin)'),
    ]
    
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='document_conversations')
    agent_type = models.CharField(max_length=20, choices=AGENT_TYPES)
    country = models.CharField(max_length=50, choices=CountryDocument.COUNTRIES)
    conversation_text = models.TextField(help_text="What the agent and student discussed")
    documents_identified = models.ManyToManyField(CountryDocument, blank=True, help_text="Documents identified as needed")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Document Conversation Log"
        verbose_name_plural = "Document Conversation Logs"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.student.name} - {self.agent_type} - {self.get_country_display()}"