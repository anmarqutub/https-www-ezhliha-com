import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";

const HEAD_REQ = "FFC00000";
const HEAD_OPT = "FF1F4E79";

type Col = { key: string; width: number; req?: boolean };

function addSheet(wb: ExcelJS.Workbook, name: string, cols: Col[]) {
  const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.columns = cols.map((c) => ({ header: c.req ? `${c.key} *` : c.key, key: c.key, width: c.width }));
  const header = ws.getRow(1);
  header.height = 26;
  header.eachCell((cell, i) => {
    const c = cols[i - 1];
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11, name: "Arial" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c?.req ? HEAD_REQ : HEAD_OPT } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  return ws;
}

function listValidation(ws: ExcelJS.Worksheet, colLetter: string, formula: string, rows = 500) {
  for (let r = 2; r <= rows; r++) {
    ws.getCell(`${colLetter}${r}`).dataValidation = {
      type: "list", allowBlank: true, formulae: [formula], showErrorMessage: false,
    };
  }
}

function colLetter(i: number) {
  let s = "", n = i;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

const YN = (b: boolean) => (b ? "نعم" : "لا");

export async function buildTemplateWorkbook(): Promise<Blob> {
  const [citiesR, catsR, subsR, provsR, pkgsR, svcsR, brsR, imgsR] = await Promise.all([
    supabase.from("cities").select("id,name_ar,active").order("sort_order"),
    supabase.from("categories").select("id,name_ar").order("sort_order"),
    supabase.from("subcategories").select("id,name_ar,category_id,parent_id").order("sort_order"),
    supabase.from("providers").select("*").order("sort_order"),
    supabase.from("packages").select("*").order("sort_order"),
    supabase.from("services").select("*").order("sort_order"),
    supabase.from("branches").select("*").order("sort_order"),
    supabase.from("provider_images").select("provider_id,image_url,sort_order").order("sort_order"),
  ]);

  const cities = citiesR.data ?? [];
  const cats = catsR.data ?? [];
  const subs = subsR.data ?? [];
  const provs = provsR.data ?? [];

  const cityName = new Map(cities.map((c) => [c.id, c.name_ar]));
  const catName = new Map(cats.map((c) => [c.id, c.name_ar]));
  const subById = new Map(subs.map((s) => [s.id, s]));

  const imgsBy = new Map<string, string[]>();
  (imgsR.data ?? []).forEach((i) => {
    const arr = imgsBy.get(i.provider_id) ?? [];
    arr.push(i.image_url);
    imgsBy.set(i.provider_id, arr);
  });

  const mediaUrls = (v: unknown): string => {
    if (!Array.isArray(v)) return "";
    return v.map((m) => (typeof m === "string" ? m : (m as { url?: string })?.url ?? "")).filter(Boolean).join(", ");
  };

  const provKey = new Map<string, { name: string; city: string }>();
  provs.forEach((p) => provKey.set(p.id, { name: p.name, city: cityName.get(p.city_id) ?? "" }));

  const wb = new ExcelJS.Workbook();
  wb.creator = "إزهليها";

  // ---------- Instructions ----------
  const info = wb.addWorksheet("التعليمات", { views: [{ rightToLeft: true }] });
  info.columns = [{ width: 110 }];
  const lines = [
    "قالب إزهليها — رفع وتحديث البيانات",
    "",
    "1) الأعمدة ذات الرأس الأحمر والنجمة (*) إلزامية، والزرقاء اختيارية.",
    "2) هذا الملف مُصدَّر ومعبّأ بالبيانات الموجودة حاليًا في الموقع — أكمل عليه أو أضف صفوفًا جديدة.",
    "3) الرفع لا يحذف أي بيانات موجودة: الصف الجديد يُضاف، والصف المطابق (نفس اسم المزود + نفس المدينة) يتم تحديثه.",
    "4) ورقة «مقدمو الخدمة» هي الأساس. الباقات/الخدمات/الفروع تُربَط بالمزود عبر (اسم المزود + مدينة المزود).",
    "5) التصنيف الفرعي = المستوى الأول (مثال: صوالين التجميل). التصنيف الثانوي = المستوى الأعمق (مثال: تصفيف الشعر) وهو اختياري.",
    "6) الروابط المتعددة (صور/فيديو) تُفصل بفاصلة , بحد أقصى 5.",
    "7) الأرقام: يُقبل 05xxxxxxxx أو 9665xxxxxxxx.",
    "8) لا تحذف ورقة «_قوائم» المخفية — منها تعمل القوائم المنسدلة.",
  ];
  lines.forEach((t, i) => {
    const row = info.addRow([t]);
    row.getCell(1).alignment = { wrapText: true, horizontal: "right" };
    if (i === 0) row.getCell(1).font = { bold: true, size: 14, color: { argb: "FF660000" } };
  });

  // ---------- Lists sheet ----------
  const lists = wb.addWorksheet("_قوائم", { views: [{ rightToLeft: true }] });
  lists.state = "veryHidden";
  const cityNames = cities.filter((c) => c.active !== false).map((c) => c.name_ar);
  const catNames = cats.map((c) => c.name_ar);
  const subPrimary = subs.filter((s) => !s.parent_id).map((s) => s.name_ar);
  const subTertiary = subs.filter((s) => s.parent_id).map((s) => s.name_ar);
  const provLabels = provs.map((p) => p.name);
  const cols: string[][] = [cityNames, catNames, subPrimary, subTertiary, ["نعم", "لا"], provLabels];
  const maxLen = Math.max(...cols.map((c) => c.length), 1);
  for (let r = 0; r < maxLen; r++) {
    lists.addRow(cols.map((c) => c[r] ?? null));
  }
  const range = (i: number, len: number) => `_قوائم!$${colLetter(i)}$1:$${colLetter(i)}$${Math.max(len, 1)}`;
  const R_CITY = range(1, cityNames.length);
  const R_CAT = range(2, catNames.length);
  const R_SUB = range(3, subPrimary.length);
  const R_TER = range(4, subTertiary.length);
  const R_YN = range(5, 2);

  // ---------- Providers ----------
  const pCols: Col[] = [
    { key: "اسم المزود", width: 28, req: true },
    { key: "المدينة", width: 14, req: true },
    { key: "التصنيف الرئيسي", width: 20, req: true },
    { key: "التصنيف الفرعي", width: 20, req: true },
    { key: "التصنيف الثانوي", width: 20 },
    { key: "الوصف", width: 40 },
    { key: "السعر من", width: 11 },
    { key: "السعر إلى", width: 11 },
    { key: "وصف السعر", width: 16 },
    { key: "تكفي من (شخص)", width: 13 },
    { key: "تكفي إلى (شخص)", width: 13 },
    { key: "رقم واتساب", width: 16 },
    { key: "رقم الاتصال", width: 16 },
    { key: "إنستقرام", width: 18 },
    { key: "تيك توك", width: 18 },
    { key: "تويتر (X)", width: 18 },
    { key: "سناب شات", width: 18 },
    { key: "العنوان", width: 26 },
    { key: "رابط الموقع (خرائط جوجل)", width: 26 },
    { key: "رابط اللوقو", width: 26 },
    { key: "روابط الصور", width: 30 },
    { key: "روابط الفيديوهات", width: 30 },
    { key: "التقييم (0-5)", width: 11 },
    { key: "مميز؟", width: 9 },
    { key: "تاريخ انتهاء التمييز", width: 16 },
    { key: "الترتيب", width: 9 },
    { key: "نشط؟", width: 9 },
  ];
  const wsP = addSheet(wb, "مقدمو الخدمة", pCols);
  provs.forEach((p) => {
    const sub = subById.get(p.subcategory_id);
    const parent = sub?.parent_id ? subById.get(sub.parent_id) : null;
    wsP.addRow([
      p.name,
      cityName.get(p.city_id) ?? "",
      catName.get(sub?.category_id ?? "") ?? "",
      parent ? parent.name_ar : sub?.name_ar ?? "",
      parent ? sub?.name_ar ?? "" : "",
      p.description ?? "",
      p.price_from ?? "", p.price_to ?? "", p.price ?? "",
      p.people_from ?? "", p.people_to ?? "",
      p.whatsapp ?? "", p.contact_phone ?? "",
      p.instagram ?? "", p.tiktok ?? "", p.twitter ?? "", p.snapchat ?? "",
      p.address ?? "", p.map_url ?? "", p.logo_url ?? "",
      (imgsBy.get(p.id) ?? []).join(", "),
      mediaUrls(p.videos),
      p.rating ?? "",
      YN(p.is_featured),
      p.featured_until ?? "",
      p.sort_order ?? 0,
      YN(p.active),
    ]);
  });
  listValidation(wsP, "B", R_CITY);
  listValidation(wsP, "C", R_CAT);
  listValidation(wsP, "D", R_SUB);
  listValidation(wsP, "E", R_TER);
  listValidation(wsP, "X", R_YN);
  listValidation(wsP, "AA", R_YN);

  // ---------- children ----------
  const childBase: Col[] = [
    { key: "اسم المزود", width: 28, req: true },
    { key: "مدينة المزود", width: 14, req: true },
  ];

  const wsPkg = addSheet(wb, "الباقات", [
    ...childBase,
    { key: "اسم الباقة", width: 24, req: true },
    { key: "وصف الباقة", width: 40 },
    { key: "السعر", width: 14 },
    { key: "روابط الصور", width: 30 },
    { key: "روابط الفيديوهات", width: 30 },
    { key: "الترتيب", width: 9 },
  ]);
  (pkgsR.data ?? []).forEach((x) => {
    const pk = provKey.get(x.provider_id);
    if (!pk) return;
    wsPkg.addRow([pk.name, pk.city, x.name, x.description ?? "", x.price ?? "", mediaUrls(x.images), mediaUrls(x.videos), x.sort_order ?? 0]);
  });
  listValidation(wsPkg, "B", R_CITY);

  const wsSvc = addSheet(wb, "الخدمات", [
    ...childBase,
    { key: "اسم الخدمة", width: 24, req: true },
    { key: "وصف الخدمة", width: 40 },
    { key: "السعر", width: 14 },
    { key: "روابط الصور", width: 30 },
    { key: "روابط الفيديوهات", width: 30 },
    { key: "الترتيب", width: 9 },
  ]);
  (svcsR.data ?? []).forEach((x) => {
    const pk = provKey.get(x.provider_id);
    if (!pk) return;
    wsSvc.addRow([pk.name, pk.city, x.name, x.description ?? "", x.price ?? "", mediaUrls(x.images), mediaUrls(x.videos), x.sort_order ?? 0]);
  });
  listValidation(wsSvc, "B", R_CITY);

  const wsBr = addSheet(wb, "الفروع", [
    ...childBase,
    { key: "اسم الفرع", width: 24, req: true },
    { key: "العنوان", width: 34 },
    { key: "رابط الموقع (خرائط جوجل)", width: 30 },
    { key: "رقم الجوال", width: 16 },
    { key: "الترتيب", width: 9 },
  ]);
  (brsR.data ?? []).forEach((x) => {
    const pk = provKey.get(x.provider_id);
    if (!pk) return;
    wsBr.addRow([pk.name, pk.city, x.name, x.address ?? "", x.map_url ?? "", x.phone ?? "", x.sort_order ?? 0]);
  });
  listValidation(wsBr, "B", R_CITY);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function downloadTemplate() {
  const blob = await buildTemplateWorkbook();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ezhliha_template_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
