import { readFile } from "node:fs/promises";
import path from "node:path";
import { findCountryImages, getCountryImagesDirectory } from "@/lib/country-card-images";

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request: Request, context: RouteContext<"/country-card-image/[country]">) {
  const { country } = await context.params;
  const matches = await findCountryImages(decodeURIComponent(country));
  const selected = matches[0];

  if (!selected) return new Response("Country image not found", { status: 404 });

  const extension = path.extname(selected.fileName).toLowerCase();
  const image = await readFile(path.join(getCountryImagesDirectory(), selected.fileName));

  return new Response(image, {
    headers: {
      "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    },
  });
}
