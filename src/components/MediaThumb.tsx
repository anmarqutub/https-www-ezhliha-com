import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getVideoPoster } from "@/lib/media.functions";
import defaultCover from "@/assets/default-provider.jpg";

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

  const { data: remote, isFetching: isPending } = useQuery({
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
  const loading = !poster && !direct && isPending;

  return (
    <figure className="mt-card" style={{ aspectRatio: ratio }}>
      <button
        type="button"
        className="mt-tile"
        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
        aria-label={isVideo ? `مشاهدة المقطع على ${sourceLabel(url)}` : "عرض الصورة في المصدر"}
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
        ) : loading ? (
          <span className="mt-skel" aria-hidden="true" />
        ) : (
          <span className="mt-cover">
            <img src={defaultCover} alt="" loading="lazy" decoding="async" />
            <em>{isVideo ? `شوفي المقطع على ${sourceLabel(url)}` : `افتحي المصدر على ${sourceLabel(url)}`}</em>
          </span>
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
        .mt-card { margin:0; width:100%; max-width:100%; border-radius:12px; overflow:hidden; border:1px solid #E8E0CE; background:#F6F0E4; }
        .mt-tile { position:relative; display:block; width:100%; height:100%; padding:0; border:0; background:#F1E9DA; cursor:pointer; }
        .mt-tile img, .mt-tile video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .mt-skel { position:absolute; inset:0; background:linear-gradient(100deg,#F1E9DA 30%,#EFE4CF 50%,#F1E9DA 70%); background-size:200% 100%; animation:mt-sh 1.2s linear infinite; }
        @keyframes mt-sh { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
        .mt-cover { position:absolute; inset:0; display:block; }
        .mt-cover img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:.92; }
        .mt-cover em { position:absolute; inset-inline:10px; bottom:10px; font-style:normal; font-size:12px; font-weight:600; color:#fff; background:rgba(100,0,0,.88); border-radius:999px; padding:8px 12px; text-align:center; }
        .mt-fb { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; text-align:center; padding:14px; color:#3a2b25; }
        .mt-fb-ico { width:40px; height:40px; border-radius:50%; background:#fff; color:#640000; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 20px rgba(0,0,0,.12); }
        .mt-fb b { font-size:14px; font-weight:600; }
        .mt-fb small { font-size:12.5px; color:#8A7A70; }
        .mt-fb em { margin-top:4px; font-style:normal; font-size:12.5px; font-weight:600; color:#fff; background:#640000; border-radius:999px; padding:9px 14px; min-height:36px; display:inline-flex; align-items:center; }
        .mt-play { position:absolute; inset:0; margin:auto; width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.94); color:#640000; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 26px rgba(0,0,0,0.22); }
        @media (prefers-reduced-motion:reduce) { .mt-skel { animation:none; } }
      `}</style>
    </figure>
  );
}
