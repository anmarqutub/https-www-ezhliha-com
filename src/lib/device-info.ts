// Friendly device/OS parsing from User-Agent + IP geo lookup (client-side).

export function parseDevice(ua: string | null | undefined): string {
  if (!ua) return "—";
  const s = ua;

  // iOS device family
  if (/iPhone/i.test(s)) {
    const m = s.match(/iPhone\s*OS\s*([0-9_]+)/i) || s.match(/CPU\s*iPhone\s*OS\s*([0-9_]+)/i);
    const ver = m ? m[1].replace(/_/g, ".") : "";
    return ver ? `iPhone (iOS ${ver})` : "iPhone";
  }
  if (/iPad/i.test(s)) {
    const m = s.match(/OS\s*([0-9_]+)/i);
    const ver = m ? m[1].replace(/_/g, ".") : "";
    return ver ? `iPad (iPadOS ${ver})` : "iPad";
  }
  if (/iPod/i.test(s)) return "iPod";

  // Android
  if (/Android/i.test(s)) {
    const verM = s.match(/Android\s+([0-9.]+)/i);
    const modelM =
      s.match(/;\s*([^;)]*?(?:SM-|Pixel|Mi |Redmi|HUAWEI|Honor|OPPO|vivo|OnePlus|Realme|Nokia|LG-|HTC|Sony|Lenovo|Infinix|Tecno|Motorola)[^;)]*)\s*(?:Build|\))/i);
    const model = modelM ? modelM[1].trim() : "Android";
    const ver = verM ? verM[1] : "";
    return ver ? `${model} (Android ${ver})` : model;
  }

  // Desktop OS
  if (/Windows NT 10/i.test(s)) return "Windows 10/11";
  if (/Windows NT 6\.3/i.test(s)) return "Windows 8.1";
  if (/Windows NT 6\.1/i.test(s)) return "Windows 7";
  if (/Windows/i.test(s)) return "Windows";
  if (/Mac OS X\s+([0-9_\.]+)/i.test(s)) {
    const m = s.match(/Mac OS X\s+([0-9_\.]+)/i)!;
    return `Mac (${m[1].replace(/_/g, ".")})`;
  }
  if (/Macintosh/i.test(s)) return "Mac";
  if (/CrOS/i.test(s)) return "ChromeBook";
  if (/Linux/i.test(s)) return "Linux";

  return "جهاز غير معروف";
}

export function parseBrowser(ua: string | null | undefined): string {
  if (!ua) return "—";
  const s = ua;
  // Order matters
  if (/Edg\/([\d.]+)/.test(s)) return `Edge ${s.match(/Edg\/([\d.]+)/)![1]}`;
  if (/OPR\/([\d.]+)/.test(s)) return `Opera ${s.match(/OPR\/([\d.]+)/)![1]}`;
  if (/SamsungBrowser\/([\d.]+)/.test(s)) return `Samsung Internet ${s.match(/SamsungBrowser\/([\d.]+)/)![1]}`;
  if (/FxiOS\/([\d.]+)/.test(s)) return `Firefox iOS ${s.match(/FxiOS\/([\d.]+)/)![1]}`;
  if (/CriOS\/([\d.]+)/.test(s)) return `Chrome iOS ${s.match(/CriOS\/([\d.]+)/)![1]}`;
  if (/Firefox\/([\d.]+)/.test(s)) return `Firefox ${s.match(/Firefox\/([\d.]+)/)![1]}`;
  if (/Chrome\/([\d.]+)/.test(s)) return `Chrome ${s.match(/Chrome\/([\d.]+)/)![1]}`;
  if (/Version\/([\d.]+).*Safari/.test(s)) return `Safari ${s.match(/Version\/([\d.]+)/)![1]}`;
  if (/Safari/.test(s)) return "Safari";
  return "متصفح آخر";
}

// IP geo lookup via ipwho.is (free, CORS-enabled, no API key).
export type GeoInfo = {
  city?: string;
  region?: string;
  country?: string;
  countryAr?: string;
  flag?: string;
  isp?: string;
};

const geoCache = new Map<string, GeoInfo | null>();
const inflight = new Map<string, Promise<GeoInfo | null>>();

const COUNTRY_AR: Record<string, string> = {
  SA: "السعودية", AE: "الإمارات", KW: "الكويت", QA: "قطر", BH: "البحرين",
  OM: "عُمان", YE: "اليمن", JO: "الأردن", LB: "لبنان", SY: "سوريا",
  IQ: "العراق", PS: "فلسطين", EG: "مصر", SD: "السودان", LY: "ليبيا",
  TN: "تونس", DZ: "الجزائر", MA: "المغرب", US: "الولايات المتحدة",
  GB: "المملكة المتحدة", DE: "ألمانيا", FR: "فرنسا", TR: "تركيا",
  IN: "الهند", PK: "باكستان", BD: "بنغلاديش", ID: "إندونيسيا",
  PH: "الفلبين", NL: "هولندا", CA: "كندا",
};

export function lookupIp(ip: string | null | undefined): Promise<GeoInfo | null> {
  if (!ip) return Promise.resolve(null);
  if (geoCache.has(ip)) return Promise.resolve(geoCache.get(ip)!);
  if (inflight.has(ip)) return inflight.get(ip)!;
  const p = (async () => {
    try {
      const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region,country,country_code,flag,connection`);
      const j: any = await r.json();
      if (!j || j.success === false) { geoCache.set(ip, null); return null; }
      const cc: string = j.country_code || "";
      const info: GeoInfo = {
        city: j.city || undefined,
        region: j.region || undefined,
        country: j.country || undefined,
        countryAr: COUNTRY_AR[cc] || j.country || undefined,
        flag: j.flag?.emoji || undefined,
        isp: j.connection?.isp || undefined,
      };
      geoCache.set(ip, info);
      return info;
    } catch {
      geoCache.set(ip, null);
      return null;
    } finally {
      inflight.delete(ip);
    }
  })();
  inflight.set(ip, p);
  return p;
}

export function formatGeo(g: GeoInfo | null | undefined): string {
  if (!g) return "—";
  const parts = [g.city, g.region && g.region !== g.city ? g.region : null, g.countryAr || g.country].filter(Boolean);
  const loc = parts.join("، ");
  return `${g.flag ? g.flag + " " : ""}${loc || "—"}`;
}
