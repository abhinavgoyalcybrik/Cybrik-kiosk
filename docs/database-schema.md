# Cybrik EduGraph Database Schema

## Core Data Flow

Student Profile
→ Course Search
→ Eligibility Check
→ Preference Scoring
→ Shortlist
→ AI Recommendation

---

# 1. University

Stores institution-level information.

## Fields

### Basic Info
- name
- official_website
- country
- state_province
- city
- campus_locations
- institution_type
- ownership_type
- accreditation
- established_year

### Rankings
- qs_ranking
- the_ranking
- national_ranking
- ranking_notes

### Admissions Metadata
- application_portal_url
- international_admissions_email
- application_fee
- application_fee_currency
- average_offer_timeline
- deposit_required
- deposit_amount
- refund_policy
- scholarship_available

### Student Life / Location
- accommodation_available
- estimated_monthly_living_cost
- living_cost_currency
- part_time_work_friendliness
- indian_student_presence
- public_transport_quality
- safety_rating
- job_market_rating
- nearby_industry_hubs
- weather_notes

### Consultant Notes
- visa_success_notes
- internal_notes
- common_concerns

---

# 2. Course / Program

Stores course-specific information.

## Fields

### Program Basics
- university
- title
- degree_level
- field_of_study
- specialization
- department
- faculty
- duration_months
- mode
- campus
- course_url

### Academic Details
- course_summary
- modules
- credits
- thesis_option
- project_option
- internship_available
- coop_available
- placement_year_available

### Career Outcomes
- career_outcomes
- relevant_industries
- average_salary_notes
- employability_notes

### Admissions
- application_difficulty
- competitiveness
- seats_available
- admissions_notes

---

# 3. Course Intake

Stores intake-specific deadlines and availability.

## Fields
- course
- intake_month
- intake_year
- application_open_date
- application_deadline
- status
- notes

---

# 4. Course Fee

Stores tuition and cost information.

## Fields
- course
- tuition_fee
- currency
- fee_period
- estimated_total_tuition
- estimated_total_living_cost
- estimated_total_cost
- scholarship_notes
- fee_notes

---

# 5. Academic Requirement

Stores academic eligibility rules.

## Fields
- course
- min_cgpa
- min_percentage
- accepted_grading_scale
- required_qualification
- required_bachelor_background
- accepted_disciplines
- prerequisite_subjects
- backlog_limit
- active_backlog_allowed
- gap_year_tolerance
- work_experience_required
- min_work_experience_months
- research_experience_required
- academic_flexibility_notes
- common_academic_rejection_reasons

---

# 6. English Requirement

Stores language test requirements.

## Fields
- course
- ielts_overall
- ielts_listening
- ielts_reading
- ielts_writing
- ielts_speaking
- toefl_overall
- pte_overall
- duolingo_overall
- english_waiver_available
- waiver_conditions
- english_score_flexibility_notes

---

# 7. Document Requirement

Stores required application documents.

## Fields
- course
- sop_required
- lor_required
- number_of_lors
- resume_required
- portfolio_required
- gre_required
- gmat_required
- passport_required
- financial_documents_required
- document_notes

---

# 8. Consultant Rule

Stores internal shortlisting logic and risk notes.

## Fields
- course
- cgpa_flexible
- english_score_flexible
- background_flexible
- backlog_flexible
- high_risk_profile_notes
- borderline_profile_notes
- strong_profile_notes
- common_rejection_reasons
- consultant_recommendation_notes
- visa_risk_notes

---

# 9. Student Profile

Stores student input before shortlisting.

## Fields

### Personal / Preference
- name
- target_degree
- field_of_interest
- preferred_countries
- preferred_cities
- preferred_intake
- max_budget
- budget_currency
- career_goal

### Academics
- highest_qualification
- institution_name
- academic_major
- cgpa
- percentage
- grading_scale
- total_backlogs
- active_backlogs
- gap_years
- graduation_year

### Test Scores
- ielts_overall
- ielts_listening
- ielts_reading
- ielts_writing
- ielts_speaking
- toefl_overall
- pte_overall
- duolingo_overall
- gre_score
- gmat_score

### Experience
- work_experience_months
- internship_experience
- research_experience
- projects
- certifications

### Constraints
- scholarship_required
- low_tuition_required
- public_university_preferred
- english_waiver_required
- no_gre_required
- no_application_fee_preferred

---

# 10. Shortlist Item

Stores selected course recommendations.

## Fields
- student_profile
- course
- eligibility_status
- match_score
- academic_score
- budget_score
- course_relevance_score
- country_score
- city_score
- intake_score
- career_score
- risk_flags
- recommendation_reason
- created_at

---

# 11. Recommendation Log

Stores AI-generated recommendation sessions.

## Fields
- student_profile
- shortlisted_courses
- user_question
- ai_response
- model_used
- created_at