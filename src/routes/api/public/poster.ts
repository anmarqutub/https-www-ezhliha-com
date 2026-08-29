import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_SUFFIX = [
  "tiktokcdn.com",
  "tiktokcdn-eu.com",
  "tiktokcdn-us.com",
  "ibyteimg.com",
  "ytimg.com",
  "cdninstagram.com",
  "fbcdn.net",
  "vimeocdn.com",
  "twimg.com",
  "sc-cdn.net",
  "snapchat.com",
  "instagram.com",
];

export const Route = createFileRoute("/api/public/poster")({
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
        if (
          target.protocol !== "https:" ||
          !ALLOWED_SUFFIX.some((s) => target.hostname === s || target.hostname.endsWith("." + s))
        ) {
          return new Response("host not allowed", { status: 403 });
        }

        const upstream = await fetch(target.toString(), {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
            Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          },
        });
        if (!upstream.ok || !upstream.body) {
          return new Response("upstream error", { status: 502 });
        }
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
