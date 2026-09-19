import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import SiteFooter, { CONTACT_WA_NUMBER, WhatsAppIcon } from "@/components/SiteFooter";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "انضمّي كمقدمة خدمة | أزهليها" },
      {
        name: "description",
        content: "سجّلي خدمتك في أزهليها: املئي البيانات ويوصلنا طلبك على واتساب مباشرة ونرجع لك بأسرع وقت.",
      },
      { property: "og:title", content: "انضمّي كمقدمة خدمة | أزهليها" },
      {
        property: "og:description",
        content: "املئي بيانات خدمتك ويوصلنا طلب الانضمام على واتساب أزهليها مباشرة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => <div style={{ padding: 40, textAlign: "center" }}>صار خلل بسيط، حدّثي الصفحة.</div>,
  notFoundComponent: () => <div style={{ padding: 40, textAlign: "center" }}>الصفحة غير موجودة.</div>,
  component: JoinPage,
});

const SERVICES = [
  "قاعات واستراحات",
  "تنسيق الحفلات",
  "الضيافة (حلو ومالح)",
  "إطلالة المناسبة",
  "التصوير",
  "السبا والعناية",
  "دعوات إلكترونية",
  "خدمات إضافية",
];

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function JoinPage() {
  const [form, setForm] = useState({
    name: "",
    brand: "",
    service: "",
    city: "",
    phone: "",
    social: "",
    note: "",
  });
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value.slice(0, 300) });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const brand = form.brand.trim();
    const phone = digitsOnly(form.phone);
    if (name.length < 2) return setErr("اكتبي اسمك الكريم.");
    if (brand.length < 2) return setErr("اكتبي اسم الخدمة أو المتجر.");
    if (!form.service) return setErr("اختاري نوع الخدمة.");
    if (form.city.trim().length < 2) return setErr("اكتبي المدينة.");
    if (phone.length < 9 || phone.length > 15) return setErr("اكتبي رقم جوال صحيح.");
    setErr(null);

    const msg = [
      "هلا أزهليها 🤍 أبغى أنضم كمقدمة خدمة.",
      `الاسم: ${name}`,
      `اسم الخدمة: ${brand}`,
      `نوع الخدمة: ${form.service}`,
      `المدينة: ${form.city.trim()}`,
      `الجوال: ${phone}`,
      form.social.trim() ? `الحساب: ${form.social.trim()}` : "",
      form.note.trim() ? `ملاحظات: ${form.note.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const wa = `https://wa.me/${digitsOnly(CONTACT_WA_NUMBER)}?text=${encodeURIComponent(msg)}`;
    window.open(wa, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="jn-wrap" dir="rtl">
      <style>{css}</style>
      <div className="jn-main">
        <nav className="jn-crumb">
          <Link to="/">الرئيسية</Link>
          <span>/</span>
          <span>انضمّي كمقدمة خدمة</span>
        </nav>

        <header className="jn-head">
          <h1>انضمّي كمقدمة خدمة</h1>
          <p>عبّي البيانات اللي تحت، وبنرسلها مباشرة على واتساب أزهليها ونرجع لك بأسرع وقت.</p>
        </header>

        <form className="jn-card" onSubmit={submit}>
          <label className="jn-f">
            <span>اسمك</span>
            <input value={form.name} onChange={set("name")} placeholder="مثال: نوف" maxLength={80} />
          </label>
          <label className="jn-f">
            <span>اسم الخدمة / المتجر</span>
            <input value={form.brand} onChange={set("brand")} placeholder="مثال: بوفيهات رنوش" maxLength={120} />
          </label>
          <label className="jn-f">
            <span>نوع الخدمة</span>
            <select value={form.service} onChange={set("service")}>
              <option value="">اختاري نوع الخدمة</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="jn-f">
            <span>المدينة</span>
            <input value={form.city} onChange={set("city")} placeholder="مثال: الرياض" maxLength={60} />
          </label>
          <label className="jn-f">
            <span>رقم الجوال</span>
            <input
              value={form.phone}
              onChange={set("phone")}
              placeholder="05xxxxxxxx"
              inputMode="numeric"
              dir="ltr"
              maxLength={20}
            />
          </label>
          <label className="jn-f">
            <span>حساب انستقرام أو الموقع (اختياري)</span>
            <input value={form.social} onChange={set("social")} placeholder="@account" dir="ltr" maxLength={120} />
          </label>
          <label className="jn-f jn-full">
            <span>وش تقدّمين بالضبط؟ (اختياري)</span>
            <textarea value={form.note} onChange={set("note")} rows={3} maxLength={300} placeholder="نبذة قصيرة عن خدمتك وأسعارك" />
          </label>

          {err && <p className="jn-err">{err}</p>}

          <button type="submit" className="jn-btn">
            <WhatsAppIcon size={16} />
            <span>إرسال الطلب على واتساب</span>
          </button>
          <p className="jn-hint">بعد الضغط يفتح لك واتساب أزهليها وفيه بياناتك مكتوبة، أرسليها بس.</p>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}

const css = `
  .jn-wrap { background:#FBF7F0; min-height:100vh; display:flex; flex-direction:column; font-family:"Noto Sans Arabic",Tajawal,system-ui,sans-serif; }
  .jn-main { flex:1; width:100%; max-width:720px; margin:0 auto; padding:18px 16px 34px; }
  .jn-crumb { display:flex; gap:6px; font-size:11.5px; color:#8b6b6b; align-items:center; }
  .jn-crumb a { color:#640000; text-decoration:none; }
  .jn-head { margin:14px 0 12px; }
  .jn-head h1 { font-family:"Alexandria","Noto Sans Arabic",sans-serif; font-size:20px; color:#640000; margin:0 0 6px; }
  .jn-head p { margin:0; font-size:12.5px; color:#6b5a55; line-height:1.7; }
  .jn-card { background:#fff; border:1px solid #efe3d6; border-radius:12px; padding:14px; display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .jn-f { display:grid; gap:5px; }
  .jn-f.jn-full { grid-column:1 / -1; }
  .jn-f > span { font-size:11.5px; color:#640000; font-weight:600; }
  .jn-f input, .jn-f select, .jn-f textarea { border:1px solid #e7d9c9; border-radius:9px; padding:8px 10px; font-size:12.5px; font-family:inherit; background:#FFFDFA; color:#3d2b2b; }
  .jn-f input:focus, .jn-f select:focus, .jn-f textarea:focus { outline:none; border-color:#640000; }
  .jn-f textarea { resize:vertical; }
  .jn-err { grid-column:1 / -1; margin:0; font-size:12px; color:#b42318; }
  .jn-btn { grid-column:1 / -1; display:inline-flex; align-items:center; justify-content:center; gap:8px; background:#640000; color:#fff; border:0; border-radius:10px; min-height:40px; font-size:13px; font-family:inherit; cursor:pointer; }
  .jn-btn:hover { opacity:.93; }
  .jn-hint { grid-column:1 / -1; margin:0; font-size:11px; color:#8b6b6b; text-align:center; }
  @media (max-width: 560px) { .jn-card { grid-template-columns:1fr; } }
`;
