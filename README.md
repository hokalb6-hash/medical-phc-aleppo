# نظام إدارة المراكز الطبية - Next.js + Supabase

مشروع احترافي متعدد المستويات لإدارة:
- السوبر آدمن
- المراكز الطبية
- العيادات
- المستخدمين
- الإدخال اليومي
- التقارير الشهرية

## المتطلبات
- Node.js 20+
- مشروع Supabase جاهز

## 1) إعداد متغيرات البيئة
انسخ ملف البيئة:

```bash
cp .env.example .env.local
```

ثم عبّئ القيم داخل `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2) إنشاء قاعدة البيانات في Supabase
من SQL Editor في Supabase نفّذ الملفات بالترتيب:
1. `supabase/schema.sql`
2. `supabase/owner_forms.sql`
3. `supabase/policies.sql`

## 3) إنشاء أول حساب Super Admin
أنشئ مستخدمًا من صفحة Authentication في Supabase ثم أضف له سجلًا في جدول `profiles`:

```sql
insert into public.profiles (id, full_name, role, center_id)
values ('USER_UUID_FROM_AUTH', 'Super Admin', 'super_admin', null);
```

## 4) تشغيل المشروع

```bash
npm install
npm run dev
```

افتح المتصفح على:
[http://localhost:3000](http://localhost:3000)

## فحص الجودة

```bash
npm run lint
npm run build
```

## ملاحظات مهمة
- إنشاء المركز من لوحة السوبر آدمن ينشئ حساب مدير المركز تلقائيًا عبر `SUPABASE_SERVICE_ROLE_KEY`.
- كل الصلاحيات محكومة عبر RLS وسياسات Supabase.
- صفحات لوحة التحكم ديناميكية وتعمل حسب دور المستخدم الحالي.
