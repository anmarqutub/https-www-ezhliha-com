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
    const browserHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "ar,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
    };

    // صور بديلة عامة (شعار تيك توك مثلاً) نرفضها
    const isPlaceholder = (u: string) =>
      /tiktok-logo|poster-square|default_avatar|obj\/tiktok-web-common/i.test(u);
    const clean = (u: string | null) =>
      u && u.startsWith("https://") && !isPlaceholder(u) ? u : null;

    // TikTok / Vimeo لديهما oEmbed عام يعطي thumbnail_url
    try {
      const oembed = target.hostname.includes("tiktok")
        ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(data.url)}`
        : target.hostname.includes("vimeo")
          ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(data.url)}`
          : null;
      if (oembed) {
        const r = await fetch(oembed, { headers: browserHeaders });
        if (r.ok) {
          const j = (await r.json()) as { thumbnail_url?: string };
          const t = clean(j.thumbnail_url ?? null);
          if (t) return { poster: t };
        }
      }
    } catch {
      /* نتجاهل ونجرّب طرق أخرى */
    }

    // تيك توك: نقرأ صفحة التضمين ونستخرج غلاف الفيديو من بيانات الصفحة
    if (target.hostname.includes("tiktok")) {
      const vid = data.url.match(/\/video\/(\d{6,})/)?.[1];
      const pages = [
        vid ? `https://www.tiktok.com/embed/v2/${vid}` : null,
        data.url,
      ].filter(Boolean) as string[];
      for (const page of pages) {
        try {
          const r = await fetch(page, { headers: browserHeaders, redirect: "follow" });
          if (!r.ok) continue;
          const html = (await r.text()).slice(0, 600_000);
          const candidates = [
            html.match(/"(?:originCover|dynamicCover|cover|thumbnail_url)":"([^"]+)"/)?.[1],
            html.match(/https:\\?\/\\?\/[^"\\]*tiktokcdn[^"\\]*/)?.[0],
            pickMeta(html, ["og:image:secure_url", "og:image", "twitter:image"]),
          ]
            .filter(Boolean)
            .map((u) => (u as string).replace(/\\u002F/g, "/").replace(/\\\//g, "/"));
          for (const c of candidates) {
            const ok = clean(c);
            if (ok) return { poster: ok };
          }
        } catch {
          /* نكمل للمحاولة التالية */
        }
      }
      return { poster: null as string | null };
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
      return { poster: clean(poster) };
    } catch {
      return { poster: null as string | null };
    }
  });
