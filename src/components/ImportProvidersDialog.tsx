import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

type City = { id: string; name_ar: string };
type Category = { id: string; name_ar: string };
type Sub = { id: string; name_ar: string; category_id: string; parent_id: string | null };

type RawRow = Record<string, unknown>;
type MediaItem = { url: string; thumbnail_url?: string | null };

type ParsedProvider = {
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
    price: string | null;
    people_from: number | null;
    people_to: number | null;
    whatsapp: string | null;
    contact_phone: string | null;
    instagram: string | null;
    tiktok: string | null;
    twitter: string | null;
    snapchat: string | null;
    address: string | null;
    map_url: string | null;
    logo_url: string | null;
    videos: MediaItem[];
    rating: number | null;
    is_featured: boolean;
    featured_until: string | null;
    sort_order: number;
    active: boolean;
  };
  imageUrls: string[];
};

type ParsedChild = {
  rowNumber: number;
  kind: "package" | "service" | "branch";
  provider_name: string;
  provider_city: string;
  errors: string[];
  payload?: Record<string, unknown>;
};

// ============ Arabic → internal-key header map ============
const HEADER_MAP: Record<string, string> = {
  // providers
  "اسم المزود": "name",
  "اسم المزود *": "name",
  "المدينة": "city",
  "المدينة *": "city",
  "مدينة المزود": "provider_city",
  "التصنيف الرئيسي": "category",
  "التصنيف الفرعي": "subcategory",
  "التصنيف الثانوي": "tertiary",
  "الوصف": "description",
  "السعر من": "price_from",
  "السعر إلى": "price_to",
  "السعر الى": "price_to",
  "وصف السعر": "price",
  "السعر": "price",
  "تكفي من (شخص)": "people_from",
  "تكفي من": "people_from",
  "تكفي إلى (شخص)": "people_to",
  "تكفي الى (شخص)": "people_to",
  "تكفي إلى": "people_to",
  "تكفي الى": "people_to",
  "رقم واتساب": "whatsapp",
  "واتساب": "whatsapp",
  "رقم الاتصال": "contact_phone",
  "إنستقرام": "instagram",
  "انستقرام": "instagram",
  "إنستغرام": "instagram",
  "انستغرام": "instagram",
  "تيك توك": "tiktok",
  "تيكتوك": "tiktok",
  "تويتر (x)": "twitter",
  "تويتر (X)": "twitter",
  "تويتر": "twitter",
  "سناب شات": "snapchat",
  "سناب": "snapchat",
  "العنوان": "address",
  "رابط الموقع (خرائط جوجل)": "map_url",
  "رابط الموقع": "map_url",
  "رابط اللوقو": "logo_url",
  "روابط الصور": "image_urls",
  "روابط الفيديوهات": "video_urls",
  "التقييم (0-5)": "rating",
  "التقييم": "rating",
  "مميز؟": "is_featured",
  "مميز": "is_featured",
  "تاريخ انتهاء التمييز": "featured_until",
  "الترتيب": "sort_order",
  "نشط؟": "active",
  "نشط": "active",
  // child rows
  "اسم الباقة": "child_name",
  "اسم الباقة *": "child_name",
  "وصف الباقة": "description",
  "اسم الخدمة": "child_name",
  "اسم الخدمة *": "child_name",
  "وصف الخدمة": "description",
  "اسم الفرع": "child_name",
  "اسم الفرع *": "child_name",
  "اسم العنصر": "child_name",
  "اسم العنصر *": "child_name",
  "رقم الجوال": "phone",
  "نوع الصف": "row_type",
  "نوع الصف *": "row_type",
};

function stripStar(h: string): string {
  return String(h ?? "")
    .replace(/[\u200f\u200e]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s*٭★]+$/g, "")
    .trim();
}

function stripStarRow(raw: RawRow): RawRow {
  const out: RawRow = {};
  for (const [k, v] of Object.entries(raw)) {
    const nk = stripStar(k);
    if (out[nk] === undefined || out[nk] === "" || out[nk] === null) out[nk] = v;
  }
  return out;
}

function normalizeHeader(h: string): string {
  // strip trailing required-marker (*, ٭, ★) and collapse whitespace
  const s = stripStar(h);
  const key = HEADER_MAP[s] ?? HEADER_MAP[s.toLowerCase()] ?? s;
  return key;
}



function remapRow(raw: RawRow): RawRow {
  const out: RawRow = {};
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalizeHeader(k);
    // don't overwrite an existing populated key
    if (out[nk] === undefined || out[nk] === "" || out[nk] === null) {
      out[nk] = v;
    }
  }
  return out;
}

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
  return s === "نعم" || s === "yes" || s === "true" || s === "1" || s === "y";
}
function splitLinks(v: unknown): string[] {
  return norm(v).split(/[,\n]/).map((u) => u.trim()).filter(Boolean);
}
function toMedia(v: unknown): MediaItem[] {
  return splitLinks(v).slice(0, 5).map((url) => ({ url }));
}

function normalizeSaudiPhone(v: unknown): string | null {
  let s = norm(v)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\D/g, "");
  if (!s) return null;
  if (s.startsWith("00966")) s = s.slice(2);
  if (s.length === 13 && s.startsWith("9660")) s = "966" + s.slice(4);
  if (s.length === 10 && s.startsWith("05")) s = "966" + s.slice(1);
  if (s.length === 9 && s.startsWith("5")) s = "966" + s;
  return s;
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
  const [parsed, setParsed] = useState<ParsedProvider[] | null>(null);
  const [children, setChildren] = useState<ParsedChild[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number; childOk: number; childFail: number } | null>(null);

  const cityByName = new Map(cities.map((c) => [c.name_ar.trim(), c.id]));
  const catByName = new Map(cats.map((c) => [c.name_ar.trim(), c.id]));

  function findSub(catId: string, subName: string, tertiaryName: string): { id?: string; error?: string } {
    const primaryMatches = subs.filter((s) => s.category_id === catId && (s.parent_id === null) && s.name_ar.trim() === subName.trim());
    if (primaryMatches.length === 0) {
      // تسامح: لو كتب المستخدم تصنيفًا ثانويًا داخل عمود التصنيف الفرعي
      const asTertiary = subs.find((s) => s.category_id === catId && s.parent_id !== null && s.name_ar.trim() === subName.trim());
      if (asTertiary && !tertiaryName) return { id: asTertiary.id };
      return { error: `التصنيف الفرعي "${subName}" غير موجود` };
    }
    const primary = primaryMatches[0];

    if (!tertiaryName) return { id: primary.id };
    const tertiary = subs.find((s) => s.parent_id === primary.id && s.name_ar.trim() === tertiaryName.trim());
    if (!tertiary) return { error: `التصنيف الثانوي "${tertiaryName}" غير موجود تحت "${subName}"` };
    return { id: tertiary.id };
  }

  function readSheet(wb: XLSX.WorkBook, names: string[]): RawRow[] {
    for (const n of names) {
      if (wb.SheetNames.includes(n)) {
        const ws = wb.Sheets[n];
        return XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "", raw: false });
      }
    }
    return [];
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", raw: false });

    // --- Single-sheet mode: split by "نوع الصف" ---
    const singleRows = readSheet(wb, ["البيانات", "data"]);
    let providerRowsSingle: RawRow[] = [];
    let packageRowsSingle: RawRow[] = [];
    let serviceRowsSingle: RawRow[] = [];
    let branchRowsSingle: RawRow[] = [];
    if (singleRows.length > 0) {
      for (const r of singleRows) {
        const t = norm(r["نوع الصف *"] ?? r["نوع الصف"] ?? r["row_type"]);
        const providerName = norm(r["اسم المزود *"] ?? r["اسم المزود"]);
        const providerCity = norm(r["المدينة *"] ?? r["المدينة"]);
        const itemName = norm(r["اسم العنصر *"] ?? r["اسم العنصر"]);
        if (!t && !providerName) continue;
        if (t === "مزود" || t === "provider") {
          providerRowsSingle.push(r);
        } else if (t === "باقة" || t === "package") {
          packageRowsSingle.push({ ...r, "اسم المزود": providerName, "مدينة المزود": providerCity, "اسم الباقة": itemName });
        } else if (t === "خدمة" || t === "service") {
          serviceRowsSingle.push({ ...r, "اسم المزود": providerName, "مدينة المزود": providerCity, "اسم الخدمة": itemName });
        } else if (t === "فرع" || t === "branch") {
          branchRowsSingle.push({ ...r, "اسم المزود": providerName, "مدينة المزود": providerCity, "اسم الفرع": itemName });
        }
      }
    }

    // --- Providers sheet (multi-sheet template) or single-sheet split ---
    const providerRows = providerRowsSingle.length > 0 ? providerRowsSingle : readSheet(wb, ["مقدمو الخدمة", "providers"]);

    const out: ParsedProvider[] = providerRows.map((rawIn, idx) => {
      const raw = remapRow(rawIn);
      const rowNumber = idx + 2;
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

      const imageUrls = splitLinks(raw.image_urls);
      const videos = toMedia(raw.video_urls);

      const p: ParsedProvider = { rowNumber, raw, errors, imageUrls };
      if (errors.length === 0 && cityId && subId) {
        p.payload = {
          name: norm(raw.name),
          city_id: cityId,
          subcategory_id: subId,
          description: norm(raw.description) || null,
          price_from: toNum(raw.price_from),
          price_to: toNum(raw.price_to),
          price: norm(raw.price) || null,
          people_from: toNum(raw.people_from),
          people_to: toNum(raw.people_to),
          whatsapp: normalizeSaudiPhone(raw.whatsapp),
          contact_phone: normalizeSaudiPhone(raw.contact_phone),
          instagram: norm(raw.instagram) || null,
          tiktok: norm(raw.tiktok) || null,
          twitter: norm(raw.twitter) || null,
          snapchat: norm(raw.snapchat) || null,
          address: norm(raw.address) || null,
          map_url: norm(raw.map_url) || null,
          logo_url: norm(raw.logo_url) || null,
          videos,
          rating,
          is_featured: toBool(raw.is_featured),
          featured_until: norm(raw.featured_until) || null,
          sort_order: toNum(raw.sort_order) ?? 0,
          active: norm(raw.active) ? toBool(raw.active) : true,
        };
      }
      return p;
    });

    setParsed(out);

    // --- Children sheets (packages / services / branches) ---
    const childList: ParsedChild[] = [];

    const pushChildren = (
      rows: RawRow[],
      kind: "package" | "service" | "branch",
      buildPayload: (raw: RawRow) => Record<string, unknown>
    ) => {
      rows.forEach((rawIn, idx) => {
        const raw = remapRow(rawIn);
        const rowNumber = idx + 2;
        const errors: string[] = [];
        const providerName = "";
        const plain = stripStarRow(rawIn);
        // New template uses a single "المزود" column shaped "الاسم — المدينة".
        // Multi-sheet template uses "اسم المزود" + "مدينة المزود". Support both.
        const combined = norm(plain["المزود"] ?? "");
        let rawProviderName = norm(plain["اسم المزود"] ?? plain["provider_name"] ?? "");
        let rawProviderCity = norm(plain["مدينة المزود"] ?? plain["provider_city"] ?? "");
        if (combined && (!rawProviderName || !rawProviderCity)) {
          const parts = combined.split(/\s*[—–-]\s*/);
          if (parts.length >= 2) {
            rawProviderName = rawProviderName || parts[0].trim();
            rawProviderCity = rawProviderCity || parts.slice(1).join(" — ").trim();
          }
        }
        const childName = norm(
          plain[kind === "package" ? "اسم الباقة" : kind === "service" ? "اسم الخدمة" : "اسم الفرع"] ??
          plain["اسم العنصر"] ?? plain["name"] ?? ""
        );


        if (!rawProviderName) errors.push('العمود "اسم المزود" مطلوب');
        if (!rawProviderCity) errors.push('العمود "مدينة المزود" مطلوب');
        if (!childName) errors.push(`العمود "${kind === "package" ? "اسم الباقة" : kind === "service" ? "اسم الخدمة" : "اسم الفرع"}" مطلوب`);

        // Skip fully-empty rows silently
        if (!rawProviderName && !rawProviderCity && !childName) return;

        const child: ParsedChild = {
          rowNumber, kind,
          provider_name: rawProviderName,
          provider_city: rawProviderCity,
          errors,
        };
        if (errors.length === 0) {
          child.payload = { ...buildPayload(raw), name: childName };
        }
        // stash raw for provider matching
        // @ts-expect-error attach
        child._providerName = rawProviderName;
        // @ts-expect-error attach
        child._providerCity = rawProviderCity;
        childList.push(child);
        void providerName;
      });
    };

    pushChildren(packageRowsSingle.length > 0 ? packageRowsSingle : readSheet(wb, ["الباقات", "packages"]), "package", (raw) => ({
      description: norm(raw.description) || null,
      price: norm(raw.price) || null,
      sort_order: toNum(raw.sort_order) ?? 0,
      images: toMedia(raw.image_urls),
      videos: toMedia(raw.video_urls),
    }));
    pushChildren(serviceRowsSingle.length > 0 ? serviceRowsSingle : readSheet(wb, ["الخدمات", "services"]), "service", (raw) => ({
      description: norm(raw.description) || null,
      price: norm(raw.price) || null,
      sort_order: toNum(raw.sort_order) ?? 0,
      images: toMedia(raw.image_urls),
      videos: toMedia(raw.video_urls),
    }));
    pushChildren(branchRowsSingle.length > 0 ? branchRowsSingle : readSheet(wb, ["الفروع", "branches"]), "branch", (raw) => ({
      address: norm(raw.address) || null,
      map_url: norm(raw.map_url) || null,
      phone: normalizeSaudiPhone(raw.phone),
      sort_order: toNum(raw.sort_order) ?? 0,
    }));

    setChildren(childList);
  }

  async function doImport() {
    if (!parsed) return;
    const valid = parsed.filter((r) => r.payload);
    if (valid.length === 0) return;
    setImporting(true);
    let ok = 0, fail = 0, updated = 0, childOk = 0, childFail = 0;

    // provider_name+city → provider_id (for child linking)
    const providerIdBy = new Map<string, string>();

    for (const r of valid) {
      const payload = r.payload!;
      const cityName = cities.find((c) => c.id === payload.city_id)?.name_ar ?? "";
      // Never wipe existing data: update the matching provider (same name + city), else insert.
      const { data: existing } = await supabase.from("providers")
        .select("id").eq("name", payload.name).eq("city_id", payload.city_id).maybeSingle();

      let providerId: string | null = null;
      if (existing?.id) {
        const { error } = await supabase.from("providers").update(payload).eq("id", existing.id);
        if (error) { fail++; continue; }
        providerId = existing.id;
        updated++;
      } else {
        const { data, error } = await supabase.from("providers").insert(payload).select("id").single();
        if (error || !data) { fail++; continue; }
        providerId = data.id;
        ok++;
      }

      providerIdBy.set(`${payload.name}::${cityName}`, providerId);

      if (r.imageUrls.length > 0) {
        const { data: existingImgs } = await supabase.from("provider_images")
          .select("image_url").eq("provider_id", providerId);
        const have = new Set((existingImgs ?? []).map((i) => i.image_url));
        const fresh = r.imageUrls.filter((u) => !have.has(u));
        if (fresh.length > 0) {
          const base = existingImgs?.length ?? 0;
          await supabase.from("provider_images")
            .insert(fresh.map((url, i) => ({ provider_id: providerId!, image_url: url, sort_order: base + i })));
        }
      }
    }

    // Import children by matching provider name + city
    for (const c of children) {
      if (!c.payload) { childFail++; continue; }
      const key = `${c.provider_name}::${c.provider_city}`;
      let providerId = providerIdBy.get(key);
      if (!providerId) {
        // Try to find existing provider in DB
        const cityId = cityByName.get(c.provider_city);
        if (cityId) {
          const { data } = await supabase.from("providers")
            .select("id").eq("name", c.provider_name).eq("city_id", cityId).maybeSingle();
          if (data?.id) { providerId = data.id; providerIdBy.set(key, providerId); }
        }
      }
      if (!providerId) { childFail++; continue; }
      const table = c.kind === "package" ? "packages" : c.kind === "service" ? "services" : "branches";
      const row = { ...c.payload, provider_id: providerId } as { name: string; provider_id: string; [k: string]: unknown };
      // Update the matching child (same provider + same name) instead of duplicating it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: exist } = await (supabase.from(table) as any)
        .select("id").eq("provider_id", providerId).eq("name", row.name).maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = exist?.id
        ? await (supabase.from(table) as any).update(row).eq("id", exist.id)
        : await (supabase.from(table) as any).insert(row);
      if (error) childFail++; else childOk++;
    }

    setImporting(false);
    setResult({ ok, fail, updated, childOk, childFail });
    if (ok > 0 || updated > 0 || childOk > 0) onDone();
  }


  const validCount = parsed?.filter((r) => r.payload).length ?? 0;
  const errorCount = parsed?.filter((r) => r.errors.length > 0).length ?? 0;
  const childValid = children.filter((c) => c.payload).length;
  const childErr = children.filter((c) => c.errors.length > 0).length;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: 22, maxWidth: 960, width: "100%", maxHeight: "88vh", overflow: "auto" }} dir="rtl">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>📥 رفع البيانات من ملف Excel</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ background: "#f9f7ef", border: "1px solid #e6e0c8", borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 13, lineHeight: 1.9 }}>
          <strong>الخطوات:</strong>
          <ol style={{ margin: "6px 0 0", paddingInlineStart: 20 }}>
            <li>حمّل القالب العربي واعبّي البيانات.</li>
            <li>القالب الموحّد يستخدم <b>ورقة واحدة</b> فيها عمود «نوع الصف» (مزود / باقة / خدمة / فرع).</li>
            <li>الباقات/الخدمات/الفروع تُربَط بالمزود عبر (اسم المزود + المدينة).</li>
            <li>ارفع الملف وراجع المعاينة قبل التأكيد.</li>
          </ol>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
            <a
              href="/ezhliha_import_template_v4_single.xlsx"
              style={{ color: "#660000", fontWeight: 700, textDecoration: "underline" }}
            >
              ⬇️ تحميل القالب الموحّد (ورقة واحدة)
            </a>
            <a
              href="/ezhliha_import_template_v2.xlsx"
              style={{ color: "#888", fontWeight: 600, textDecoration: "underline", fontSize: 12 }}
            >
              (القالب القديم متعدد الأوراق)
            </a>
          </div>
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
            <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 14, fontWeight: 700, flexWrap: "wrap" }}>
              <span style={{ color: "#16a34a" }}>✅ مزودون صالحون: {validCount}</span>
              <span style={{ color: "#dc2626" }}>❌ مزودون بأخطاء: {errorCount}</span>
              <span style={{ color: "#666" }}>المجموع: {parsed.length}</span>
            </div>
            {children.length > 0 && (
              <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 13, fontWeight: 700, flexWrap: "wrap", color: "#555" }}>
                <span>📦 عناصر تابعة (باقات/خدمات/فروع): {children.length}</span>
                <span style={{ color: "#16a34a" }}>✅ صالحة: {childValid}</span>
                <span style={{ color: "#dc2626" }}>❌ بأخطاء: {childErr}</span>
              </div>
            )}

            <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead style={{ background: "#f5f3eb", position: "sticky", top: 0 }}>
                  <tr>
                    <th style={th}>#</th><th style={th}>الحالة</th><th style={th}>الاسم</th>
                    <th style={th}>المدينة</th><th style={th}>التصنيف</th><th style={th}>الفرعي</th><th style={th}>واتساب</th>
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
                      <td style={{ ...td, direction: "ltr" }}>{normalizeSaudiPhone(r.raw.whatsapp) ?? "—"}</td>
                      <td style={{ ...td, color: "#b91c1c" }}>{r.errors.join("؛ ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result && (
              <div style={{ marginTop: 12, padding: 12, background: result.fail || result.childFail ? "#fef3c7" : "#dcfce7", borderRadius: 8, fontWeight: 700 }}>
                تم الاستيراد — المزودون: نجح {result.ok} · فشل {result.fail}
                {children.length > 0 && <> · العناصر التابعة: نجح {result.childOk} · فشل {result.childFail}</>}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={btnGhost}>إغلاق</button>
              <button
                onClick={doImport}
                disabled={importing || validCount === 0}
                style={{ ...btnPrimary, opacity: importing || validCount === 0 ? 0.5 : 1 }}
              >
                {importing ? "جارٍ الاستيراد..." : `استيراد ${validCount} مزود${childValid ? ` + ${childValid} عنصر تابع` : ""}`}
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
