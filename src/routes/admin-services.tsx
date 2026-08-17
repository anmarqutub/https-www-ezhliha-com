import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin-services")({
  component: AdminServicesImportPage,
  head: () => ({
    meta: [
      { title: "رفع ملف الخدمات — إزهليها" },
      { name: "description", content: "رفع ملف إكسل لخدمات مقدمي الخدمة وتحديث وسوم الخدمات تلقائيًا في الموقع." },
      { property: "og:title", content: "رفع ملف الخدمات — إزهليها" },
      { property: "og:description", content: "رفع ملف إكسل لخدمات مقدمي الخدمة وتحديث وسوم الخدمات تلقائيًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = {
  rowNumber: number;
  providerName: string;
  providerCity: string;
  serviceName: string;
  description: string | null;
  price: string | null;
  sortOrder: number;
  providerId?: string;
  error?: string;
  status?: "new" | "duplicate";
};

const norm = (v: unknown) => String(v ?? "").trim();
const pick = (r: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    const found = Object.keys(r).find((c) => c.trim().replace(/\*$/, "").trim() === k);
    if (found && norm(r[found])) return norm(r[found]);
  }
  return "";
};

function AdminServicesImportPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<{ id: string; name: string; city: string }[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string>("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/" });
  }, [loading, user, isAdmin, navigate]);

  useEffect(() => {
    (async () => {
      const [pRes, sRes] = await Promise.all([
        supabase.from("providers").select("id,name,city_id"),
        supabase.from("services").select("provider_id,name"),
      ]);
      const { data: cities } = await supabase.from("cities").select("id,name_ar");
      const cityMap = new Map((cities ?? []).map((c) => [c.id as string, c.name_ar as string]));
      setProviders(
        ((pRes.data ?? []) as { id: string; name: string; city_id: string }[]).map((p) => ({
          id: p.id,
          name: p.name,
          city: cityMap.get(p.city_id) ?? "",
        })),
      );
      setExisting(
        new Set(
          ((sRes.data ?? []) as { provider_id: string; name: string }[]).map(
            (s) => `${s.provider_id}::${s.name.trim()}`,
          ),
        ),
      );
    })();
  }, [done]);

  const stats = useMemo(() => {
    const ok = rows.filter((r) => !r.error && r.status === "new").length;
    const dup = rows.filter((r) => !r.error && r.status === "duplicate").length;
    const bad = rows.filter((r) => r.error).length;
    return { ok, dup, bad };
  }, [rows]);

  const handleFile = async (file: File) => {
    setDone("");
    setFileName(file.name);
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheetName =
      wb.SheetNames.find((n) => n.trim() === "الخدمات" || n.trim().toLowerCase() === "services") ??
      wb.SheetNames[0];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });

    const parsed: Row[] = [];
    raw.forEach((r, i) => {
      // skip helper/instruction rows
      if (Object.values(r).some((v) => norm(v).startsWith("★"))) return;
      let providerName = pick(r, ["اسم المزود", "اسم مقدم الخدمة", "provider_name"]);
      let providerCity = pick(r, ["مدينة المزود", "المدينة", "provider_city"]);
      const combined = pick(r, ["المزود", "مقدم الخدمة"]);
      if (combined && (!providerName || !providerCity)) {
        const parts = combined.split(/\s*[—–-]\s*/);
        if (parts.length >= 2) {
          providerName = providerName || parts[0].trim();
          providerCity = providerCity || parts.slice(1).join(" — ").trim();
        } else {
          providerName = providerName || combined;
        }
      }
      const serviceName = pick(r, ["اسم الخدمة", "الخدمة", "name"]);
      if (!providerName && !serviceName) return;

      const row: Row = {
        rowNumber: i + 2,
        providerName,
        providerCity,
        serviceName,
        description: pick(r, ["وصف الخدمة", "الوصف", "description"]) || null,
        price: pick(r, ["سعر الخدمة", "السعر", "price"]) || null,
        sortOrder: Number(pick(r, ["الترتيب", "sort_order"]) || 0) || 0,
      };

      if (!providerName) row.error = "اسم مقدم الخدمة مطلوب";
      else if (!serviceName) row.error = "اسم الخدمة مطلوب";
      else {
        const matches = providers.filter((p) => p.name.trim() === providerName);
        const match =
          matches.length === 1
            ? matches[0]
            : matches.find((p) => !providerCity || p.city.trim() === providerCity);
        if (!match) row.error = "لم يتم العثور على مقدم الخدمة في الموقع";
        else {
          row.providerId = match.id;
          row.status = existing.has(`${match.id}::${serviceName}`) ? "duplicate" : "new";
        }
      }
      parsed.push(row);
    });
    setRows(parsed);
  };

  const upload = async () => {
    const toInsert = rows.filter((r) => !r.error && r.status === "new" && r.providerId);
    if (toInsert.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from("services").insert(
      toInsert.map((r) => ({
        provider_id: r.providerId!,
        name: r.serviceName,
        description: r.description,
        price: r.price,
        sort_order: r.sortOrder,
      })),
    );
    setBusy(false);
    if (error) {
      setDone(`تعذّر الرفع: ${error.message}`);
      return;
    }
    setDone(`تم إضافة ${toInsert.length} خدمة. ستظهر الوسوم مباشرة في بطاقات مقدمي الخدمة.`);
    setRows([]);
    setFileName("");
  };

  if (loading || !user || !isAdmin) return null;

  return (
    <div dir="rtl" style={{ maxWidth: 980, margin: "0 auto", padding: "28px 16px 60px" }}>
      <Link to="/admin" style={{ color: "#7b1e3c", fontSize: 13.5 }}>→ رجوع للوحة التحكم</Link>
      <h1 style={{ fontSize: 22, margin: "12px 0 6px", color: "#7b1e3c" }}>رفع ملف الخدمات</h1>
      <p style={{ fontSize: 13.5, color: "#6b6259", lineHeight: 1.9, margin: "0 0 18px" }}>
        ارفع ملف إكسل يحتوي ورقة باسم «الخدمات» بالأعمدة: اسم المزود · مدينة المزود · اسم الخدمة · وصف الخدمة · سعر
        الخدمة · الترتيب. بعد الرفع تتحدّث وسوم الخدمات (المربعات الصغيرة) داخل بطاقات مقدمي الخدمة تلقائيًا.
      </p>

      <label
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          border: "1.5px dashed #d9cbbd", borderRadius: 10, padding: "26px 16px",
          background: "#fdfaf6", cursor: "pointer", fontSize: 14, color: "#7b1e3c",
        }}
      >
        📄 {fileName || "اختر ملف الإكسل (xlsx)"}
        <input
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
        />
      </label>

      {done && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#f2f7f0", fontSize: 13.5 }}>{done}</div>
      )}

      {rows.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 16, margin: "18px 0 10px", fontSize: 13.5 }}>
            <span>جديدة: <b style={{ color: "#2f6b39" }}>{stats.ok}</b></span>
            <span>مكرّرة (تُتجاهل): <b>{stats.dup}</b></span>
            <span>أخطاء: <b style={{ color: "#a12626" }}>{stats.bad}</b></span>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid #eadfd3", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead style={{ background: "#faf5ef" }}>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>مقدم الخدمة</th>
                  <th style={th}>المدينة</th>
                  <th style={th}>الخدمة</th>
                  <th style={th}>السعر</th>
                  <th style={th}>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNumber} style={{ borderTop: "1px solid #f0e7dc" }}>
                    <td style={td}>{r.rowNumber}</td>
                    <td style={td}>{r.providerName}</td>
                    <td style={td}>{r.providerCity}</td>
                    <td style={td}>{r.serviceName}</td>
                    <td style={td}>{r.price ?? "—"}</td>
                    <td style={{ ...td, color: r.error ? "#a12626" : r.status === "duplicate" ? "#8a7a68" : "#2f6b39" }}>
                      {r.error ?? (r.status === "duplicate" ? "موجودة مسبقًا" : "ستُضاف")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => void upload()}
            disabled={busy || stats.ok === 0}
            style={{
              marginTop: 16, height: 44, padding: "0 26px", borderRadius: 6, border: "none",
              background: stats.ok === 0 ? "#c9b8a8" : "#7b1e3c", color: "#fff", fontSize: 14,
              cursor: stats.ok === 0 ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "جارٍ الرفع..." : `إضافة ${stats.ok} خدمة`}
          </button>
        </>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "right", padding: "10px 12px", fontWeight: 600, color: "#6b6259" };
const td: React.CSSProperties = { textAlign: "right", padding: "9px 12px" };
