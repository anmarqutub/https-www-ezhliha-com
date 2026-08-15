import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

export const Route = createFileRoute("/about")({
  component: () => <HomePage view="about" />,
  head: () => ({
    meta: [
      { title: "من نحن — إزهليها" },
      { name: "description", content: "إزهليها منصتك الأولى لتجهيز مناسباتك: نجمع لك نخبة مزودي الخدمات في مكان واحد." },
      { property: "og:title", content: "من نحن — إزهليها" },
      { property: "og:description", content: "منصتك الأولى لتجهيز مناسباتك بمكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
