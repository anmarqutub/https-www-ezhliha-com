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
  LayoutGrid,
  Music4,
  Shirt,
  Sparkles,
  Star,
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
  filterSlot?: ReactNode;
  renderProviderCard: (id: string) => ReactNode;
  onExploreCategory: (categoryId: string | null) => void;
};

export default function HomeLanding({
  txt,
  categories,
  providerCount,
  favCount,
  heroImage,
  banner,
  showcase,
  filterSlot,
  renderProviderCard,
  onExploreCategory,
}: LandingProps) {
  const quickCats = categories.slice(0, 8);

  const journey = [
    {
      title: txt("hl.journey.1.title", "ابدئي باختيار القاعة"),
      desc: txt("hl.journey.1.desc", "قاعات وأماكن مناسبة لعدد ضيوفكِ وميزانيتكِ."),
      cta: txt("hl.journey.1.cta", "استكشفي القاعات"),
    },
    {
      title: txt("hl.journey.2.title", "اختاري المصوّرة"),
      desc: txt("hl.journey.2.desc", "اختاري المصوّرة التي توثّق ذكرياتكِ بأسلوب يناسبكِ."),
      cta: txt("hl.journey.2.cta", "استكشفي المصوّرات"),
    },
    {
      title: txt("hl.journey.3.title", "رتّبي تفاصيل مناسبتكِ"),
      desc: txt("hl.journey.3.desc", "من الورد إلى الديكور، اختاري التفاصيل التي تكمّل مناسبتكِ."),
      cta: txt("hl.journey.3.cta", "استكشفي الخدمات"),
    },
  ];

  const steps = [
    { t: txt("hl.step.1", "اختاري نوع الخدمة والمدينة"), d: txt("hl.step.1.d", "حدّدي ما تحتاجينه ومكان مناسبتكِ.") },
    { t: txt("hl.step.2", "قارني واحفظي خياراتكِ"), d: txt("hl.step.2.d", "تفاصيل وأسعار وأعمال في مكان واحد.") },
    { t: txt("hl.step.3", "تواصلي مع مقدّم الخدمة"), d: txt("hl.step.3.d", "تواصل مباشر بدون وسطاء أو تعقيد.") },
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

      {filterSlot}

      {/* ── TRUST (animated) ── */}
      <TrustCounter
        txt={txt}
        target={Math.max(500, Math.floor(providerCount / 50) * 50)}
        favCount={favCount}
        onExplore={() => onExploreCategory(null)}
      />

      {/* ── 4. QUICK CATEGORIES ── */}
      {quickCats.length > 0 && (
        <section className="hl-sec">
          <div className="hl-sec-head">
            <h2 className="hl-h2">{txt("hl.cats.title", "ماذا تحتاجين اليوم؟")}</h2>
            <p className="hl-sub">{txt("hl.cats.desc", "اختاري نوع الخدمة، ونعرض لكِ الخيارات المناسبة.")}</p>
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
          <h2 className="hl-h2">{txt("hl.journey.title", "نكمّل معكِ تفاصيل مناسبتكِ")}</h2>
          <p className="hl-sub">{txt("hl.journey.desc", "خطوات واضحة تقرّبكِ من يومكِ.")}</p>
        </div>
        <div className="hl-journey">
          {journey.map((j) => (
            <article key={j.title} className="hl-jcard">
              <h3>{j.title}</h3>
              <p>{j.desc}</p>
              <button type="button" className="hl-link" onClick={() => onExploreCategory(null)}>
                {j.cta}
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

    </>
  );
}

function TrustCounter({
  txt,
  target,
  onExplore,
}: {
  txt: (k: string, f: string) => string;
  target: number;
  onExplore: () => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [on, setOn] = useState(false);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [on]);

  useEffect(() => {
    if (!on) return;
    const dur = 1800;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, target]);

  return (
    <section className={`hl-tc${on ? " is-on" : ""}`} ref={ref}>
      <div className="hl-tc-in">
        <div className="hl-tc-core">
          <span className="hl-tc-ico" aria-hidden="true">
            <LayoutGrid />
          </span>
          <span className="hl-tc-pre">{txt("hl.tc.pre", "دليل أزهليها")}</span>
          <strong className="hl-tc-num">+{val}</strong>
          <span className="hl-tc-label">{txt("hl.tc.label", "مزوّد خدمة لمناسبتكِ")}</span>
          <p className="hl-tc-note">
            {txt(
              "hl.tc.note",
              "من القاعات والتصوير إلى الورد والجمال والضيافة، اكتشفي خيارات متنوعة في مكان واحد.",
            )}
          </p>
          <button type="button" className="hl-btn hl-tc-btn" onClick={onExplore}>
            {txt("hl.hero.cta", "استكشفي الدليل")}
          </button>
        </div>
      </div>
    </section>
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
    .hl-hero-in { gap:clamp(16px,3vw,34px); padding:clamp(26px,5vw,44px) clamp(14px,3vw,20px) clamp(30px,5vw,52px); }
    .hl-hero-frame { display:none; }
    .hl-cat-grid { grid-template-columns:repeat(3,1fr); }
    .hl-journey, .hl-steps { grid-template-columns:1fr; }
    .hl-picks { grid-template-columns:repeat(2,1fr); }
    .hl-trust-grid { grid-template-columns:repeat(2,1fr); }
    .hl-sec { padding:clamp(28px,6vw,44px) clamp(14px,3vw,20px); }
    .hl-sec-alt > * { padding-inline:clamp(14px,3vw,20px); }
    .hl-trust-in { padding:38px 20px; }
  }

  /* ── MOBILE: proportionally scaled copy of the desktop layout (same DOM, same composition) ── */
  @media (max-width:760px) {
    .hl-sec { padding:clamp(26px,7vw,38px) 14px; }
    .hl-sec-alt > * { padding-inline:14px; }
    .hl-sec-head { margin-bottom:16px; }
    .hl-h2 { font-size:clamp(1.15rem,5.2vw,1.55rem); }
    .hl-sub { font-size:14px; }
    .hl-btn { min-height:44px; padding:11px 18px; font-size:14px; }
    .hl-link { font-size:14px; min-height:44px; }

    /* hero keeps the desktop horizontal composition */
    .hl-hero-in { grid-template-columns:1.05fr .95fr; gap:12px; align-items:center; }
    .hl-hero-copy { max-width:none; }
    .hl-eyebrow { font-size:12px; }
    .hl-eyebrow-line { width:16px; }
    .hl-hero-title { font-size:clamp(1.1rem,5.6vw,1.75rem); line-height:1.3; margin:10px 0 8px; }
    .hl-hero-desc { font-size:14px; line-height:1.7; margin:0 0 14px; }
    .hl-hero-actions { gap:10px; }
    .hl-hero-media img { max-height:clamp(180px,44vw,240px); object-fit:cover; object-position:center 22%; border-radius:8px; }

    /* card rows stay horizontal with smooth scrolling */
    .hl-cat-grid, .hl-picks, .hl-journey {
      display:flex; grid-template-columns:none; gap:10px;
      overflow-x:auto; -webkit-overflow-scrolling:touch;
      scroll-snap-type:x proximity; padding-bottom:6px;
      scrollbar-width:none;
    }
    .hl-cat-grid::-webkit-scrollbar, .hl-picks::-webkit-scrollbar, .hl-journey::-webkit-scrollbar { display:none; }
    .hl-cat-grid > *, .hl-picks > *, .hl-journey > * { scroll-snap-align:start; }
    .hl-cat-grid > * { flex:0 0 40%; min-width:132px; }
    .hl-cat { padding:14px 12px; gap:10px; }
    .hl-cat-ico { width:38px; height:38px; }
    .hl-cat-name { font-size:14px; }
    .hl-picks > * { flex:0 0 72%; min-width:230px; }
    .hl-journey > * { flex:0 0 74%; min-width:236px; }
    .hl-jcard { padding:16px 14px; }
    .hl-jcard h3 { font-size:16px; }
    .hl-jcard p { font-size:14px; line-height:1.7; }

    /* sponsored banner stays horizontal, image cropped smartly */
    .hl-ad { grid-template-columns:1.1fr .9fr; gap:12px; padding:14px; border-radius:10px; }
    .hl-ad-title { font-size:clamp(1rem,4.6vw,1.3rem); }
    .hl-ad-desc { font-size:14px; line-height:1.7; max-width:none; }
    .hl-ad-gold { font-size:12px; }
    .hl-ad-media img { height:clamp(150px,38vw,200px); object-fit:cover; object-position:center; }

    .hl-steps li { padding-top:14px; gap:12px; }
    .hl-step-num { width:34px; height:34px; }
    .hl-steps h3 { font-size:16px; }
    .hl-steps p { font-size:14px; }

    /* (قواعد قسم +500 للجوال موجودة بنهاية الملف بعد القواعد الأساسية) */


  }
  /* على الشاشات الضيقة جدًا: نفس ترتيب العناصر لكن عمود واحد لتبقى القراءة مريحة */
  @media (max-width:560px) {
    .hl-hero-in { grid-template-columns:1fr; gap:18px; }
    .hl-hero-media img { max-height:clamp(200px,58vw,280px); }
    .hl-ad { grid-template-columns:1fr; gap:14px; }
    .hl-ad-media img { height:clamp(170px,46vw,220px); }
    .hl-cat-grid > * { flex:0 0 46%; }
    .hl-picks > * { flex:0 0 82%; }
    .hl-journey > * { flex:0 0 84%; }
  }

  /* trust counter */
  .hl-tc { background:#e6e4d7; background-image:radial-gradient(rgba(100,0,0,.045) 1px, transparent 1px); background-size:5px 5px; border-top:1px solid rgba(160,120,60,.22); border-bottom:1px solid rgba(160,120,60,.22); }
  .hl-tc-in { max-width:1240px; margin:0 auto; padding:clamp(34px,5vw,58px) clamp(16px,3vw,32px); display:grid; grid-template-columns:1fr auto 1fr; gap:clamp(16px,2.6vw,34px); align-items:center; }
  .hl-tc-core { text-align:center; display:grid; justify-items:center; gap:6px; background:rgba(255,255,255,.55); border:1px solid rgba(160,120,60,.28); border-radius:22px; padding:clamp(22px,3vw,34px) clamp(20px,3vw,40px); box-shadow:0 18px 44px rgba(53,24,19,.07); }
  .hl-tc-pre { font-size:13px; color:rgba(42,33,28,.6); letter-spacing:.08em; }
  .hl-tc-num { font-size:clamp(3rem,6vw,5.2rem); line-height:1; color:#660000; font-weight:700; letter-spacing:-.04em; }
  .hl-tc-label { font-size:17px; color:#2a211c; }
  .hl-tc-note { margin:6px 0 0; font-size:13.5px; color:rgba(42,33,28,.66); }
  .hl-tc-meta { margin:2px 0 0; display:flex; align-items:center; gap:8px; font-size:12.5px; color:rgba(42,33,28,.6); }
  .hl-tc-dot { width:4px; height:4px; border-radius:50%; background:rgba(160,120,60,.7); }
  .hl-tc-btn { margin-top:16px; opacity:0; transform:translateY(8px); transition:opacity .6s ease 1.9s, transform .6s ease 1.9s; }
  .hl-tc.is-on .hl-tc-btn { opacity:1; transform:none; }
  .hl-tc-cards { display:grid; gap:14px; justify-items:stretch; }
  .hl-tc-cards-b { justify-items:stretch; }
  .hl-tc-chip { display:flex; align-items:center; gap:10px; background:#f8f7f0; border:1px solid rgba(160,120,60,.3); border-radius:10px; padding:13px 16px; font-size:13px; color:#2a211c; box-shadow:0 10px 26px rgba(53,24,19,.06); opacity:0; transform:translateY(14px); transition:opacity .7s ease, transform .7s ease; }
  .hl-tc.is-on .hl-tc-chip { opacity:1; transform:none; animation:hl-float 6s ease-in-out infinite; }
  .hl-tc-cards-a .hl-tc-chip:nth-child(2) { margin-inline-start:26px; }
  .hl-tc-cards-b .hl-tc-chip:nth-child(2) { margin-inline-end:26px; }
  .hl-tc-chip em { width:32px; height:32px; flex:0 0 auto; border-radius:50%; background:#fff; border:1px solid rgba(100,0,0,.14); color:#660000; display:flex; align-items:center; justify-content:center; }
  @keyframes hl-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
  @media (prefers-reduced-motion:reduce) { .hl-tc.is-on .hl-tc-chip { animation:none; } }

  /* قسم +500 على الجوال: الرقم أولاً ثم التصنيفات في شبكة عمودين */
  @media (max-width:900px) {
    .hl-tc-in { grid-template-columns:1fr; gap:12px; padding:clamp(28px,7vw,44px) 14px; }
    .hl-tc-core { order:-1; padding:20px 16px; border-radius:18px; }
    .hl-tc-cards { display:grid; grid-template-columns:1fr 1fr; gap:8px; overflow:visible; justify-items:stretch; }
    .hl-tc-cards-a .hl-tc-chip:nth-child(2), .hl-tc-cards-b .hl-tc-chip:nth-child(2) { margin-inline:0; }
    .hl-tc-cards .hl-tc-chip { font-size:13px; padding:10px 11px; gap:8px; border-radius:12px; box-shadow:0 6px 16px rgba(53,24,19,.05); }
    .hl-tc-chip em { width:26px; height:26px; }
    .hl-tc-num { font-size:clamp(3rem,17vw,4.6rem); }
    .hl-tc-label { font-size:16px; }
    .hl-tc-note, .hl-tc-meta { font-size:13px; }
    .hl-tc-meta { justify-content:center; flex-wrap:wrap; }
    .hl-tc-btn { width:100%; min-height:44px; }
    .hl-tc.is-on .hl-tc-chip { animation:none; }
  }

`;
