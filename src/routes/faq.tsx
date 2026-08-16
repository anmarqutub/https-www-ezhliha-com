import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

export const Route = createFileRoute("/faq")({
  component: () => <HomePage view="faq" />,
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة — إزهليها" },
      { name: "description", content: "إجابات سريعة عن التواصل مع مقدمي الخدمات والأسعار والمفضلة وإضافة مقدم خدمة جديد." },
      { property: "og:title", content: "الأسئلة الشائعة — إزهليها" },
      { property: "og:description", content: "إجابات سريعة قبل ما تبدأ البحث أو ترسل طلبك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
