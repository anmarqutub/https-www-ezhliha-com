# نقل قاعدة البيانات إلى مشروع Supabase الجديد

مشروع Supabase الجديد: `knnlhimnxixzmegnpsja` (Seoul region)

## 📂 الملفات

| الملف | الوصف |
|---|---|
| `01_schema.sql` | كل الجداول + Enums + Functions + RLS Policies |
| `02_data.sql` | البيانات الحالية (تصنيفات، مدن، مزود، صور...) |
| `03_auth_trigger.sql` | Trigger لإنشاء profile تلقائيًا عند تسجيل مستخدم |
| `04_storage_bucket.sql` | إنشاء bucket `provider-images` + سياساته |

---

## 🚀 خطوات التشغيل

### 1) افتح SQL Editor في مشروعك الجديد
من لوحة Supabase → **SQL Editor** → **New query**

### 2) شغّل الملفات بالترتيب
انسخ محتوى كل ملف والصقه ثم اضغط **Run**:

1. `01_schema.sql` ← أولاً (ينشئ كل البنية)
2. `02_data.sql` ← ثانيًا (يدخل البيانات)
3. `03_auth_trigger.sql` ← ثالثًا (trigger التسجيل)
4. `04_storage_bucket.sql` ← رابعًا (التخزين)

⚠️ إذا ظهر خطأ "already exists" في ملف معين، تجاهله وأكمل.

---

## 🖼️ نقل صور المزودين (Storage)

البيانات الحالية تشير لصورتين في bucket `provider-images`. عليك تنزيلها من المشروع القديم ورفعها للجديد:

1. **تنزيل**: من Lovable Cloud (المشروع الحالي) → View Backend → Storage → `provider-images` → نزّل الصور.
2. **رفع**: من مشروعك الجديد → Storage → `provider-images` → ارفع نفس الصور بنفس أسماء الملفات.

---

## 👤 إنشاء حساب Admin جديد

بعد تشغيل SQL:

1. من لوحة Supabase الجديدة → **Authentication** → **Users** → **Add user** → **Create new user**
2. أدخل بريدك وكلمة المرور، وفعّل **Auto Confirm User**.
3. انسخ الـ `User UID`.
4. ارجع لـ SQL Editor وشغّل:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('ضع_الـ_UID_هنا', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

## ⚙️ تحديث متغيرات البيئة في الكود

عدّل ملف `.env` في جذر المشروع:

```env
VITE_SUPABASE_URL="https://knnlhimnxixzmegnpsja.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon key من Project Settings > API Keys>"
VITE_SUPABASE_PROJECT_ID="knnlhimnxixzmegnpsja"

SUPABASE_URL="https://knnlhimnxixzmegnpsja.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<نفس anon key>"
SUPABASE_PROJECT_ID="knnlhimnxixzmegnpsja"
SUPABASE_SERVICE_ROLE_KEY="<service_role key من API Keys>"
```

---

## ☁️ النشر على Cloudflare Pages/Workers

1. ارفع الكود إلى GitHub (من Lovable: قائمة + → GitHub).
2. في Cloudflare → **Workers & Pages** → **Create** → اربط GitHub repo.
3. Build command: `bun run build`
4. أضف نفس متغيرات `.env` أعلاه في **Settings → Variables and Secrets**.
5. انشر.

---

## ✅ التحقق

- سجّل دخول بحساب الـ admin الذي أنشأته.
- افتح `/admin` وتأكد أن البيانات تظهر.
- جرّب إنشاء كود شراء جديد ثم استخدامه للتسجيل.
