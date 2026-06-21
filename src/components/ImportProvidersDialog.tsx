import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type City = { id: string; name_ar: string };
type Category = { id: string; name_ar: string };
type Sub = { id: string; name_ar: string; category_id: string; parent_id: string | null };

type RawRow = Record<string, unknown>;

type ParsedRow = {
  rowNumber: number;
  raw: RawRow;
  errors: string[];
  payload?: {
    name: string;
    city_id: string;
    subcategory_id: string;
    description: string | null;
    price_from: number | null;
    price_to: number | null;
    whatsapp: string | null;
    instagram: string | null;
    tiktok: string | null;
    twitter: string | null;
    snapchat: string | null;
    address: string | null;
    rating: number | null;
    is_featured: boolean;
    featured_until: string | null;
    sort_order: number;
    active: boolean;
  };
  imageUrls: string[];
};

const REQUIRED = ["name", "city", "category", "subcategory"];

function norm(v: unknown): string {
  return String(v ?? "").trim();
}
function toNum(v: unknown): number | null {
  const s = norm(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function toBool(v: unknown): boolean {
  const s = norm(v).toLowerCase();
  return s === "نعم" || s === "yes" || s === "true" || s === "1";
}

export function ImportProvidersDialog({
  cities, cats, subs, onClose, onDone,
}: {
  cities: City[];
  cats: Category[];
  subs: Sub[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  const cityByName = new Map(cities.map((c) => [c.name_ar.trim(), c.id]));
  const catByName = new Map(cats.map((c) => [c.name_ar.trim(), c.id]));

  function findSub(catId: string, subName: string, tertiaryName: string): { id?: string; error?: string } {
    const primaryMatches = subs.filter((s) => s.category_id === catId && (s.parent_id === null) && s.name_ar.trim() === subName.trim());
    if (primaryMatches.length === 0) return { error: `التصنيف الفرعي "${subName}" غير موجود تحت "${catByName.get(catId) ? "هذا التصنيف" : "—"}"` };
    const primary = primaryMatches[0];
    if (!tertiaryName) return { id: primary.id };
    const tertiary = subs.find((s) => s.parent_id === primary.id && s.name_ar.trim() === tertiaryName.trim());
    if (!tertiary) return { error: `التصنيف الثانوي "${tertiaryName}" غير موجود تحت "${subName}"` };
    return { id: tertiary.id };
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames.includes("providers") ? "providers" : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "" });

    const out: ParsedRow[] = rows.map((raw, idx) => {
      const rowNumber = idx + 2; // header is row 1
      const errors: string[] = [];

      for (const k of REQUIRED) {
        if (!norm(raw[k])) errors.push(`العمود "${k}" مطلوب`);
      }

      const cityId = cityByName.get(norm(raw.city));
      if (norm(raw.city) && !cityId) errors.push(`المدينة "${norm(raw.city)}" غير موجودة`);

      const catId = catByName.get(norm(raw.category));
      if (norm(raw.category) && !catId) errors.push(`التصنيف "${norm(raw.category)}" غير موجود`);

      let subId: string | undefined;
      if (catId && norm(raw.subcategory)) {
        const r = findSub(catId, norm(raw.subcategory), norm(raw.tertiary));
        if (r.error) errors.push(r.error);
        subId = r.id;
      }

      const rating = toNum(raw.rating);
      if (rating !== null && (rating < 0 || rating > 5)) errors.push("التقييم يجب أن يكون بين 0 و 5");

      const imageUrls = norm(raw.image_urls)
        .split(/[,\n]/).map((u) => u.trim()).filter(Boolean);

      const p: ParsedRow = { rowNumber, raw, errors, imageUrls };
      if (errors.length === 0 && cityId && subId) {
        p.payload = {
          name: norm(raw.name),
          city_id: cityId,
          subcategory_id: subId,
          description: norm(raw.description) || null,
          price_from: toNum(raw.price_from),
          price_to: toNum(raw.price_to),
          whatsapp: norm(raw.whatsapp) || null,
          instagram: norm(raw.instagram) || null,
          tiktok: norm(raw.tiktok) || null,
          twitter: norm(raw.twitter) || null,
          snapchat: norm(raw.snapchat) || null,
          address: norm(raw.address) || null,
          rating,
          is_featured: toBool(raw.is_featured),
          featured_until: norm(raw.featured_until) || null,
          sort_order: toNum(raw.sort_order) ?? 0,
          active: true,
        };
      }
      return p;
    });

    setParsed(out);
  }

  async function doImport() {
    if (!parsed) return;
    const valid = parsed.filter((r) => r.payload);
    if (valid.length === 0) return;
    setImporting(true);
    let ok = 0, fail = 0;
    for (const r of valid) {
      const { data, error } = await supabase.from("providers").insert(r.payload!).select("id").single();
      if (error || !data) { fail++; continue; }
      if (r.imageUrls.length > 0) {
        const imgRows = r.imageUrls.map((url, i) => ({ provider_id: data.id, image_url: url, sort_order: i }));
        await supabase.from("provider_images").insert(imgRows);
      }
      ok++;
    }
    setImporting(false);
    setResult({ ok, fail });
    if (ok > 0) onDone();
  }

  const validCount = parsed?.filter((r) => r.payload).length ?? 0;
  const errorCount = parsed?.filter((r) => r.errors.length > 0).length ?? 0;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 22, maxWidth: 900, width: "100%", maxHeight: "88vh", overflow: "auto" }} dir="rtl">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>📥 رفع مقدمي خدمة من Excel</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ background: "#f9f7ef", border: "1px solid #e6e0c8", borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 13, lineHeight: 1.9 }}>
          <strong>الخطوات:</strong>
          <ol style={{ margin: "6px 0 0", paddingInlineStart: 20 }}>
            <li>نزّلي القالب الفارغ واعبئيه (ورقة باسم <code>providers</code>).</li>
            <li>تأكدي أن أسماء المدن والتصنيفات مطابقة لما في النظام.</li>
            <li>ارفعي الملف وراجعي المعاينة قبل التأكيد.</li>
          </ol>
          <a
            href="https://docs.google.com/spreadsheets/d/e/2PACX/pub?output=xlsx"
            onClick={(e) => { e.preventDefault(); window.open("/providers_template.xlsx", "_blank"); }}
            style={{ display: "inline-block", marginTop: 8, color: "#660000", fontWeight: 700, textDecoration: "underline" }}
          >
            ⬇️ تنزيل القالب الفارغ (providers_template.xlsx)
          </a>
        </div>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          style={{ marginBottom: 14 }}
        />
        {fileName && <span style={{ marginInlineStart: 10, fontSize: 13, color: "#555" }}>{fileName}</span>}

        {parsed && (
          <>
            <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: "#16a34a" }}>✅ صالح: {validCount}</span>
              <span style={{ color: "#dc2626" }}>❌ به أخطاء: {errorCount}</span>
              <span style={{ color: "#666" }}>المجموع: {parsed.length}</span>
            </div>

            <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead style={{ background: "#f5f3eb", position: "sticky", top: 0 }}>
                  <tr>
                    <th style={th}>#</th><th style={th}>الحالة</th><th style={th}>الاسم</th>
                    <th style={th}>المدينة</th><th style={th}>التصنيف</th><th style={th}>الفرعي</th>
                    <th style={th}>الأخطاء</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((r) => (
                    <tr key={r.rowNumber} style={{ background: r.errors.length ? "#fef2f2" : "#fff" }}>
                      <td style={td}>{r.rowNumber}</td>
                      <td style={td}>{r.errors.length ? "❌" : "✅"}</td>
                      <td style={td}>{norm(r.raw.name)}</td>
                      <td style={td}>{norm(r.raw.city)}</td>
                      <td style={td}>{norm(r.raw.category)}</td>
                      <td style={td}>{norm(r.raw.subcategory)}{norm(r.raw.tertiary) ? ` › ${norm(r.raw.tertiary)}` : ""}</td>
                      <td style={{ ...td, color: "#b91c1c" }}>{r.errors.join("؛ ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result && (
              <div style={{ marginTop: 12, padding: 12, background: result.fail ? "#fef3c7" : "#dcfce7", borderRadius: 8, fontWeight: 700 }}>
                تم الاستيراد — نجح: {result.ok} · فشل: {result.fail}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={btnGhost}>إغلاق</button>
              <button
                onClick={doImport}
                disabled={importing || validCount === 0}
                style={{ ...btnPrimary, opacity: importing || validCount === 0 ? 0.5 : 1 }}
              >
                {importing ? "جارٍ الاستيراد..." : `استيراد ${validCount} صف`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: 8, textAlign: "right", borderBottom: "1px solid #ddd", fontWeight: 700 };
const td: React.CSSProperties = { padding: 6, borderBottom: "1px solid #f0f0f0" };
const btnPrimary: React.CSSProperties = { background: "#660000", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { background: "#fff", color: "#660000", border: "1px solid #660000", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer" };
