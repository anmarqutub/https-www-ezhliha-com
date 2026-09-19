import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "./index";

const SITE = "https://https-www-ezhliha-com.lovable.app";
const TITLE = "تصنيفات خدمات المناسبات — إزهليها";
const DESC =
  "تصنيفات خدمات المناسبات في السعودية: قاعات واستراحات، تنسيق حفلات، ضيافة وبوفيهات، تصوير، إطلالة وتجميل، سبا، دعوات إلكترونية وخدمات إضافية.";

const CATEGORY_NAMES = [
  "قاعات و استراحات",
  "تنسيق الحفلات",
  "تفاصيل الضيافة",
  "التصوير",
  "اطلالة المناسبة",
  "السبا",
  "تصميم دعوات زفاف إلكترونية",
  "خدمات اضافية",
];

export const Route = createFileRoute("/categories")({
  component: () => <HomePage view="categories" />,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/categories` },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: `${SITE}/categories` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: TITLE,
          description: DESC,
          url: `${SITE}/categories`,
          hasPart: CATEGORY_NAMES.map((name) => ({ "@type": "CollectionPage", name })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "إزهليها", item: SITE },
            { "@type": "ListItem", position: 2, name: "التصنيفات", item: `${SITE}/categories` },
          ],
        }),
      },
    ],
  }),
});
