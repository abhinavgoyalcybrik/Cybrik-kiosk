import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);

const COUNTRY_ALIASES: Record<string, readonly string[]> = {
  "United Kingdom": ["United Kingdom", "UK"],
  "United States": ["United States", "USA", "US"],
  "New Zealand": ["New Zealand", "NZ"],
  "United Arab Emirates": ["United Arab Emirates", "UAE"],
};

export type CountryImageMatch = {
  fileName: string;
  serial: number | null;
};

function normalize(value: string) {
  return value.toLocaleLowerCase("en").replace(/[\s_-]+/g, "");
}

function aliasesFor(country: string) {
  return (COUNTRY_ALIASES[country] ?? [country]).map(normalize);
}

export function matchCountryImageNames(country: string, fileNames: readonly string[]): CountryImageMatch[] {
  const aliases = aliasesFor(country);

  return fileNames
    .flatMap((fileName): CountryImageMatch[] => {
      const extension = path.extname(fileName).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(extension)) return [];

      const stem = normalize(path.basename(fileName, extension));
      const alias = aliases.find((candidate) => stem === candidate || stem.startsWith(candidate));
      if (!alias) return [];

      const suffix = stem.slice(alias.length);
      if (suffix === "") return [{ fileName, serial: null }];
      if (!/^\d+$/.test(suffix)) return [];

      return [{ fileName, serial: Number(suffix) }];
    })
    .sort((left, right) => {
      if (left.serial !== null && right.serial !== null) return left.serial - right.serial || left.fileName.localeCompare(right.fileName);
      if (left.serial !== null) return -1;
      if (right.serial !== null) return 1;
      return left.fileName.localeCompare(right.fileName);
    });
}

export function getCountryImagesDirectory() {
  return path.resolve(process.cwd(), "..", "Country images");
}

export async function findCountryImages(country: string): Promise<CountryImageMatch[]> {
  const directory = getCountryImagesDirectory();
  const entries = await readdir(directory, { withFileTypes: true });
  const candidates = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const matches = matchCountryImageNames(country, candidates);
  const nonEmptyMatches: CountryImageMatch[] = [];

  for (const match of matches) {
    const info = await stat(path.join(directory, match.fileName));
    if (info.size > 0) nonEmptyMatches.push(match);
  }

  return nonEmptyMatches;
}
