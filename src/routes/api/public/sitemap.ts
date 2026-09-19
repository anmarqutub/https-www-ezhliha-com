import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://https-www-ezhliha-com.lovable.app";
const STATIC_PATHS = ["/", "/providers", "/categories", "/cities", "/about", "/faq", "/join"];

export const Route = createFileRoute("/api/public/sitemap")({
  server: {
    handlers: {
      GET: async () => {
        let providerIds: string[] = [];
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin.from("providers").select("id").limit(2000);
          providerIds = (data ?? []).map((r: { id: string }) => r.id);
        } catch {
          providerIds = [];
        }

        const urls = [
          ...STATIC_PATHS.map((p) => ({ loc: `${SITE}${p}`, priority: p === "/" ? "1.0" : "0.8" })),
          ...providerIds.map((id) => ({ loc: `${SITE}/p/${id}`, priority: "0.6" })),
        ];

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls
            .map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`)
            .join("\n") +
          `\n</urlset>\n`;

        return new Response(xml, {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
        });
      },
    },
  },
});
