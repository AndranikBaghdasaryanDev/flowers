/** Route segments a catalogue slug may never take, to avoid colliding with app routes. */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "account", "cart", "checkout", "login", "logout", "register", "search",
  "shop", "new", "edit", "create", "delete", "categories", "products", "occasions", "orders",
  "track", "about", "contact", "delivery", "legal", "privacy", "terms", "returns", "sitemap",
  "robots", "favicon", "static", "_next", "media", "all",
]);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
