## 📋 Project Overview

**Cybrik EduGraph** is a comprehensive AI-powered university course recommendation platform designed specifically for Indian students seeking international education. It intelligently matches student profiles to suitable courses across international universities based on academic credentials, language proficiency, preferences, and other factors.

### Core Purpose
- Provide personalized course recommendations to students
- Help students understand their eligibility for specific courses
- Build shortlists of suitable courses and universities
- Generate detailed analysis with risk assessments and confidence scores
- Facilitate lead generation through WhatsApp integration

---

## 🏗️ Architecture Overview

The application uses a **Django REST Framework backend** paired with a **Next.js frontend**, following a clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  (TypeScript, React, Tailwind CSS, Framer Motion)          │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API Calls
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend (Django + DRF)                          │
│  ├─ API Layer (Views & Serializers)                         │
│  ├─ Business Logic (Services)                               │
│  └─ Data Layer (Models & Database)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │   SQLite Database      │
        │  (db.sqlite3)          │
        └────────────────────────┘
```

---

## 🗄️ Database Schema & Data Models

### 1. **University Model**
Stores comprehensive information about educational institutions.

**Key Attributes:**
- Basic Info: name, website, country, city, location
- Rankings: QS, THE, National rankings
- Admissions: application portal, fees, deposit requirements
- Student Life: accommodation, living costs, safety ratings, job market
- Consultant Notes: visa success, common concerns, internal notes

**Relationships:**
- `1-to-Many`: Has multiple Courses
- `1-to-Many`: Has multiple Gallery Images

---

### 2. **Course Model**
Detailed information about individual degree programs.

**Key Attributes:**
- Program Basics: title, degree level, field of study, specialization, duration
- Academic Details: modules, credits, thesis/project options, internship availability
- Career Outcomes: placement data, employability notes, salary information
- Admissions: difficulty level, competitiveness, available seats

**Related Models (One-to-One Relationships):**
- `CourseFee`: Tuition fees, estimated total costs, scholarship info
- `AcademicRequirement`: CGPA, percentage, prerequisite background, backlog limits
- `EnglishRequirement`: IELTS/TOEFL/PTE/Duolingo score requirements
- `DocumentRequirement`: SOP, LOR, GRE/GMAT, portfolio requirements
- `ConsultantRule`: Flexibility factors, risk profiles, rejection reasons
- `CourseIntake`: Application deadlines, intake months/years

**Relationships:**
- `Many-to-One`: Belongs to a University
- `1-to-Many`: Has multiple Intakes (CourseIntake)

---

### 3. **StudentProfile Model**
Comprehensive student information for matching and recommendation.

**Key Attributes:**

**Personal Info:**
- name, email, phone

**Preferences:**
- preferred_countries, preferred_cities
- preferred_intake, max_budget
- career_goal

**Discovery Inputs:**
- interested_career_paths
- preferred_subject_areas, disliked_subject_areas

**Academics:**
- highest_qualification, academic_stream, academic_major
- subjects_studied
- CGPA, percentage, grading_scale
- backlogs (total and active), gap_years
- graduation_year

**Test Scores:**
- IELTS (overall, listening, reading, writing, speaking)
- TOEFL, PTE, Duolingo scores
- GRE, GMAT scores

**Timestamps:**
- created_at, updated_at

---

### 4. **WhatsAppLead Model**
Captures lead information from WhatsApp form submissions.

**Attributes:**
- student_name, student_email, student_phone
- university_interest, course_interest
- message
- created_at

---

### 5. **ShortlistItem Model**
Tracks courses added to student shortlists.

**Attributes:**
- student (FK to StudentProfile)
- course (FK to Course)
- added_at, notes

---

## 📡 API Endpoints

All endpoints are prefixed with `/api/`:

### Public Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/stats/` | GET | Platform statistics (total universities, courses, students) |
| `/courses/` | GET | Browse all courses with filtering options |
| `/courses/<id>/` | GET | Detailed course information |

### Student-Related Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/students/lookup/` | POST | Find or create student profile |
| `/students/<id>/recommendations/` | GET | Get personalized course recommendations |

### WhatsApp Integration Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/leads/whatsapp/form-context/` | GET | Get form context for WhatsApp lead capture |
| `/leads/whatsapp/` | POST | Capture lead from WhatsApp form |
| `/courses/<id>/whatsapp-share/` | GET | Generate shareable WhatsApp payload |
| `/shortlist/whatsapp-share/` | POST | Generate shareable shortlist for WhatsApp |

### Document Generation

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/shortlist/pdf/` | POST | Generate PDF of student's shortlist |

---

## 🧠 Business Logic Services

The `services/` directory contains core business logic:

### 1. **scoring.py** - Recommendation Scoring Engine
Calculates match scores between students and courses.

**Scoring Components:**
- **Academic Score** (0-30): Based on student percentage vs. course requirements
- **English Score** (0-35): Based on IELTS/TOEFL scores
- **Stream Relevance** (0-20): Matches student's academic stream to course field
- **Subject Relevance** (0-20): Matches subjects studied to course content
- **Budget Alignment** (0-15): Scores based on cost compatibility
- **Location Preference** (0-15): Scores based on country/city preferences

**Stream-to-Course Mapping:**
- Non-Medical → CS, IT, Engineering, AI, Cybersecurity
- Medical → Health, Biomedical, Nursing, Public Health
- Commerce → Business, Finance, Accounting, Economics
- Arts/Humanities → Media, Communication, Education, Social Science

**Total Maximum Score: 135 points**

---

### 2. **eligibility.py** - Eligibility Checker
Determines if a student is eligible, borderline, or ineligible for courses.

**Key Functions:**

- `is_degree_compatible()`: Validates degree level compatibility
  - High School → Bachelor's
  - Bachelor's → Master's
  - Master's → PhD

- `check_academic()`: Verifies academic requirements
  - CGPA/Percentage checks
  - Backlog limits
  - Gap year tolerance
  - Work/research experience requirements

- `check_english()`: Validates English proficiency
  - IELTS/TOEFL/PTE score validation
  - Component-wise requirements (listening, reading, writing, speaking)
  - English waiver conditions

- `check_background()`: Verifies field of study compatibility
  - Technical field requirements
  - Discipline-specific prerequisites
  - Background flexibility flags

- `get_eligible_courses()`: Returns list of eligible courses
  - Combines all checks
  - Returns eligibility status with reasons

---

### 3. **profile.py** - Profile Analysis
Analyzes and evaluates student profile completeness.

**Key Functions:**

- `compute_profile_completeness()`: Calculates % of required fields filled
  - Tracks missing fields
  - Returns completeness score (0-100%)

- `compute_recommendation_confidence()`: Determines recommendation reliability
  - High Confidence: 80%+ completeness
  - Medium Confidence: 50-80% completeness
  - Low Confidence: <50% completeness
  - Lists missing fields needed for better recommendations

---

### 4. **risk_flags.py** - Risk Assessment
Identifies potential issues or risks in applications.

**Risk Types:**
- Academic risks (low CGPA, high backlogs)
- English proficiency gaps
- Field mismatch risks
- Visa/acceptance probability risks
- Budget feasibility concerns

---

### 5. **explanations.py** - Explanation Generation
Generates human-readable explanations for recommendations.

**Explains:**
- Why a course is/isn't recommended
- Specific eligibility gaps
- Required improvements
- Potential career outcomes
- Risk factors

---

## 🎯 Core Workflows

### Workflow 1: Student Onboarding & Profile Creation

```
1. User visits frontend
   ↓
2. Redirected to onboarding/shortlist page
   ↓
3. User fills out profile form:
   - Personal info (name, email, phone)
   - Academic background (stream, CGPA, subjects)
   - Test scores (IELTS, TOEFL, GRE, GMAT)
   - Preferences (countries, cities, budget, career goals)
   ↓
4. Frontend sends POST to `/students/lookup/`
   ↓
5. Backend creates/updates StudentProfile in database
   ↓
6. Returns student ID and profile data
   ↓
7. Frontend stores student ID locally
```

---

### Workflow 2: Course Recommendation Generation

```
1. User completes profile and requests recommendations
   ↓
2. Frontend calls GET `/students/<id>/recommendations/`
   ↓
3. Backend executes multi-step recommendation engine:
   
   Step A: Eligibility Filtering
   ├─ Fetch all courses from database
   ├─ Filter by degree compatibility
   ├─ Filter by academic requirements (CGPA, percentage)
   ├─ Filter by English proficiency
   ├─ Filter by field/background compatibility
   └─ Result: ~300-500 potentially eligible courses
   
   Step B: Scoring & Ranking
   ├─ For each eligible course, calculate match score
   ├─ Score components:
   │  ├─ Academic fit (0-30)
   │  ├─ English proficiency (0-35)
   │  ├─ Stream relevance (0-20)
   │  ├─ Subject relevance (0-20)
   │  ├─ Budget alignment (0-15)
   │  └─ Location preference (0-15)
   ├─ Total score out of 135
   └─ Result: Ranked list of courses
   
   Step C: Generate Explanations
   ├─ For top N courses, generate detailed explanations
   ├─ Explain why each is/isn't recommended
   ├─ Identify specific gaps
   └─ Suggest improvements
   
   Step D: Generate Risk Flags
   ├─ Identify academic risks
   ├─ Identify visa/acceptance risks
   ├─ Identify budget concerns
   └─ Generate confidence levels
   
4. Package results with recommendations, explanations, risk flags
   ↓
5. Return to frontend as JSON
```

---

### Workflow 3: Course Browsing & Filtering

```
1. User navigates to courses page
   ↓
2. Frontend calls GET `/courses/?filters=...`
   (Optional filters: country, university, field, budget, duration)
   ↓
3. Backend returns paginated course catalog
   ↓
4. For each course in results, include:
   - Course details (title, field, degree level, duration)
   - University info (name, country, city)
   - Fee information
   - IELTS requirement
   - Intake information
   ↓
5. Frontend displays in CourseResultsGrid component
   ↓
6. User can:
   - Click for full details
   - Add to shortlist
   - Share on WhatsApp
```

---

### Workflow 4: Shortlist Management

```
1. User adds course to shortlist
   ↓
2. Frontend records in local storage/state
   ↓
3. User can:
   - View all shortlisted courses
   - Remove items
   - Compare courses side-by-side
   - Generate PDF of shortlist
   - Share shortlist on WhatsApp
   ↓
4. Share Workflow:
   ├─ Frontend calls POST `/shortlist/whatsapp-share/`
   ├─ Backend generates shareable payload
   ├─ Returns WhatsApp message template with course info
   └─ User can copy/send to contacts
```

---

### Workflow 5: WhatsApp Lead Generation

```
1. User clicks "Contact via WhatsApp" on course page
   ↓
2. Frontend displays WhatsApp lead form
   ↓
3. User fills:
   - Name, email, phone
   - University interest
   - Specific questions/message
   ↓
4. Frontend calls POST `/leads/whatsapp/`
   ↓
5. Backend:
   - Creates WhatsAppLead record
   - Logs lead information
   - Returns confirmation
   ↓
6. Lead is stored in database for follow-up
```

---

### Workflow 6: PDF Generation

```
1. User clicks "Download Shortlist as PDF"
   ↓
2. Frontend calls POST `/shortlist/pdf/` with:
   - Student ID
   - Shortlist course IDs
   ↓
3. Backend uses ReportLab to generate PDF:
   - Student information header
   - Shortlist summary table
   - Individual course details pages
   - Recommendation notes
   ↓
4. Returns PDF file to browser
   ↓
5. User downloads/prints
```

---

## 🧩 Frontend Structure (Next.js)

### Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Redirect | Redirects to shortlist |
| `/shortlist` | ShortlistPage | View and manage shortlisted courses |
| `/onboarding` | OnboardingPage | Student profile creation (redirects to shortlist) |
| `/profile` | ProfilePage | View/edit student profile |
| `/course/[id]` | CourseDetailPage | View detailed course information |
| `/lead-form` | LeadFormPage | WhatsApp lead capture form |

### Key Components

**Layout Components:**
- Navigation headers
- Sidebar
- Footer

**Course Components:**
- `CourseCard`: Individual course card display
- `CourseResultsGrid`: Grid of course cards
- `ComparisonModal`: Side-by-side course comparison

**Student Components:**
- Profile form components
- Recommendation list display
- Shortlist management

### Hooks

- `useRecommendations`: Fetch and cache course recommendations
- Custom hooks for API calls and state management

### Libraries

- **Next.js 16.2.4**: React framework
- **React 19.2.4**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS 4**: Styling
- **Framer Motion 12.38.0**: Animations
- **rc-slider 11.1.9**: Range sliders for filters

---

## 📊 Data Ingestion Pipeline

### Data Import Scripts

#### 1. **import_deakin.py**
Imports Deakin University course data from JSON export.

**Process:**
```
1. Read deakin_university.json from repo root
2. Parse JSON structure
3. Create/update University record
4. For each program in JSON:
   ├─ Create Course record
   ├─ Create CourseFee record
   ├─ Create AcademicRequirement record
   ├─ Create EnglishRequirement record
   ├─ Create CourseIntake records
   └─ Create DocumentRequirement record
5. Commit transaction
6. Log results
```

#### 2. **import_acu.py**
Similar process for Australian Catholic University data.

#### 3. **data_ingestion/deakin/crawler.py**
Web scraper for Deakin University website data.

**Components:**
- `crawler.py`: Orchestrates the scraping process
- `extractor.py`: Extracts relevant information from HTML
- `link_classifier.py`: Classifies URLs (program pages, etc.)
- Output: Structured JSON files

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Student Interaction                          │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ↓ (Creates/Updates)
        ┌──────────────────┐
        │ StudentProfile   │
        └──────────────────┘
               │
               ↓ (Triggers)
    ┌──────────────────────────────┐
    │ Recommendation Engine        │
    ├──────────────────────────────┤
    │ 1. Eligibility Check        │
    │ 2. Scoring Calculation      │
    │ 3. Risk Assessment          │
    │ 4. Explanation Generation   │
    └──────────────────────────────┘
               │
               ↓ (Queries)
    ┌──────────────────────────────┐
    │ Course Database              │
    ├──────────────────────────────┤
    │ • Courses                    │
    │ • Universities               │
    │ • Requirements               │
    │ • Fees                       │
    │ • Intakes                    │
    └──────────────────────────────┘
               │
               ↓ (Returns)
        ┌──────────────────┐
        │ Recommendations  │
        │ + Scores         │
        │ + Explanations   │
        │ + Risk Flags     │
        └──────────────────┘
               │
               ↓ (Displays)
       ┌─────────────────┐
       │ Frontend UI     │
       │ (Next.js)       │
       └─────────────────┘
```

---

## 🔐 Key Features

### 1. **Intelligent Matching**
- Multi-factor scoring algorithm
- Stream and subject relevance matching
- Academic and English proficiency validation

### 2. **Risk Assessment**
- Academic feasibility analysis
- Visa and acceptance probability prediction
- Budget and cost-of-living evaluation

### 3. **Personalization**
- Preference-based filtering
- Career goal alignment
- Location and budget constraints

### 4. **Lead Generation**
- WhatsApp integration for easy lead capture
- Automated lead tracking
- Contact synchronization

### 5. **Documentation**
- PDF generation of shortlists
- Shareable recommendations
- Course comparison tools

---

## 🚀 Technology Stack

### Backend
- **Framework**: Django 6.0.4
- **API**: Django REST Framework 3.17.1
- **Database**: SQLite (development)
- **CORS**: django-cors-headers
- **Environment**: python-dotenv 1.2.2
- **PDF Generation**: ReportLab 4.4.1
- **Database Driver**: psycopg2-binary (PostgreSQL support)

### Frontend
- **Framework**: Next.js 16.2.4
- **UI Library**: React 19.2.4
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion 12.38.0
- **Components**: Custom React components

### Database
- **Development**: SQLite3
- **Production Ready**: PostgreSQL support (via psycopg2)

---

## 🔌 API Response Format

### Course Recommendation Response
```json
{
  "student_id": 1,
  "confidence": {
    "score": 85.5,
    "level": "High",
    "missing_fields": []
  },
  "recommendations": [
    {
      "course_id": 123,
      "title": "Master of Computer Science",
      "university": "Deakin University",
      "match_score": 118,
      "eligibility_status": "Eligible",
      "score_breakdown": {
        "academic": 25,
        "english": 32,
        "stream_relevance": 20,
        "subject_relevance": 18,
        "budget_alignment": 12,
        "location_preference": 11
      },
      "risk_flags": ["moderate_workload"],
      "explanation": "Strong match for your profile...",
      "top_reasons": [...],
      "improvements": [...]
    }
  ],
  "stats": {
    "total_courses_evaluated": 542,
    "eligible_courses": 127,
    "borderline_courses": 45,
    "top_matches_count": 20
  }
}
```

---

## 📝 Key Database Relationships

```
University (1) ──→ (Many) Course
                          │
                          ├─→ CourseFee (1-1)
                          ├─→ AcademicRequirement (1-1)
                          ├─→ EnglishRequirement (1-1)
                          ├─→ DocumentRequirement (1-1)
                          ├─→ ConsultantRule (1-1)
                          └─→ CourseIntake (1-Many)

University (1) ──→ (Many) GalleryImage

StudentProfile ──→ ShortlistItem ──→ Course

StudentProfile ──→ Recommendations (computed on-demand)

WhatsAppLead (Captures lead data)
```

---

## 🔄 Typical User Journey

```
1. User lands on platform
   ↓
2. Redirected to Shortlist page
   ↓
3. User completes onboarding/profile creation
   ↓
4. System generates recommendations
   ↓
5. User browses recommended courses
   ↓
6. User can:
   ├─ View course details
   ├─ Add to shortlist
   ├─ Compare with other courses
   ├─ Share on WhatsApp
   ├─ Submit lead via WhatsApp form
   └─ Download shortlist as PDF
   ↓
7. Consultant follows up (via WhatsApp leads)
   ↓
8. Student applies to university
```

---

## 🛠️ Development Setup

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8003
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

### Backend runs on: `http://localhost:8003`
### Frontend runs on: `http://localhost:3000`
### CORS is configured to allow frontend requests

---

## 📈 Future Enhancement Opportunities

1. **ML/AI Improvements**
   - Implement deep learning for better matching
   - Use NLP for document analysis (SOP, LOR)
   - Predictive acceptance rate modeling

2. **Features**
   - Multi-language support
   - Real-time chat consultations
   - Video profile submissions
   - Application timeline tracking

3. **Integration**
   - University API integrations
   - Visa requirement APIs
   - Accommodation booking systems
   - Payment gateway integration

4. **Scalability**
   - Migrate to PostgreSQL
   - Implement caching (Redis)
   - API pagination optimization
   - CDN for static assets

---

## 📚 Summary

**Cybrik EduGraph** is a sophisticated, full-stack educational recommendation platform that combines:

- **Intelligent Algorithm**: Multi-factor scoring system for course matching
- **Comprehensive Data**: Extensive university and course information
- **Student-Centric**: Personalized recommendations based on individual profiles
- **User-Friendly**: Intuitive UI with course comparison, shortlisting, and PDF generation
- **Lead Generation**: WhatsApp integration for efficient student acquisition
- **Scalable Architecture**: Clean separation between frontend and backend services

The platform serves as a bridge between aspiring international students and universities, making the course search and application process more data-driven and personalized.
