import { KioskLanding } from "@/components/kiosk/KioskLanding";
import { findCountryImages } from "@/lib/country-card-images";

export const dynamic = "force-dynamic";

const COUNTRIES = ["Canada", "United Kingdom", "Australia", "United States", "New Zealand", "Germany", "Cyprus", "France", "United Arab Emirates"] as const;

export default async function KioskPage() {
  const matches = await Promise.all(COUNTRIES.map(async (country) => [country, await findCountryImages(country)] as const));
  const countryImages = Object.fromEntries(
    matches.filter(([, images]) => images.length > 0).map(([country]) => [country, `/country-card-image/${encodeURIComponent(country)}`]),
  );
  const missingCountries = matches.filter(([, images]) => images.length === 0).map(([country]) => country);

  if (missingCountries.length > 0) console.warn(`[country-card-images] No matching image found for: ${missingCountries.join(", ")}`);

  return <KioskLanding countryImages={countryImages} />;
}
