import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

export type ProvidersSearch = { category?: string; city?: string; sub?: string };

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export const Route = createFileRoute("/providers")({
  validateSearch: (search: Record<string, unknown>): ProvidersSearch => {
    const out: ProvidersSearch = {};
    const category = str(search.category);
    const city = str(search.city);
    const sub = str(search.sub);
    if (category) out.category = category;
    if (city) out.city = city;
    if (sub) out.sub = sub;
    return out;
  },
  component: () => <HomePage view="providers" />,
  head: () => ({
    meta: [
      { title: "مقدمي الخدمات — إزهليها" },
      { name: "description", content: "تصفح كل مقدمي الخدمات في إزهليها وفلتر حسب التصنيف والمدينة والسعر." },
      { property: "og:title", content: "مقدمي الخدمات — إزهليها" },
      { property: "og:description", content: "تصفح كل مقدمي الخدمات وفلتر حسب التصنيف والمدينة والسعر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
