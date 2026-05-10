import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "إزهليها — دليلك لأجمل المناسبات" },
      {
        name: "description",
        content:
          "إزهليها — دليلك الأول لتجهيز الأفراح والمناسبات بأفضل مزودي الخدمات في المملكة.",
      },
    ],
  }),
});

function Index() {
  return (
    <iframe
      src="/app.html"
      title="إزهليها"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
      }}
    />
  );
}
