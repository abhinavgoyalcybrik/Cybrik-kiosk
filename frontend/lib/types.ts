export type PlatformStats = {
	universities: number;
	courses: number;
	countries: number;
	students: number;
};

export type RecommendationApiItem = {
	course_id: number;
	title: string;
	university: {
		name: string;
		official_website?: string;
		country: string;
		city: string;
	};
	degree_level: string;
	field_of_study: string;
	duration_months: number | null;
	tuition_fee: number | null;
	tuition_currency: string;
	fee_period: string;
	application_fee: number | null;
	application_fee_currency: string;
	intake_labels: string[];
	ielts_overall: number | null;
	status: string;
	score: number;
	raw_score: number;
	max_raw_score: number;
};

export type CourseCatalogApiItem = {
	course_id: number;
	title: string;
	university: {
		name: string;
		official_website?: string;
		country: string;
		city: string;
	};
	degree_level: string;
	field_of_study: string;
	duration_months: number | null;
	tuition_fee: number | null;
	tuition_currency: string;
	fee_period: string;
	application_fee: number | null;
	application_fee_currency: string;
	intake_labels: string[];
	ielts_overall: number | null;
};

export type CourseCatalogResponse = {
	count: number;
	courses: CourseCatalogApiItem[];
};

export type WhatsAppSharePayload = {
	course_id: number;
	student_id: number | null;
	lead_form_url: string;
	message: string;
	whatsapp_url: string;
	whatsapp_web_url: string;
};

export type WhatsAppLeadCaptureResponse = {
	lead_id: number;
	student_profile_id: number;
	created_student_profile: boolean;
	crm_status: "pending" | "sent" | "failed";
	crm_response: string;
	shortlisted_courses_count: number;
	shortlisted_courses: CourseCatalogApiItem[];
};

export type ShortlistWhatsAppSharePayload = {
	count: number;
	course_ids: number[];
	pdf_download_url: string;
	lead_form_url: string;
	message: string;
	whatsapp_url: string;
	whatsapp_web_url: string;
};

export type WhatsAppLeadFormContext = {
	student: {
		id: number | null;
		name: string;
		phone: string;
		email: string;
	};
	course: {
		id: number;
		title: string;
		university_name: string;
		course_url: string;
	} | null;
};

export type StudentProfileLookupResponse = {
	found: boolean;
	message?: string;
	student?: {
		id: number;
		name: string;
		email: string;
		phone: string;
		preferred_countries: string[];
		preferred_cities: string[];
		preferred_intake: string;
		highest_qualification: string;
		academic_stream: string;
		academic_major: string;
		percentage: number | null;
		ielts_overall: number | null;
		created_at: string;
		updated_at: string;
	};
	shortlisted_courses_count?: number;
	shortlisted_courses?: CourseCatalogApiItem[];
};

export type StudentRecommendationsResponse = {
	student: {
		id: number;
		name: string;
		highest_qualification: string;
		academic_stream: string;
		percentage: number;
		ielts_overall: number;
	};
	recommendation_confidence: number;
	recommendations: RecommendationApiItem[];
};

export type CourseCardItem = {
	id: number;
	title: string;
	university: string;
	logoUrl?: string | null;
	location: string;
	tuition: string;
	tuitionFeeValue: number | null;
	applicationFee: string;
	applicationFeeValue: number | null;
	duration: string;
	intake: string;
	ielts: string;
	degreeLevel: string;
	score?: number | null;
};

export type DetailedCourse = {
	course_id: number;
	title: string;
	university: {
		name: string;
		official_website: string;
		country: string;
		state_province: string;
		city: string;
		campus_locations: string;
		institution_type: string;
		ownership_type: string;
		qs_ranking: string;
		national_ranking: string;
		ranking_notes: string;
		application_fee: number | null;
		application_fee_currency: string;
		scholarship_available: boolean;
		accommodation_available: boolean;
		estimated_monthly_living_cost: number | null;
		living_cost_currency: string;
	};
	degree_level: string;
	field_of_study: string;
	specialization: string;
	department: string;
	faculty: string;
	duration_months: number | null;
	mode: string;
	campus: string;
	course_url: string;
	course_summary: string;
	modules: string;
	credits: string;
	thesis_option: boolean;
	project_option: boolean;
	internship_available: boolean;
	career_outcomes: string;
	relevant_industries: string;
	application_difficulty: string;
	tuition_fee: number | null;
	tuition_currency: string;
	fee_period: string;
	intake_labels: string[];
	ielts_overall: number | null;
	admissions_notes: string;
	gallery_images: string[];
};
