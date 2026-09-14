import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Camera,
  Cake,
  Flower2,
  Gem,
  Heart,
  MapPin,
  Music4,
  Shirt,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

type Cat = { id: string; name_ar: string };
type Banner = { id: string; title: string | null; image_url: string; link_url: string | null };

function catIcon(name: string) {
  const n = name || "";
  if (/قاع|استراح|مكان|فيلا|شاليه/.test(n)) return <Building2 size={20} />;
  if (/تصوير|فيديو|كامي|توثيق/.test(n)) return <Camera size={20} />;
  if (/فست|أزيا|ازيا|عبا|خياط/.test(n)) return <Shirt size={20} />;
  if (/تجميل|مكياج|شعر|عناي|سبا|مساج/.test(n)) return <Sparkles size={20} />;
  if (/ورد|زهور|تنسيق|ديكور|تصميم/.test(n)) return <Flower2 size={20} />;
  if (/زفا|موسيق|فرق|صوت|إضاء|اضاء/.test(n)) return <Music4 size={20} />;
  if (/ضياف|بوفيه|حلو|طعام|مأكول|قهو|تمور/.test(n)) return <Cake size={20} />;
  if (/منسق|تنظيم|حفل|مناسب/.test(n)) return <Gem size={20} />;
  return <Star size={20} />;
}

export type LandingProps = {
  txt: (key: string, fallback: string) => string;
  categories: Cat[];
  cityCount: number;
  providerCount: number;
  favCount: number;
  heroImage: string;
  banner: Banner | null;
  showcase: Array<{ id: string }>;
  renderProviderCard: (id: string) => ReactNode;
  onExploreCategory: (categoryId: string | null) => void;
};

export default function HomeLanding({
  txt,
  categories,
  cityCount,
  providerCount,
  favCount,
  heroImage,
  banner,
  showcase,
  renderProviderCard,
  onExploreCategory,
}: LandingProps) {
  const quickCats = categories.slice(0, 8);

  const journey = [
    {
      title: txt("hl.journey.1.title", "ابدئي باختيار القاعة"),
      desc: txt("hl.journey.1.desc", "قاعات وأماكن مناسبة لعدد ضيوفكِ وميزانيتكِ."),
    },
    {
      title: txt("hl.journey.2.title", "احفظي مصوّراتكِ المفضلات"),
      desc: txt("hl.journey.2.desc", "قارني الأعمال واحفظي الأسماء اللي عجبتكِ."),
    },
    {
      title: txt("hl.journey.3.title", "استكشفي تنسيقات الورد"),
      desc: txt("hl.journey.3.desc", "أفكار تنسيق هادئة وفاخرة تناسب أجواء مناسبتكِ."),
    },
  ];

  const steps = [
    { t: txt("hl.step.1", "اختاري الفئة أو المدينة"), d: txt("hl.step.1.d", "حددي وش تحتاجين ووين مناسبتكِ.") },
    { t: txt("hl.step.2", "قارني واحفظي خياراتكِ"), d: txt("hl.step.2.d", "تفاصيل وأسعار وأعمال في مكان واحد.") },
    { t: txt("hl.step.3", "تواصلي مع مزود الخدمة"), d: txt("hl.step.3.d", "تواصل مباشر بدون وسطاء ولا تعقيد.") },
  ];

  return (
    <>
      <style>{landingCss}</style>

      {/* ── 3. HERO ── */}
      <section className="hl-hero">
        <div className="hl-hero-in">
          <div className="hl-hero-copy">
            <span className="hl-eyebrow">
              <span className="hl-eyebrow-line" />
              {txt("hl.hero.eyebrow", "دليل مناسبات أزهليها")}
            </span>
            <h1 className="hl-hero-title">{txt("hl.hero.title", "كل تفاصيل مناسبتكِ بين يديكِ")}</h1>
            <p className="hl-hero-desc">
              {txt("hl.hero.desc", "اكتشفي الدليل، احفظي خياراتكِ، ورتّبي يومكِ كما تحلمين.")}
            </p>
            <div className="hl-hero-actions">
              <button type="button" className="hl-btn" onClick={() => onExploreCategory(null)}>
                {txt("hl.hero.cta", "استكشفي الدليل")}
              </button>
              <Link to="/favorites" className="hl-link">
                {txt("hl.hero.cta2", "عرض مفضلتي")}
                <ArrowLeft size={15} />
              </Link>
            </div>
          </div>
          <div className="hl-hero-media">
            <span className="hl-hero-frame" aria-hidden="true" />
            <img src={heroImage} alt={txt("hl.hero.title", "كل تفاصيل مناسبتكِ بين يديكِ")} loading="eager" decoding="async" />
          </div>
        </div>
      </section>

      {/* ── 4. QUICK CATEGORIES ── */}
      {quickCats.length > 0 && (
        <section className="hl-sec">
          <div className="hl-sec-head">
            <h2 className="hl-h2">{txt("hl.cats.title", "وش تحتاجين اليوم؟")}</h2>
            <p className="hl-sub">{txt("hl.cats.desc", "اختاري الفئة وبنعرض لكِ الأنسب.")}</p>
          </div>
          <div className="hl-cat-grid">
            {quickCats.map((c) => (
              <button key={c.id} type="button" className="hl-cat" onClick={() => onExploreCategory(c.id)}>
                <span className="hl-cat-ico">{catIcon(c.name_ar)}</span>
                <span className="hl-cat-name">{c.name_ar}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 5. JOURNEY ── */}
      <section className="hl-sec hl-sec-alt">
        <div className="hl-sec-head">
          <h2 className="hl-h2">{txt("hl.journey.title", "نكمّل معكِ التفاصيل الحلوة")}</h2>
          <p className="hl-sub">{txt("hl.journey.desc", "خطوات صغيرة تقرّبكِ من يومكِ.")}</p>
        </div>
        <div className="hl-journey">
          {journey.map((j) => (
            <article key={j.title} className="hl-jcard">
              <h3>{j.title}</h3>
              <p>{j.desc}</p>
              <button type="button" className="hl-link" onClick={() => onExploreCategory(null)}>
                {txt("hl.journey.cta", "استكشفي")}
                <ArrowLeft size={14} />
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* ── 6. SPONSORED ── */}
      {banner && (
        <section className="hl-sec">
          <article className="hl-ad">
            <div className="hl-ad-body">
              <div className="hl-ad-tags">
                <span className="hl-ad-badge">{txt("ad.tag", "إعلان")}</span>
                <span className="hl-ad-eyebrow">{txt("hl.ad.eyebrow", "تحت الضوء هذا الشهر")}</span>
              </div>
              <h3 className="hl-ad-title">{banner.title || txt("hl.ad.name", "مزود خدمة مميز")}</h3>
              <p className="hl-ad-desc">
                {txt("hl.ad.desc", "باقة مختارة بعناية لمناسبتكِ، بتفاصيل هادئة وخدمة راقية.")}
              </p>
              <span className="hl-ad-gold">{txt("hl.ad.gold", "عرض حصري لمشتركات أزهليها")}</span>
              <div>
                {banner.link_url ? (
                  <a className="hl-btn" href={banner.link_url} target="_blank" rel="noopener noreferrer">
                    {txt("hl.ad.cta", "اكتشفي العرض")}
                  </a>
                ) : (
                  <button type="button" className="hl-btn" onClick={() => onExploreCategory(null)}>
                    {txt("hl.ad.cta", "اكتشفي العرض")}
                  </button>
                )}
              </div>
            </div>
            <div className="hl-ad-media">
              <img src={banner.image_url} alt={banner.title ?? txt("ad.tag", "إعلان")} loading="lazy" decoding="async" />
            </div>
          </article>
        </section>
      )}

      {/* ── 7. PICKED PROVIDERS ── */}
      {showcase.length > 0 && (
        <section className="hl-sec hl-sec-alt">
          <div className="hl-sec-head">
            <h2 className="hl-h2">{txt("hl.picks.title", "خيارات قد تعجبكِ")}</h2>
            <p className="hl-sub">{txt("hl.picks.desc", "أسماء مختارة من دليل أزهليها.")}</p>
          </div>
          <div className="hl-picks">{showcase.slice(0, 4).map((p) => renderProviderCard(p.id))}</div>
          <div className="hl-sec-foot">
            <button type="button" className="hl-btn hl-btn-ghost" onClick={() => onExploreCategory(null)}>
              {txt("hl.picks.cta", "عرض كل المزودين")}
            </button>
          </div>
        </section>
      )}

      {/* ── 8. HOW IT WORKS ── */}
      <section className="hl-sec">
        <div className="hl-sec-head">
          <h2 className="hl-h2">{txt("hl.how.title", "رتّبي فرحتكِ بثلاث خطوات")}</h2>
        </div>
        <ol className="hl-steps">
          {steps.map((s, i) => (
            <li key={s.t}>
              <span className="hl-step-num">{i + 1}</span>
              <div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 9. TRUST ── */}
      <section className="hl-trust">
        <div className="hl-trust-in">
          <div className="hl-trust-grid">
            <div className="hl-trust-item">
              <Building2 size={18} />
              <strong>
                +{Math.max(500, Math.floor(providerCount / 50) * 50)} {txt("hl.trust.providers", "مزود خدمة")}
              </strong>
            </div>
            <div className="hl-trust-item">
              <Star size={18} />
              <strong>{txt("hl.trust.data", "معلومات موثوقة ومحدثة")}</strong>
            </div>
            <div className="hl-trust-item">
              <MapPin size={18} />
              <strong>
                {txt("hl.trust.cities", "خيارات في")} {cityCount} {txt("hl.trust.cities2", "مدينة")}
              </strong>
            </div>
            <div className="hl-trust-item">
              <Heart size={18} />
              <strong>
                {txt("hl.trust.fav", "مفضلة خاصة بكِ")}
                {favCount > 0 ? ` (${favCount})` : ""}
              </strong>
            </div>
          </div>
          <p className="hl-trust-note">{txt("hl.trust.note", "كل تفاصيل فرحتكِ تبدأ بخيار واضح.")}</p>
        </div>
      </section>
    </>
  );
}

export function HomeTopStrip({ text }: { text: string }) {
  return (
    <div className="hl-topbar">
      <style>{topStripCss}</style>
      <Heart size={13} fill="currentColor" />
      <span>{text}</span>
    </div>
  );
}

const topStripCss = `
  .hl-topbar { background:#640000; color:#fff; display:flex; align-items:center; justify-content:center; gap:8px; padding:7px 16px; font-size:12.5px; letter-spacing:.01em; }
`;

const landingCss = `
  .hl-sec { max-width:1240px; margin:0 auto; padding:64px 32px; }
  .hl-sec-alt { max-width:none; background:#f8f7f0; padding-inline:0; }
  .hl-sec-alt > * { max-width:1240px; margin-inline:auto; padding-inline:32px; }
  .hl-sec-head { margin-bottom:30px; }
  .hl-h2 { font-size:clamp(1.5rem,2.4vw,2.1rem); color:#2a211c; font-weight:600; letter-spacing:-.02em; margin:0; }
  .hl-sub { color:rgba(42,33,28,.62); font-size:13.5px; margin:8px 0 0; }
  .hl-eyebrow { display:inline-flex; align-items:center; gap:10px; font-size:12px; color:#640000; letter-spacing:.06em; }
  .hl-eyebrow-line { width:28px; height:1px; background:rgba(100,0,0,.4); display:inline-block; }
  .hl-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:#640000; color:#fff; border:1px solid #640000; border-radius:6px; padding:12px 26px; font-size:13.5px; font-family:inherit; cursor:pointer; text-decoration:none; transition:background .25s ease, color .25s ease; }
  .hl-btn:hover { background:#4d0000; }
  .hl-btn-ghost { background:transparent; color:#640000; }
  .hl-btn-ghost:hover { background:#640000; color:#fff; }
  .hl-link { display:inline-flex; align-items:center; gap:6px; background:none; border:0; padding:0; font-family:inherit; font-size:13.5px; color:#640000; cursor:pointer; text-decoration:none; border-bottom:1px solid rgba(100,0,0,.28); }
  .hl-link:hover { border-bottom-color:#640000; }

  /* hero */
  .hl-hero { background:linear-gradient(180deg,#f8f7f0 0%,#e6e4d7 100%); border-bottom:1px solid rgba(100,0,0,.08); }
  .hl-hero-in { max-width:1240px; margin:0 auto; padding:66px 32px 74px; display:grid; grid-template-columns:1fr 1.05fr; gap:56px; align-items:center; }
  .hl-hero-copy { max-width:520px; }
  .hl-hero-title { font-size:clamp(2rem,3.6vw,3.2rem); line-height:1.24; font-weight:600; letter-spacing:-.03em; color:#2a211c; margin:18px 0 14px; }
  .hl-hero-desc { color:rgba(42,33,28,.7); font-size:15px; line-height:1.95; margin:0 0 26px; }
  .hl-hero-actions { display:flex; align-items:center; gap:22px; flex-wrap:wrap; }
  .hl-hero-media { position:relative; }
  .hl-hero-media img { display:block; width:100%; height:auto; max-height:470px; object-fit:cover; border-radius:10px; box-shadow:0 26px 60px rgba(53,24,19,.14); position:relative; z-index:1; }
  .hl-hero-frame { position:absolute; inset-inline-start:-22px; top:-22px; width:46%; height:60%; border:1px solid rgba(160,120,60,.4); border-radius:8px; z-index:0; }

  /* categories */
  .hl-cat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
  .hl-cat { display:flex; flex-direction:column; align-items:flex-start; gap:14px; background:#f8f7f0; border:1px solid rgba(100,0,0,.1); border-radius:10px; padding:22px 20px; cursor:pointer; font-family:inherit; text-align:start; transition:border-color .25s ease, transform .25s ease, box-shadow .25s ease; }
  .hl-cat:hover { border-color:rgba(100,0,0,.34); transform:translateY(-2px); box-shadow:0 14px 30px rgba(53,24,19,.07); }
  .hl-cat-ico { width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#640000; background:#fff; border:1px solid rgba(100,0,0,.14); }
  .hl-cat-name { font-size:13.5px; color:#2a211c; }

  /* journey */
  .hl-journey { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
  .hl-jcard { background:#fff; border:1px solid rgba(100,0,0,.1); border-radius:10px; padding:26px 24px; display:grid; gap:10px; justify-items:start; }
  .hl-jcard h3 { margin:0; font-size:16px; color:#640000; font-weight:600; }
  .hl-jcard p { margin:0; font-size:13px; color:rgba(42,33,28,.68); line-height:1.9; }

  /* ad */
  .hl-ad { display:grid; grid-template-columns:1.05fr .95fr; gap:40px; align-items:center; background:#f8f7f0; border:1px solid rgba(160,120,60,.28); border-radius:12px; padding:34px; }
  .hl-ad-body { display:grid; gap:12px; justify-items:start; }
  .hl-ad-tags { display:flex; align-items:center; gap:12px; }
  .hl-ad-badge { font-size:11px; letter-spacing:.06em; color:#640000; border:1px solid rgba(100,0,0,.3); border-radius:999px; padding:3px 11px; background:#fff; }
  .hl-ad-eyebrow { font-size:12px; color:rgba(42,33,28,.6); }
  .hl-ad-title { margin:0; font-size:22px; color:#2a211c; font-weight:600; }
  .hl-ad-desc { margin:0; font-size:13.5px; line-height:1.9; color:rgba(42,33,28,.7); max-width:420px; }
  .hl-ad-gold { font-size:12px; color:#8a6a2f; border:1px solid rgba(160,120,60,.45); background:rgba(206,175,110,.12); border-radius:999px; padding:5px 13px; }
  .hl-ad-media img { display:block; width:100%; height:280px; object-fit:cover; border-radius:10px; }

  /* picks */
  .hl-picks { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
  .hl-sec-foot { margin-top:28px; display:flex; justify-content:center; }

  /* steps */
  .hl-steps { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(3,1fr); gap:26px; }
  .hl-steps li { display:flex; gap:16px; align-items:flex-start; border-top:1px solid rgba(100,0,0,.14); padding-top:20px; }
  .hl-step-num { flex:0 0 auto; width:38px; height:38px; border-radius:50%; border:1px solid rgba(100,0,0,.28); color:#640000; display:flex; align-items:center; justify-content:center; font-size:14px; }
  .hl-steps h3 { margin:0 0 6px; font-size:15px; color:#2a211c; font-weight:600; }
  .hl-steps p { margin:0; font-size:13px; color:rgba(42,33,28,.65); line-height:1.85; }

  /* trust */
  .hl-trust { background:#640000; color:#fff; }
  .hl-trust-in { max-width:1240px; margin:0 auto; padding:52px 32px; }
  .hl-trust-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:22px; }
  .hl-trust-item { display:flex; align-items:center; gap:10px; padding-inline-end:18px; border-inline-end:1px solid rgba(255,255,255,.16); }
  .hl-trust-item:last-child { border-inline-end:0; }
  .hl-trust-item strong { font-size:13.5px; font-weight:500; }
  .hl-trust-note { margin:26px 0 0; font-size:13px; opacity:.82; }

  @media (max-width:1000px) {
    .hl-hero-in { grid-template-columns:1fr; gap:34px; padding:44px 20px 52px; }
    .hl-hero-frame { display:none; }
    .hl-cat-grid { grid-template-columns:repeat(3,1fr); }
    .hl-journey, .hl-steps { grid-template-columns:1fr; }
    .hl-picks { grid-template-columns:repeat(2,1fr); }
    .hl-ad { grid-template-columns:1fr; padding:22px; }
    .hl-trust-grid { grid-template-columns:repeat(2,1fr); }
    .hl-sec { padding:44px 20px; }
    .hl-sec-alt > * { padding-inline:20px; }
    .hl-trust-in { padding:38px 20px; }
  }
  @media (max-width:620px) {
    .hl-cat-grid { grid-template-columns:repeat(2,1fr); }
    .hl-picks { grid-template-columns:1fr; }
    .hl-trust-grid { grid-template-columns:1fr; }
    .hl-trust-item { border-inline-end:0; }
  }
`;
