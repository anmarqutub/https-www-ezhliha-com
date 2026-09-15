import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/logo.jpg";

export const CONTACT_WA_NUMBER = "+966573444242";
export const CONTACT_WA_MESSAGE = "مرحبًا أزهليها، لدي استفسار.";

function wa(number: string, message: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.78 11.78 0 0012.06 0C5.5 0 .17 5.33.17 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.32-1.66a11.86 11.86 0 005.74 1.46h.01c6.56 0 11.89-5.33 11.89-11.9 0-3.18-1.24-6.17-3.44-8.42zM12.07 21.8h-.01a9.9 9.9 0 01-5.05-1.38l-.36-.21-3.75.99 1-3.66-.24-.38a9.86 9.86 0 01-1.51-5.26c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.13 1.03 7 2.9a9.83 9.83 0 012.9 7c0 5.46-4.44 9.9-9.88 9.9zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.06 2.88 1.21 3.08.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35z" />
    </svg>
  );
}

export default function SiteFooter({ texts }: { texts?: Record<string, string> }) {
  const [fetched, setFetched] = useState<Record<string, string>>({});
  useEffect(() => {
    if (texts) return;
    supabase
      .from("site_texts")
      .select("key,value")
      .then(({ data }) => setFetched(Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))));
  }, [texts]);
  const t = texts ?? fetched;
  const txt = (k: string, f: string) => t[k] || f;

  return (
    <footer className="ez-footer" id="ez-contact">
      <style>{footerCss}</style>
      <div className="ez-footer-grid">
        <div className="ez-footer-brand">
          <img src={logoUrl} alt="إزهليها" />
          <p>{txt("footer.tagline", "أزهليها تساعدكِ على اكتشاف مزوّدي خدمات المناسبات واختيار ما يناسبكِ بسهولة.")}</p>
        </div>

        <div className="ez-footer-col">
          <h3>{txt("footer.explore", "استكشفي")}</h3>
          <div className="ez-footer-links">
            <Link to="/">{txt("nav.home", "الرئيسية")}</Link>
            <Link to="/providers" search={{}}>{txt("footer.all", "الدليل")}</Link>

            <Link to="/categories">{txt("nav.categories", "الفئات")}</Link>
            <Link to="/cities">{txt("nav.cities", "المدن")}</Link>
            <Link to="/favorites">{txt("nav.favorites", "المفضلة")}</Link>
          </div>
        </div>

        <div className="ez-footer-col">
          <h3>{txt("footer.contact.title", "يسعدنا تواصلكِ معنا")}</h3>
          <div className="ez-footer-links">
            <a
              className="ez-footer-wa"
              href={wa(txt("contact.wa_number", CONTACT_WA_NUMBER), txt("contact.wa_message", CONTACT_WA_MESSAGE))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon size={16} />
              <span>{txt("footer.contact", "واتساب أزهليها")}</span>
            </a>
            <Link to="/about">{txt("footer.about", "من نحن")}</Link>
            <span>✉️ {txt("footer.email", "admin@ezhliha.com")}</span>
            <Link to="/faq">💡 {txt("nav.faq", "الأسئلة الشائعة")}</Link>
            <a
              href={wa(
                txt("contact.wa_number", CONTACT_WA_NUMBER),
                txt("footer.join.message", "مرحبًا أزهليها، أرغب في الانضمام كمقدّم خدمة."),
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              {txt("footer.join", "انضمّي كمقدّم خدمة")}
            </a>


          </div>
        </div>
      </div>
      <div className="ez-footer-bar">
        <span>{txt("footer.copy", "Ezhliha © 2026 — Powered by AQ")}</span>
        <span>{txt("footer.motto", "اختيارات أوضح، ووقت أقل.")}</span>
      </div>
    </footer>
  );
}

const footerCss = `
  .ez-footer { background:#640000; color:#fff; padding:0; font-family:"Thmanyah Serif Display", "Noto Sans Arabic", Tajawal, system-ui, sans-serif; font-size:13.5px; line-height:1.75; }
  .ez-footer h3 { font-family:"Thmanyah Serif Display","Alexandria","Noto Sans Arabic",Tajawal,sans-serif; }
  .ez-footer-grid { max-width:1240px; margin:0 auto; padding:52px 32px 44px; display:grid; grid-template-columns:1.2fr .8fr .9fr; gap:36px; }
  .ez-footer-brand { max-width:400px; }
  .ez-footer-brand img { height:64px; width:auto; object-fit:contain; background:#fff; border-radius:8px; padding:6px 10px; }
  .ez-footer-brand p { color:#fff; font-size:13.5px; line-height:1.95; margin:16px 0 0; }
  .ez-footer-col h3 { font-size:14px; font-weight:500; margin:0; color:#fff; }
  .ez-footer-links { margin-top:18px; display:grid; gap:12px; justify-items:start; font-size:13.5px; color:#fff; }
  .ez-footer-links > * { display:inline-flex; align-items:center; gap:8px; text-align:start; }
  .ez-footer-links a, .ez-footer-links button { background:none; border:0; padding:0; cursor:pointer; color:#fff; text-decoration:none; font-family:inherit; font-size:13.5px; }
  .ez-footer-links a:hover, .ez-footer-links button:hover { color:#fff; }
  .ez-footer-wa { display:inline-flex; align-items:center; gap:8px; }
  .ez-footer-bar { border-top:1px solid rgba(255,255,255,.14); max-width:1240px; margin:0 auto; padding:18px 32px; display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; font-size:12px; color:#fff; }
  @media (max-width: 860px) { .ez-footer-grid { grid-template-columns:1fr; padding:36px 20px 28px; } .ez-footer-bar { padding:16px 20px; } }
`;
