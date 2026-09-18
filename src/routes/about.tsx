import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

export const Route = createFileRoute("/about")({
  component: () => <HomePage view="about" />,
  head: () => ({
    meta: [
      { title: "من نحن — إزهليها" },
      { name: "description", content: "أزهليها تجمع لك مزودي خدمات المناسبات في مكان واحد، عشان تختصرين وقت البحث." },
      { property: "og:title", content: "من نحن — إزهليها" },
      { property: "og:description", content: "مزوّدو خدمات المناسبات في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
