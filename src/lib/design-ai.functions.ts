import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ brief: z.string().min(5).max(2000) });

export type DesignSuggestion = {
  summary: string;
  sections: Array<{ name: string; purpose: string; content: string }>;
  colors: Array<{ name: string; hex: string; usage: string }>;
  fonts: Array<{ role: string; family: string; note: string }>;
  notes: string[];
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "sections", "colors", "fonts", "notes"],
  properties: {
    summary: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "purpose", "content"],
        properties: {
          name: { type: "string" },
          purpose: { type: "string" },
          content: { type: "string" },
        },
      },
    },
    colors: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "hex", "usage"],
        properties: {
          name: { type: "string" },
          hex: { type: "string" },
          usage: { type: "string" },
        },
      },
    },
    fonts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["role", "family", "note"],
        properties: {
          role: { type: "string" },
          family: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    notes: { type: "array", items: { type: "string" } },
  },
} as const;

const SYSTEM = `أنتِ مصمّمة واجهات عربية تشتغل على موقع "أزهليها" لخدمات المناسبات في السعودية.
الموقع عربي RTL، لونه الأساسي عنابي #660000 وخلفية كريمية #e6e4d7.
اكتبي كل النصوص بلهجة سعودية نجدية خفيفة وواضحة ومؤنثة الخطاب.
أعطي اقتراحات عملية قابلة للتنفيذ: ترتيب أقسام الصفحة من أعلى لأسفل (٥-٨ أقسام) مع محتوى كل قسم،
لوحة ألوان (٤-٦ ألوان بصيغة HEX) منسجمة مع هوية الموقع، وخطوط عربية مناسبة (عنوان/نص/أرقام)،
وملاحظات تنفيذية قصيرة. لا تكرري كلام عام بدون قيمة.`;

export const generateDesignSuggestion = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<DesignSuggestion> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("خدمة الذكاء الاصطناعي غير مفعّلة حالياً.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        instructions: SYSTEM,
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: `وصف الصفحة المطلوبة:\n${data.brief}` }],
          },
        ],
        reasoning: { effort: "low", summary: "auto" },
        text: {
          format: {
            type: "json_schema",
            name: "design_suggestion",
            strict: true,
            schema: SCHEMA,
          },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      if (res.status === 402) throw new Error("انتهى رصيد الذكاء الاصطناعي في المساحة — حدّثي الرصيد من الإعدادات.");
      if (res.status === 429) throw new Error("الطلبات كثيرة الآن، جرّبي بعد شوي.");
      throw new Error(`تعذّر توليد الاقتراح (${res.status}) ${body.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.completed" && evt.response?.output_text) {
            if (!text) text = evt.response.output_text;
          }
        } catch {
          // ignore keep-alive / partial frames
        }
      }
    }

    if (!text.trim()) throw new Error("ما رجع أي اقتراح — جرّبي توضحين الوصف أكثر.");
    try {
      return JSON.parse(text) as DesignSuggestion;
    } catch {
      throw new Error("رجع الاقتراح بصيغة غير مفهومة، جرّبي مرة ثانية.");
    }
  });
