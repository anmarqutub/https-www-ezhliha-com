// ربط تصنيفات الموقع (بالعربي) بروابط ثابتة قابلة للمشاركة مثل /providers?category=halls
export const CATEGORY_SLUG_PATTERNS: Array<{ slug: string; re: RegExp }> = [
  { slug: "halls", re: /قاع|استراح|مكان|فيلا|شاليه/ },
  { slug: "photography", re: /تصوير|فيديو|توثيق|كامي/ },
  { slug: "fashion", re: /فست|أزيا|ازيا|عبا|خياط/ },
  { slug: "beauty", re: /تجميل|مكياج|شعر|عناي|سبا|إطلال|اطلال/ },
  { slug: "flowers", re: /ورد|زهور|تنسيق|ديكور|تصميم/ },
  { slug: "decor", re: /ديكور|تنسيق|ورد|زهور/ },
  { slug: "music", re: /زفا|موسيق|فرق|صوت|إضاء|اضاء/ },
  { slug: "hospitality", re: /ضياف|بوفيه|حلو|طعام|مأكول|قهو|تمور/ },
  { slug: "planners", re: /منسق|تنظيم|حفل|تخطيط/ },
];

/** أفضل رابط ثابت لاسم تصنيف عربي */
export function categorySlug(nameAr: string): string | null {
  const n = nameAr || "";
  for (const { slug, re } of CATEGORY_SLUG_PATTERNS) {
    if (slug === "decor") continue; // decor مرادف لـ flowers عند التوليد
    if (re.test(n)) return slug;
  }
  return null;
}

/** من قيمة الرابط (slug أو id) إلى معرّف التصنيف الحقيقي */
export function resolveCategoryParam<T extends { id: string; name_ar: string }>(
  categories: T[],
  param: string | undefined | null,
): string | null {
  if (!param) return null;
  const direct = categories.find((c) => c.id === param);
  if (direct) return direct.id;
  const entry = CATEGORY_SLUG_PATTERNS.find((p) => p.slug === param);
  if (!entry) return null;
  const match = categories.find((c) => entry.re.test(c.name_ar || ""));
  return match?.id ?? null;
}
