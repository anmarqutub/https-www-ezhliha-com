import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ALLOWED = [
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "twitter.com",
  "x.com",
  "www.snapchat.com",
  "snapchat.com",
  "vimeo.com",
  "www.vimeo.com",
];

function pickMeta(html: string, keys: string[]) {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    );
    const m = html.match(re) ?? html.match(alt);
    if (m?.[1]) return m[1].replace(/&amp;/g, "&");
  }
  return null;
}

/** يحاول جلب الصورة البدائية (الغلاف) لأي رابط فيديو خارجي */
export const getVideoPoster = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ url: z.string().url() }).parse(data))
  .handler(async ({ data }) => {
    let target: URL;
    try {
      target = new URL(data.url);
    } catch {
      return { poster: null as string | null };
    }
    if (target.protocol !== "https:" || !ALLOWED.includes(target.hostname)) {
      return { poster: null as string | null };
    }

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +https://www.ezhliha.com)",
      "Accept-Language": "ar,en;q=0.8",
    };

    // TikTok / Vimeo لديهما oEmbed عام يعطي thumbnail_url
    try {
      const oembed = target.hostname.includes("tiktok")
        ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(data.url)}`
        : target.hostname.includes("vimeo")
          ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(data.url)}`
          : null;
      if (oembed) {
        const r = await fetch(oembed, { headers });
        if (r.ok) {
          const j = (await r.json()) as { thumbnail_url?: string };
          if (j.thumbnail_url) return { poster: j.thumbnail_url };
        }
      }
    } catch {
      /* نتجاهل ونجرّب og:image */
    }

    try {
      const r = await fetch(data.url, { headers, redirect: "follow" });
      if (!r.ok) return { poster: null as string | null };
      const html = (await r.text()).slice(0, 400_000);
      const poster = pickMeta(html, [
        "og:image:secure_url",
        "og:image",
        "twitter:image",
        "twitter:image:src",
      ]);
      return { poster: poster && poster.startsWith("https://") ? poster : null };
    } catch {
      return { poster: null as string | null };
    }
  });
