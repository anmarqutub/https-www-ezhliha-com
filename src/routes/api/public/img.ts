import { createFileRoute } from "@tanstack/react-router";

/** وسيط عام للصور الخارجية: يتجاوز حظر الروابط المباشرة (hotlink) */
export const Route = createFileRoute("/api/public/img")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("url");
        if (!raw) return new Response("missing url", { status: 400 });
        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("bad url", { status: 400 });
        }
        if (target.protocol !== "https:") return new Response("https only", { status: 400 });
        const host = target.hostname.toLowerCase();
        // منع الشبكات الداخلية
        if (
          host === "localhost" ||
          host.endsWith(".local") ||
          host.endsWith(".internal") ||
          /^(\d+\.\d+\.\d+\.\d+)$/.test(host) ||
          host.includes(":")
        ) {
          return new Response("host not allowed", { status: 403 });
        }

        let upstream: Response;
        try {
          upstream = await fetch(target.toString(), {
            redirect: "follow",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
              Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
            },
          });
        } catch {
          return new Response("upstream error", { status: 502 });
        }
        if (!upstream.ok || !upstream.body) return new Response("upstream error", { status: 502 });
        const type = upstream.headers.get("content-type") ?? "image/jpeg";
        if (!type.startsWith("image/")) return new Response("not an image", { status: 415 });

        return new Response(upstream.body, {
          headers: {
            "content-type": type,
            "cache-control": "public, max-age=86400, s-maxage=86400",
          },
        });
      },
    },
  },
});
