import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getVideoPoster } from "@/lib/media.functions";
import { SmartImg, proxiedImage, normalizeImageUrl } from "@/components/SmartImg";
import { getYouTubeId, instagramPoster } from "@/components/MediaThumb";

const SOCIAL_RE = /(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|snapchat\.com|twitter\.com|x\.com)/i;
const DIRECT_IMG_RE = /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i;

/** هل الرابط منشور سوشال ميديا (وليس صورة مباشرة)؟ */
export function isSocialMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  return SOCIAL_RE.test(url) && !DIRECT_IMG_RE.test(url);
}

/**
 * صورة تدعم روابط السوشال ميديا: إن كان الرابط منشور إنستغرام/تيك توك/يوتيوب
 * تجلب صورته البدائية وتعرضها، وإلا تعرض الصورة عبر SmartImg.
 */
export function SocialImg({
  src,
  fallback,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { src?: string | null; fallback?: string }) {
  const social = isSocialMediaUrl(src);
  const yt = src ? getYouTubeId(src) : null;
  const local = social
    ? yt
      ? `https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`
      : instagramPoster(src!)
    : null;

  const { data: remote } = useQuery({
    queryKey: ["video-poster", src],
    queryFn: () => getVideoPoster({ data: { url: src! } }),
    enabled: social && !!src && /^https:\/\//i.test(src),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  const [step, setStep] = useState(0);

  if (!social) return <SmartImg src={src} fallback={fallback} {...rest} />;

  const raws = [local, yt ? `https://i.ytimg.com/vi/${yt}/sddefault.jpg` : null, remote?.poster ?? null, yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null].filter(Boolean) as string[];
  const chain = raws.flatMap((u) => [proxiedImage(u), u]);
  if (fallback) chain.push(fallback);
  const current = chain[Math.min(step, chain.length - 1)];

  if (!current) return fallback ? <img src={fallback} {...rest} /> : null;

  return (
    <img
      src={normalizeImageUrl(current)}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => setStep((s) => (s < chain.length - 1 ? s + 1 : s))}
      {...rest}
    />
  );
}
