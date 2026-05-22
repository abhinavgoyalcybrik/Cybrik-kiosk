import type { StudentProfile } from "@/hooks/useRecommendations";
import type { CourseCatalogApiItem, CourseCardItem } from "./types";
import { resolveUniversityLogoUrl } from "./universityLogo";

type CourseScore = {
	displayScore: number;
	rankScore: number;
	dataCompleteness: number;
};

const FIELD_KEYWORDS: Record<string, string[]> = {
	Engineering: ["engineering", "software", "mechanical", "electrical"],
	Business: ["business", "management", "administration", "marketing"],
	"Computer Science": [
		"computer science",
		"computing",
		"software",
		"programming",
	],
	"Data Science": ["data science", "analytics", "machine learning", "statistics"],
	"Cyber Security": ["cyber security", "cybersecurity", "security", "forensics"],
	"Health Sciences": ["health", "biomedical", "nursing", "public health"],
	Commerce: ["commerce", "accounting", "economics", "finance"],
	"Arts & Humanities": ["arts", "humanities", "history", "politics", "media"],
	"Animation & Design": ["design", "animation", "creative", "architecture"],
	Hospitality: ["hospitality", "tourism", "hotel", "events"],
};

const STREAM_KEYWORDS: Record<string, string[]> = {
	"super-medical": ["biomedical", "health", "nursing", "science", "medicine"],
	medical: ["biomedical", "health", "nursing", "psychology", "science"],
	"non-medical": [
		"engineering",
		"computer",
		"data",
		"technology",
		"artificial intelligence",
	],
	commerce: ["business", "commerce", "finance", "accounting", "economics"],
	arts: ["arts", "humanities", "media", "design", "communication"],
};

const UNDERGRAD_LEVELS = new Set([
	"bachelor",
	"undergraduate",
	"diploma",
	"certificate",
	"foundation",
]);

const POSTGRAD_LEVELS = new Set([
	"master",
	"graduate certificate",
	"graduate diploma",
	"postgraduate",
	"doctorate",
]);

const COMMON_DEGREE_WORDS = new Set([
	"bachelor",
	"masters",
	"master",
	"degree",
	"science",
	"arts",
	"studies",
	"technology",
	"business",
	"commerce",
	"of",
	"in",
	"and",
]);

const SEASON_KEYWORDS: Record<string, string[]> = {
	"spring (feb – apr)": ["feb", "february", "mar", "march", "apr", "april", "trimester 1"],
	"summer (may – jul)": ["may", "jun", "june", "jul", "july", "trimester 2"],
	"fall (aug – oct)": [
		"aug",
		"august",
		"sep",
		"september",
		"oct",
		"october",
		"trimester 3",
	],
	"winter (nov – jan)": [
		"nov",
		"november",
		"dec",
		"december",
		"jan",
		"january",
	],
};

function normalize(value: string | null | undefined): string {
	return value?.toLowerCase().trim() ?? "";
}

function parseNumeric(value: string): number | null {
	if (!value.trim()) {
		return null;
	}

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(amount: number | null, currency: string, feePeriod: string): string {
	if (amount === null) {
		return "N/A";
	}

	const formattedAmount = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 0,
	}).format(amount);

	const amountLabel = currency ? `${currency} ${formattedAmount}` : formattedAmount;
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

function courseText(course: CourseCatalogApiItem): string {
	return normalize(`${course.title} ${course.field_of_study}`);
}

function courseLocation(course: CourseCatalogApiItem): string {
	return `${course.university.city}, ${course.university.country}`;
}

function countKeywordMatches(text: string, keywords: string[]): number {
	const uniqueKeywords = Array.from(
		new Set(keywords.map((keyword) => normalize(keyword)).filter(Boolean))
	);

	return uniqueKeywords.reduce((count, keyword) => {
		return count + (text.includes(keyword) ? 1 : 0);
	}, 0);
}

function getPreferredFieldKeywords(profile: StudentProfile): string[] {
	return profile.preferredFields.flatMap((field) => FIELD_KEYWORDS[field] ?? [field]);
}

function getDegreePreference(profile: StudentProfile): "undergrad" | "postgrad" | null {
	if (profile.graduationDegree.trim()) {
		return "postgrad";
	}

	if (profile.twelfthBoard.trim() || profile.twelfthStream.trim()) {
		return "undergrad";
	}

	return null;
}

function getGraduationKeywords(profile: StudentProfile): string[] {
	return normalize(profile.graduationDegree)
		.split(/[^a-z0-9]+/)
		.filter((part) => part.length > 2 && !COMMON_DEGREE_WORDS.has(part));
}

function computeUniversityPreferenceBias(
	profile: StudentProfile,
	course: CourseCatalogApiItem
): number {
	const preferredUniversity = normalize(profile.preferredUniversity);
	if (!preferredUniversity) {
		return 0;
	}

	const universityName = normalize(course.university.name);
	if (!universityName) {
		return 0;
	}

	if (universityName === preferredUniversity) {
		return 20;
	}

	if (
		universityName.includes(preferredUniversity) ||
		preferredUniversity.includes(universityName)
	) {
		return 16;
	}

	const preferredTokens = preferredUniversity
		.split(/[^a-z0-9]+/)
		.filter((token) => token.length > 2);

	if (preferredTokens.length === 0) {
		return 0;
	}

	const tokenMatches = preferredTokens.filter((token) =>
		universityName.includes(token)
	).length;

	if (tokenMatches === 0) {
		return 0;
	}

	return Math.min(12, 4 + tokenMatches * 3);
}

function evaluateIntakeMatch(
	profile: StudentProfile,
	course: CourseCatalogApiItem
): { selected: boolean; matched: boolean | null } {
	const season = normalize(profile.preferredIntakeSeason);
	const year = normalize(profile.preferredIntakeYear);

	if (!season && !year) {
		return { selected: false, matched: null };
	}

	if (course.intake_labels.length === 0) {
		return { selected: true, matched: null };
	}

	const keywords = SEASON_KEYWORDS[season] ?? [];
	const labels = course.intake_labels.map((label) => normalize(label));

	const matched = labels.some((label) => {
		const seasonMatches = keywords.length === 0 || keywords.some((keyword) => label.includes(keyword));
		const yearMatches = !year || label.includes(year);
		return seasonMatches && yearMatches;
	});

	return { selected: true, matched };
}

function hasMeaningfulBudgetPreference(profile: StudentProfile): boolean {
	return profile.budgetMinLakhs !== "0" || profile.budgetMaxLakhs !== "80";
}

function computeBudgetBias(profile: StudentProfile, course: CourseCatalogApiItem): number {
	if (!hasMeaningfulBudgetPreference(profile) || course.tuition_fee === null) {
		return 0;
	}

	const maxBudget = parseNumeric(profile.budgetMaxLakhs);
	if (maxBudget === null) {
		return 0;
	}

	const strictness = Math.max(0, Math.min(1, (80 - maxBudget) / 80));
	if (strictness === 0) {
		return 0;
	}

	const normalizedTuition = Math.max(0, Math.min(1, course.tuition_fee / 50000));
	return Math.round(((1 - normalizedTuition) * 12 - normalizedTuition * 3) * strictness);
}

function computeDataCompleteness(course: CourseCatalogApiItem): number {
	let completeness = 0;

	if (course.tuition_fee !== null) {
		completeness += 1.5;
	}

	if (course.duration_months !== null) {
		completeness += 1;
	}

	if (course.intake_labels.length > 0) {
		completeness += 1.5;
	}

	if (course.ielts_overall !== null) {
		completeness += 1;
	}

	if (course.field_of_study.trim()) {
		completeness += 1;
	}

	return completeness;
}

function mapCourseToCard(
	course: CourseCatalogApiItem,
	score: number | null
): CourseCardItem {
	return {
		id: course.course_id,
		title: course.title,
		university: course.university.name,
		logoUrl: resolveUniversityLogoUrl(
			course.university.name,
			course.university.official_website
		),
			location: courseLocation(course),
			tuition: formatMoney(course.tuition_fee, course.tuition_currency, course.fee_period),
			tuitionFeeValue: course.tuition_fee,
			applicationFee: formatFlatMoney(
				course.application_fee,
				course.application_fee_currency
			),
			applicationFeeValue: course.application_fee,
			duration: formatDuration(course.duration_months),
			intake: course.intake_labels.length > 0 ? course.intake_labels.join(", ") : "N/A",
		ielts: formatIeltsScore(course.ielts_overall),
		degreeLevel: course.degree_level,
		score: typeof score === "number" ? Math.round(score) : null,
	};
}

function scoreCourse(profile: StudentProfile, course: CourseCatalogApiItem): CourseScore | null {
	const courseDescription = courseText(course);
	const preferredCountries = profile.preferredCountries.map((value) => normalize(value));
	const preferredCities = profile.preferredCities.map((value) => normalize(value));
	const country = normalize(course.university.country);
	const city = normalize(course.university.city);

	if (
		preferredCountries.length > 0 &&
		!preferredCountries.some((preferredCountry) => country.includes(preferredCountry))
	) {
		return null;
	}

	if (preferredCities.length > 0 && !preferredCities.some((preferredCity) => city.includes(preferredCity))) {
		return null;
	}

	const ieltsOverall = parseNumeric(profile.ieltsOverall);
	if (
		ieltsOverall !== null &&
		course.ielts_overall !== null &&
		ieltsOverall + 0.001 < course.ielts_overall
	) {
		return null;
	}

	const intakeMatch = evaluateIntakeMatch(profile, course);
	if (intakeMatch.selected && intakeMatch.matched === false) {
		return null;
	}

	let displayScore = 50;
	let rankScore = 50;
	const preferredFieldKeywords = getPreferredFieldKeywords(profile);

	if (preferredFieldKeywords.length > 0) {
		const fieldKeywordMatches = countKeywordMatches(courseDescription, preferredFieldKeywords);
		const directFieldMatches = countKeywordMatches(
			normalize(course.field_of_study),
			profile.preferredFields
		);

		if (fieldKeywordMatches > 0 || directFieldMatches > 0) {
			displayScore += 14 + Math.min(16, fieldKeywordMatches * 3 + directFieldMatches * 4);
			rankScore += 14 + Math.min(18, fieldKeywordMatches * 2.5 + directFieldMatches * 4.5);
		} else {
			displayScore -= 16;
			rankScore -= 16;
		}
	}

	const streamKeywords = STREAM_KEYWORDS[normalize(profile.twelfthStream)] ?? [];
	if (streamKeywords.length > 0) {
		const streamMatches = countKeywordMatches(courseDescription, streamKeywords);

		if (streamMatches > 0) {
			displayScore += 8 + Math.min(10, streamMatches * 2);
			rankScore += 8 + Math.min(12, streamMatches * 2.25);
		} else {
			displayScore -= 6;
			rankScore -= 6;
		}
	}

	const degreePreference = getDegreePreference(profile);
	const normalizedDegreeLevel = normalize(course.degree_level);
	if (degreePreference === "undergrad") {
		if (UNDERGRAD_LEVELS.has(normalizedDegreeLevel)) {
			displayScore += 14;
			rankScore += 14;
		} else if (POSTGRAD_LEVELS.has(normalizedDegreeLevel)) {
			displayScore -= 12;
			rankScore -= 12;
		}
	} else if (degreePreference === "postgrad") {
		if (POSTGRAD_LEVELS.has(normalizedDegreeLevel)) {
			displayScore += 14;
			rankScore += 14;
		} else if (UNDERGRAD_LEVELS.has(normalizedDegreeLevel)) {
			displayScore -= 12;
			rankScore -= 12;
		}
	}

	const graduationKeywords = getGraduationKeywords(profile);
	if (graduationKeywords.length > 0) {
		const graduationMatches = countKeywordMatches(courseDescription, graduationKeywords);

		if (graduationMatches > 0) {
			displayScore += Math.min(10, 4 + graduationMatches * 2);
			rankScore += Math.min(12, 4 + graduationMatches * 2.5);
		}
	}

	if (preferredCountries.length > 0) {
		displayScore += 10;
		rankScore += 10;
	}

	if (preferredCities.length > 0) {
		displayScore += 8;
		rankScore += 8;
	}

	const universityPreferenceBias = computeUniversityPreferenceBias(profile, course);
	displayScore += universityPreferenceBias;
	rankScore += universityPreferenceBias;

	if (intakeMatch.selected) {
		if (intakeMatch.matched === true) {
			displayScore += 12;
			rankScore += 12;
		} else if (intakeMatch.matched === null) {
			displayScore -= 4;
			rankScore -= 4;
		}
	}

	if (ieltsOverall !== null) {
		if (course.ielts_overall === null) {
			displayScore += 2;
			rankScore += 2;
		} else {
			const scoreBuffer = Math.max(0, ieltsOverall - course.ielts_overall);
			const displayBuffer = Math.min(6, Math.round(scoreBuffer * 3));
			const rankBuffer = Math.min(6.5, scoreBuffer * 3.25);

			displayScore += 8 + displayBuffer;
			rankScore += 8 + rankBuffer;
		}
	}

	if (profile.hasWorkExperience === "Yes" && POSTGRAD_LEVELS.has(normalizedDegreeLevel)) {
		displayScore += 4;
		rankScore += 4;
	}

	const budgetBias = computeBudgetBias(profile, course);
	const dataCompleteness = computeDataCompleteness(course);

	displayScore += budgetBias;
	rankScore += budgetBias;
	rankScore += dataCompleteness;

	return {
		displayScore: Math.max(0, Math.min(100, displayScore)),
		rankScore,
		dataCompleteness,
	};
}

export function hasLiveRankingSignals(profile: StudentProfile): boolean {
	return Boolean(
		profile.preferredCountries.length > 0 ||
			profile.preferredCities.length > 0 ||
			profile.preferredFields.length > 0 ||
			profile.preferredUniversity.trim() ||
			profile.preferredIntakeSeason.trim() ||
			profile.preferredIntakeYear.trim() ||
			profile.twelfthStream.trim() ||
			profile.graduationDegree.trim() ||
			profile.ieltsOverall.trim() ||
			profile.hasWorkExperience === "Yes" ||
			hasMeaningfulBudgetPreference(profile)
	);
}

export function buildProfileSignalChips(profile: StudentProfile): string[] {
	const chips: string[] = [];

	if (profile.preferredCountries.length > 0) {
		chips.push(...profile.preferredCountries.map((country) => `Country: ${country}`));
	}

	if (profile.preferredFields.length > 0) {
		chips.push(...profile.preferredFields.map((field) => `Field: ${field}`));
	}

	if (profile.preferredUniversity.trim()) {
		chips.push(`University: ${profile.preferredUniversity.trim()}`);
	}

	if (profile.twelfthStream.trim()) {
		chips.push(`Stream: ${profile.twelfthStream}`);
	}

	if (profile.preferredIntakeSeason.trim() || profile.preferredIntakeYear.trim()) {
		chips.push(
			`Intake: ${[profile.preferredIntakeSeason, profile.preferredIntakeYear]
				.filter(Boolean)
				.join(" ")}`
		);
	}

	if (profile.ieltsOverall.trim()) {
		chips.push(`IELTS: ${profile.ieltsOverall}`);
	}

	return chips.slice(0, 8);
}

export function buildShortlistCards(
	courses: CourseCatalogApiItem[],
	profile: StudentProfile,
	searchQuery: string
): {
	courses: CourseCardItem[];
	isRanked: boolean;
	totalMatches: number;
} {
	const ranked = hasLiveRankingSignals(profile);
	const normalizedQuery = normalize(searchQuery);

	const processed = courses
		.map((course) => {
			const score = ranked ? scoreCourse(profile, course) : null;
			if (ranked && score === null) {
				return null;
			}

			const location = courseLocation(course);
			const haystack = normalize(`${course.title} ${course.university.name} ${location}`);
			if (normalizedQuery && !haystack.includes(normalizedQuery)) {
				return null;
			}

			return {
				card: mapCourseToCard(course, score?.displayScore ?? null),
				displayScore: score?.displayScore ?? 0,
				sortScore: score?.rankScore ?? 0,
				dataCompleteness: score?.dataCompleteness ?? computeDataCompleteness(course),
			};
		})
		.filter(
			(
				item
			): item is {
				card: CourseCardItem;
				displayScore: number;
				sortScore: number;
				dataCompleteness: number;
			} => item !== null
		);

	processed.sort((left, right) => {
		if (right.displayScore !== left.displayScore) {
			return right.displayScore - left.displayScore;
		}

		if (right.sortScore !== left.sortScore) {
			return right.sortScore - left.sortScore;
		}

		if (right.dataCompleteness !== left.dataCompleteness) {
			return right.dataCompleteness - left.dataCompleteness;
		}

		if (left.card.university !== right.card.university) {
			return left.card.university.localeCompare(right.card.university);
		}

		return left.card.title.localeCompare(right.card.title);
	});

	return {
		courses: processed.map((item) => item.card),
		isRanked: ranked,
		totalMatches: processed.length,
	};
}
