const UNIVERSITY_LOGO_OVERRIDES: Record<string, string> = {
	"deakin university":
		"https://upload.wikimedia.org/wikipedia/en/thumb/7/74/Deakin_University_Logo_2017.svg/1280px-Deakin_University_Logo_2017.svg.png",
	"australian catholic university":
		"https://upload.wikimedia.org/wikipedia/en/5/5e/Australian_Catholic_University_Coat_of_Arms.png",
};

function normalizedDomain(website?: string): string | null {
	if (!website?.trim()) {
		return null;
	}

	try {
		const normalizedWebsite = website.startsWith("http") ? website : `https://${website}`;
		const domain = new URL(normalizedWebsite).hostname.replace(/^www\./, "");
		return domain || null;
	} catch {
		return null;
	}
}

export function resolveUniversityLogoUrl(
	universityName: string,
	officialWebsite?: string
): string | null {
	const normalizedName = universityName.trim().toLowerCase();
	const logoOverride = UNIVERSITY_LOGO_OVERRIDES[normalizedName];
	if (logoOverride) {
		return logoOverride;
	}

	const domain = normalizedDomain(officialWebsite);
	if (!domain) {
		return null;
	}

	return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
