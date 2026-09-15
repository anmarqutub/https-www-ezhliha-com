import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

export const Route = createFileRoute("/faq")({
  component: () => <HomePage view="faq" />,
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة — إزهليها" },
      { name: "description", content: "إجابات واضحة عن البحث والأسعار والمفضلة والتواصل مع مقدّم الخدمة." },
      { property: "og:title", content: "الأسئلة الشائعة — إزهليها" },
      { property: "og:description", content: "إجابات واضحة قبل أن تبدئي البحث أو ترسلي طلبكِ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
