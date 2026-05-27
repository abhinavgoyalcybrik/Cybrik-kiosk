import {
	CourseCardItem,
	CourseCatalogApiItem,
	CourseCatalogResponse,
	DetailedCourse,
	PlatformStats,
	ShortlistWhatsAppSharePayload,
	StudentProfileLookupResponse,
	StudentRecommendationsResponse,
	WhatsAppLeadCaptureResponse,
	WhatsAppLeadFormContext,
	WhatsAppSharePayload,
} from "./types";
import { resolveUniversityLogoUrl } from "./universityLogo";

const DEFAULT_API_BASE_URL = "/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

function normalizeBaseUrl(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return DEFAULT_API_BASE_URL;
	}

	// Allow values like https://<host>/shortlist while still targeting API on the same host.
	try {
		const parsed = new URL(trimmed);
		return parsed.origin;
	} catch {
		return trimmed.replace(/\/+$/, "");
	}
}

function createApiUrlCandidates(endpoint: string): string[] {
	const baseUrl = normalizeBaseUrl(API_BASE_URL);
	const normalizedEndpoint = endpoint.startsWith("/")
		? endpoint
		: `/${endpoint}`;
	const hasApiSuffixInBase = /\/api$/i.test(baseUrl);

	const candidates: string[] = [];
	if (hasApiSuffixInBase && normalizedEndpoint.startsWith("/api/")) {
		const endpointWithoutApiPrefix = normalizedEndpoint.replace(/^\/api/, "");
		candidates.push(`${baseUrl}${endpointWithoutApiPrefix}`);
	} else {
		candidates.push(`${baseUrl}${normalizedEndpoint}`);
	}

	if (!hasApiSuffixInBase && !normalizedEndpoint.startsWith("/api/")) {
		candidates.push(`${baseUrl}/api${normalizedEndpoint}`);
	}

	return Array.from(new Set(candidates));
}

async function parseJsonErrorDetails(response: Response): Promise<string> {
	try {
		const contentType = response.headers.get("content-type") ?? "";
		if (contentType.includes("application/json")) {
			const payload = (await response.json()) as
				| Record<string, unknown>
				| null;
			if (payload) {
				const detail =
					(typeof payload.error === "string" && payload.error) ||
					(typeof payload.detail === "string" && payload.detail) ||
					"";
				if (detail) {
					return detail;
				}
			}
		}

		const text = (await response.text()).replace(/\s+/g, " ").trim();
		return text.slice(0, 180);
	} catch {
		return "";
	}
}

async function requestJson<T>(
	endpoint: string,
	init: RequestInit = {}
): Promise<T> {
	const urls = createApiUrlCandidates(endpoint);
	const failures: string[] = [];

	for (const url of urls) {
		try {
			const response = await fetch(url, init);
			if (response.ok) {
				return (await response.json()) as T;
			}

			const details = await parseJsonErrorDetails(response);
			failures.push(
				`${url} -> ${response.status} ${response.statusText}${
					details ? ` (${details})` : ""
				}`
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "unknown network error";
			failures.push(`${url} -> ${message}`);
		}
	}

	throw new Error(
		`API request failed for "${endpoint}". Attempts: ${failures.join(" | ")}`
	);
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
	return requestJson<PlatformStats>("/api/stats/", {
		cache: "no-store",
	});
}

export async function fetchStudentRecommendations(
	studentId: number
): Promise<StudentRecommendationsResponse> {
	return requestJson<StudentRecommendationsResponse>(
		`/api/students/${studentId}/recommendations/`,
		{
			cache: "no-store",
		}
	);
}

export async function fetchCoursesCatalog(): Promise<CourseCatalogResponse> {
	return requestJson<CourseCatalogResponse>("/api/courses/", {
		cache: "no-store",
	});
}

export async function fetchCourseDetail(id: number): Promise<DetailedCourse> {
	return requestJson<DetailedCourse>(`/api/courses/${id}/`, {
		cache: "no-store",
	});
}

export async function fetchCourseWhatsAppSharePayload(
	courseId: number,
	options?: {
		studentId?: number;
		leadFormUrl?: string;
	}
): Promise<WhatsAppSharePayload> {
	const params = new URLSearchParams();
	if (options?.studentId !== undefined) {
		params.set("student_id", String(options.studentId));
	}
	if (options?.leadFormUrl) {
		params.set("lead_form_url", options.leadFormUrl);
	}

	const query = params.toString();
	const endpoint = `/api/courses/${courseId}/whatsapp-share/${
		query ? `?${query}` : ""
	}`;

	return requestJson<WhatsAppSharePayload>(endpoint, { cache: "no-store" });
}

export async function submitWhatsAppLead(
	payload: {
		name: string;
		phone: string;
		email?: string;
		student_id?: number;
		course_id?: number;
		source?: string;
		lead_form_url?: string;
		whatsapp_message?: string;
		metadata?: Record<string, unknown>;
	}
): Promise<WhatsAppLeadCaptureResponse> {
	return requestJson<WhatsAppLeadCaptureResponse>("/api/leads/whatsapp/", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
}

export async function createShortlistWhatsAppSharePayload(payload: {
	course_ids: number[];
	student_id?: number;
	lead_form_url?: string;
}): Promise<ShortlistWhatsAppSharePayload> {
	return requestJson<ShortlistWhatsAppSharePayload>(
		"/api/shortlist/whatsapp-share/",
		{
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
		}
	);
}

export async function fetchWhatsAppLeadFormContext(options?: {
	student_id?: number;
	course_id?: number;
}): Promise<WhatsAppLeadFormContext> {
	const params = new URLSearchParams();
	if (options?.student_id !== undefined) {
		params.set("student_id", String(options.student_id));
	}
	if (options?.course_id !== undefined) {
		params.set("course_id", String(options.course_id));
	}

	const query = params.toString();
	return requestJson<WhatsAppLeadFormContext>(
		`/api/leads/whatsapp/form-context/${query ? `?${query}` : ""}`,
		{ cache: "no-store" }
	);
}

export async function fetchStudentProfileLookup(options: {
	student_id?: number;
	phone?: string;
	email?: string;
}): Promise<StudentProfileLookupResponse> {
	const params = new URLSearchParams();
	if (options.student_id !== undefined) {
		params.set("student_id", String(options.student_id));
	}
	if (options.phone) {
		params.set("phone", options.phone);
	}
	if (options.email) {
		params.set("email", options.email);
	}

	const query = params.toString();
	return requestJson<StudentProfileLookupResponse>(
		`/api/students/lookup/${query ? `?${query}` : ""}`,
		{ cache: "no-store" }
	);
}

function formatMoney(
	amount: number | null,
	currency: string,
	feePeriod: string
): string {
	if (amount === null) {
		return "N/A";
	}

	const formattedAmount = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 0,
	}).format(amount);

	const amountLabel = currency
		? `${currency} ${formattedAmount}`
		: formattedAmount;

	return feePeriod ? `${amountLabel} (${feePeriod})` : amountLabel;
}

function formatFlatMoney(amount: number | null, currency: string): string {
	if (amount === null) {
		return "Check portal";
	}

	const formattedAmount = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 0,
	}).format(amount);

	return currency ? `${currency} ${formattedAmount}` : formattedAmount;
}

function formatDuration(durationMonths: number | null): string {
	if (durationMonths === null) {
		return "N/A";
	}

	if (durationMonths % 12 === 0) {
		const years = durationMonths / 12;
		return `${years} year${years === 1 ? "" : "s"}`;
	}

	return `${durationMonths} months`;
}

function formatIeltsScore(ieltsOverall: number | null): string {
	if (ieltsOverall === null) {
		return "N/A";
	}

	return `${ieltsOverall} overall`;
}

function mapCourseToCourseCard(
	item: CourseCatalogApiItem,
	score?: number | null
): CourseCardItem {
	return {
		id: item.course_id,
		title: item.title,
		university: item.university.name,
		logoUrl: resolveUniversityLogoUrl(
			item.university.name,
			item.university.official_website
		),
		location: `${item.university.city}, ${item.university.country}`,
		tuition: formatMoney(
			item.tuition_fee,
			item.tuition_currency,
			item.fee_period
		),
		tuitionFeeValue: item.tuition_fee,
		applicationFee: formatFlatMoney(
			item.application_fee,
			item.application_fee_currency
		),
		applicationFeeValue: item.application_fee,
		duration: formatDuration(item.duration_months),
		intake:
			item.intake_labels.length > 0 ? item.intake_labels.join(", ") : "N/A",
		ielts: formatIeltsScore(item.ielts_overall),
		degreeLevel: item.degree_level,
		score: typeof score === "number" ? Math.round(score) : null,
	};
}

export function mapCatalogCoursesToCourseCards(
	courses: CourseCatalogResponse["courses"]
): CourseCardItem[] {
	return courses.map((item) => mapCourseToCourseCard(item));
}

export function mapRecommendationsToCourseCards(
	recommendations: StudentRecommendationsResponse["recommendations"]
): CourseCardItem[] {
	return recommendations.map((item) => mapCourseToCourseCard(item, item.score));
}
