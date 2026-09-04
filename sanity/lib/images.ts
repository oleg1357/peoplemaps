// Build a Sanity CDN image URL from a stored image reference. Avoids pulling in
// @sanity/image-url for the few places that need a simple thumbnail.
export function coverImageUrl(
  image: { asset?: { _ref?: string } } | null | undefined,
  width = 640
): string | null {
  if (!image?.asset?._ref) return null;
  const ref = image.asset._ref; // e.g. "image-abc123-800x600-jpg"
  const match = ref.match(/^image-([A-Za-z0-9]+)-(\d+)x(\d+)-([a-z]+)$/);
  if (!match) return null;
  const [, id, , , ext] = match;
  return `https://cdn.sanity.io/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/${process.env.NEXT_PUBLIC_SANITY_DATASET || "production"}/${id}-${width}x0.${ext}`;
}
