import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

export const Route = createFileRoute("/cities")({
  component: () => <HomePage view="cities" />,
  head: () => ({
    meta: [
      { title: "المدن — إزهليها" },
      { name: "description", content: "اختر مدينتك وشاهد مقدمي خدمات المناسبات المتوفرين فيها." },
      { property: "og:title", content: "المدن — إزهليها" },
      { property: "og:description", content: "اختر مدينتك وشاهد مقدمي الخدمات المتوفرين فيها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
