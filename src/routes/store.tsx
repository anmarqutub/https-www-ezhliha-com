import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/store")({
  beforeLoad: () => {
    throw redirect({ href: "https://store.ezhliha.com", statusCode: 301 });
  },
  head: () => ({
    meta: [
      { title: "متجر إزهليها" },
      { name: "description", content: "متجر إزهليها للاشتراكات." },
      { property: "og:title", content: "متجر إزهليها" },
      { property: "og:description", content: "متجر إزهليها للاشتراكات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
