import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export const Route = createFileRoute("/providers")({
  validateSearch: (search: Record<string, unknown>) => ({
    category: str(search.category),
    city: str(search.city),
    sub: str(search.sub),
  }),
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
