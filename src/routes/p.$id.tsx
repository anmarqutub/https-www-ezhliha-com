import { createFileRoute, Link } from "@tanstack/react-router";
import { getPublicProvider } from "@/lib/public-provider.functions";
import logoUrl from "@/assets/logo.jpg";

const SITE = "https://https-www-ezhliha-com.lovable.app";

export const Route = createFileRoute("/p/$id")({
  loader: async ({ params }) => {
    try {
      return await getPublicProvider({ data: { id: params.id } });
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE}/p/${params.id}`;
    if (!loaderData) {
      return {
        meta: [
          { title: "الصفحة غير متوفرة — إزهليها" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const p = loaderData;
    const place = [p.subName, p.cityName].filter(Boolean).join(" · ");
    const title = `${p.name}${place ? ` — ${place}` : ""} | إزهليها`;
    const desc =
      (p.description && p.description.trim().slice(0, 155)) ||
      `${p.name} من مقدمات خدمات المناسبات${p.cityName ? ` في ${p.cityName}` : ""} على منصة إزهليها.`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "إزهليها" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (p.coverUrl) {
      meta.push({ property: "og:image", content: p.coverUrl });
      meta.push({ name: "twitter:image", content: p.coverUrl });
      meta.push({ name: "twitter:card", content: "summary_large_image" });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: p.name,
            description: desc,
            url,
            image: p.coverUrl ?? undefined,
            address: p.cityName ? { "@type": "PostalAddress", addressLocality: p.cityName, addressCountry: "SA" } : undefined,
            aggregateRating:
              p.rating && p.reviewsCount > 0
                ? { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviewsCount }
                : undefined,
          }),
        },
      ],
    };
  },
  component: PublicProviderPage,
  errorComponent: () => <Shell><p className="pp-msg">صار خطأ بسيط، جرّبي تحديث الصفحة.</p></Shell>,
  notFoundComponent: () => <Shell><p className="pp-msg">ما لقينا هذي المقدمة.</p></Shell>,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="pp-root">
      <style>{css}</style>
      <div className="pp-card">
        <img src={logoUrl} alt="إزهليها" className="pp-logo" />
        {children}
        <Link to="/" className="pp-btn pp-btn-ghost">الصفحة الرئيسية</Link>
      </div>
    </div>
  );
}

function PublicProviderPage() {
  const p = Route.useLoaderData();
  const { id } = Route.useParams();
  if (!p) return <Shell><p className="pp-msg">ما لقينا هذي المقدمة.</p></Shell>;

  const place = [p.subName, p.cityName].filter(Boolean).join(" · ");
  const shareUrl = `${SITE}/p/${id}`;
  const waShare = `https://wa.me/?text=${encodeURIComponent(`${p.name}${place ? ` — ${place}` : ""}\n${shareUrl}`)}`;

  return (
    <div dir="rtl" className="pp-root">
      <style>{css}</style>
      <div className="pp-card">
        <img src={logoUrl} alt="إزهليها" className="pp-logo" />
        {p.coverUrl && <img src={p.coverUrl} alt={p.name} className="pp-cover" loading="eager" />}
        <h1 className="pp-name">{p.name}</h1>
        {place && <p className="pp-place">{place}</p>}
        {p.rating && p.reviewsCount > 0 && (
          <p className="pp-rate">
            {p.rating.toFixed(1)} من 5 · {p.reviewsCount} تقييم
          </p>
        )}
        {p.description && <p className="pp-desc">{p.description}</p>}
        <Link to="/provider/$id" params={{ id }} className="pp-btn">شوفي الملف كامل</Link>
        <a className="pp-btn pp-btn-ghost" href={waShare} target="_blank" rel="noopener noreferrer">
          شاركيها بالواتساب
        </a>
        <p className="pp-note">الأسعار والباقات وبيانات التواصل داخل الملف الكامل لعضوات إزهليها.</p>
      </div>
    </div>
  );
}

const css = `
  .pp-root { min-height:100vh; background:#e6e4d7; display:flex; align-items:center; justify-content:center; padding:20px;
    font-family:"Thmanyah Serif Display","Noto Sans Arabic",Tajawal,system-ui,sans-serif; color:#2A211C; }
  .pp-card { background:#fff; border-radius:18px; padding:20px 18px 22px; max-width:440px; width:100%; text-align:center;
    box-shadow:0 8px 30px rgba(100,0,0,.10); display:flex; flex-direction:column; gap:9px; }
  .pp-logo { height:58px; object-fit:contain; margin:0 auto 2px; }
  .pp-cover { width:100%; aspect-ratio:16/10; object-fit:cover; border-radius:12px; }
  .pp-name { color:#640000; font-size:20px; margin:4px 0 0; }
  .pp-place { color:#6E6259; font-size:12.5px; margin:0; }
  .pp-rate { color:#8a6a2f; font-size:12.5px; margin:0; }
  .pp-desc { color:#4a423c; font-size:13px; line-height:1.85; margin:2px 0 4px; }
  .pp-msg { color:#4a423c; font-size:14px; margin:8px 0; }
  .pp-btn { background:#640000; color:#fff; text-decoration:none; padding:11px 18px; border-radius:50px; font-weight:700; font-size:13.5px; }
  .pp-btn-ghost { background:#fff; color:#640000; border:1.5px solid #640000; }
  .pp-note { color:#8a8078; font-size:11.5px; margin:4px 0 0; line-height:1.7; }
`;
