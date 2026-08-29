import { useEffect, useState } from "react";

/** تحويل روابط المشاركة الشائعة إلى روابط صورة مباشرة */
export function normalizeImageUrl(url: string): string {
  if (!url) return url;
  let u = url.trim();
  if (u.startsWith("http://")) u = "https://" + u.slice(7);

  // Google Drive
  const drive =
    u.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/)?.[1] ??
    u.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([A-Za-z0-9_-]+)/)?.[1];
  if (drive) return `https://drive.google.com/thumbnail?id=${drive}&sz=w1600`;

  // Dropbox
  if (/dropbox\.com/i.test(u)) {
    return u.replace(/[?&]dl=0/, "").replace(/^https:\/\/www\.dropbox\.com/, "https://dl.dropboxusercontent.com");
  }

  // Google Photos / imgur page links
  if (/^https:\/\/imgur\.com\/(?!a\/)([A-Za-z0-9]+)$/.test(u)) {
    return u.replace("imgur.com/", "i.imgur.com/") + ".jpg";
  }

  return u;
}

export function proxiedImage(url: string) {
  return `/api/public/img?url=${encodeURIComponent(url)}`;
}

/**
 * صورة ذكية: تجرّب الرابط المباشر، وإذا فشل (حظر الرابط) تمرّه عبر وسيط،
 * وإذا فشل أيضاً تعرض الصورة الافتراضية.
 */
export function SmartImg({
  src,
  fallback,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement> & { src?: string | null; fallback?: string }) {
  const base = src ? normalizeImageUrl(src) : "";
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [base]);

  if (!base) return fallback ? <img src={fallback} {...rest} /> : null;

  const chain = [base, /^https:\/\//i.test(base) ? proxiedImage(base) : null, fallback ?? null].filter(
    Boolean,
  ) as string[];
  const current = chain[Math.min(step, chain.length - 1)];

  return (
    <img
      src={current}
      referrerPolicy="no-referrer"
      onError={() => setStep((s) => (s < chain.length - 1 ? s + 1 : s))}
      {...rest}
    />
  );
}
