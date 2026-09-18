/** صياغة عربية بيضاء لعرض الأسعار كنطاق بدل رقم واحد */

function fmt(n: number) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function priceRangeText(
  from?: number | string | null,
  to?: number | string | null,
  fallbackText?: string | null,
): string {
  const a = from === null || from === undefined || from === "" ? null : Number(from);
  const b = to === null || to === undefined || to === "" ? null : Number(to);
  const okA = a !== null && Number.isFinite(a) && a > 0;
  const okB = b !== null && Number.isFinite(b) && b > 0;

  if (okA && okB && b! > a!) return `من ${fmt(a!)} إلى ${fmt(b!)} ريال`;
  if (okA) return `تبدأ الأسعار من ${fmt(a!)} ريال`;
  if (okB) return `تبدأ الأسعار من ${fmt(b!)} ريال`;
  if (fallbackText && fallbackText.trim()) return fallbackText.trim();
  return "السعر عند التواصل";
}

export const PRICE_NOTE = "قد تختلف الأسعار حسب تفاصيل الطلب والتاريخ.";
