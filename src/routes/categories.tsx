import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

export const Route = createFileRoute("/categories")({
  component: () => <HomePage view="categories" />,
  head: () => ({
    meta: [
      { title: "التصنيفات — إزهليها" },
      { name: "description", content: "تصفحي تصنيفات خدمات المناسبات: الضيافة، القاعات، التصوير، التجميل وغيرها." },
      { property: "og:title", content: "التصنيفات — إزهليها" },
      { property: "og:description", content: "تصفحي تصنيفات خدمات المناسبات في إزهليها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
