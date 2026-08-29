import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getVideoPoster } from "@/lib/media.functions";

export type MediaItem = { url: string; thumbnail_url?: string | null };

export function getYouTubeId(url: string) {
  return url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null;
}

export function instagramPoster(url: string) {
  const code = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1];
  return code ? `https://www.instagram.com/p/${code}/media/?size=l` : null;
}

export function sourceLabel(url: string) {
  if (/instagram\.com/i.test(url)) return "إنستغرام";
  if (/tiktok\.com/i.test(url)) return "تيك توك";
  if (/snapchat\.com/i.test(url)) return "سناب شات";
  if (/(twitter|x)\.com/i.test(url)) return "إكس";
  if (/(youtube\.com|youtu\.be)/i.test(url)) return "يوتيوب";
  return "الرابط الأصلي";
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
}

function isDirectImage(url: string) {
  return /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(url);
}

const PROXY_HOSTS = [
  "tiktokcdn.com",
  "tiktokcdn-eu.com",
  "tiktokcdn-us.com",
  "ibyteimg.com",
  "cdninstagram.com",
  "fbcdn.net",
  "sc-cdn.net",
  "instagram.com",
];

function needsProxy(u: string) {
  try {
    const h = new URL(u).hostname;
    return PROXY_HOSTS.some((s) => h === s || h.endsWith("." + s));
  } catch {
    return false;
  }
}

function proxied(u: string) {
  return `/api/public/img?url=${encodeURIComponent(u)}`;
}


/**
 * بطاقة وسائط موحّدة: تعرض صورة البداية دائمًا (بدون إطار إنستغرام/تيك توك)
 * وعند الضغط تفتح الرابط الأصلي.
 */
export function MediaThumb({
  url,
  thumbnailUrl,
  isVideo,
  ratio = "4/5",
}: {
  url: string;
  thumbnailUrl?: string | null;
  isVideo: boolean;
  ratio?: string;
}) {
  const direct = isDirectVideo(url);
  const yt = getYouTubeId(url);
  const local =
    thumbnailUrl || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : isDirectImage(url) ? url : null);

  const { data: remote } = useQuery({
    queryKey: ["video-poster", url],
    queryFn: () => getVideoPoster({ data: { url } }),
    enabled: !local && !direct && /^https:\/\//i.test(url),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  const raws = [local, remote?.poster ?? null, instagramPoster(url)].filter(Boolean) as string[];
  // بعض المنصات (تيك توك/إنستغرام) تمنع عرض الصورة مباشرة، فنمررها عبر وسيط
  const chain = raws.flatMap((u) => (needsProxy(u) ? [proxied(u), u] : [u, proxied(u)]));
  const [step, setStep] = useState(0);
  const poster = chain[step] ?? null;



  return (
    <figure className="mt-card" style={{ aspectRatio: ratio }}>
      <button
        type="button"
        className="mt-tile"
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        aria-label={isVideo ? "عرض المقطع في المصدر" : "عرض الصورة في المصدر"}
      >
        {poster ? (
          <img
            src={poster}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setStep((s) => s + 1)}
          />
        ) : direct ? (
          <video src={`${url}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" />
        ) : (
          <span className="mt-empty">{sourceLabel(url)}</span>
        )}
        {isVideo && (
          <span className="mt-play" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        )}
      </button>
      <style>{`
        .mt-card { margin:0; width:100%; border-radius:12px; overflow:hidden; border:1px solid #E8E0CE; background:#F6F0E4; }
        .mt-tile { position:relative; display:block; width:100%; height:100%; padding:0; border:0; background:#F1E9DA; cursor:pointer; }
        .mt-tile img, .mt-tile video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .mt-empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#8A7A70; font-size:13px; }
        .mt-play { position:absolute; inset:0; margin:auto; width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.94); color:#660000; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 26px rgba(0,0,0,0.22); }
      `}</style>
    </figure>
  );
}
