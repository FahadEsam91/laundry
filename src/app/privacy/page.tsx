import { LegalPage, type Section } from "@/components/legal";

export const metadata = { title: "Privacy Policy" };

// NOTE: template text — have it reviewed by a lawyer for each country you operate in before launch.
const sections: Section[] = [
  {
    h: ["البيانات التي نجمعها", "Data we collect"],
    p: [
      ["بيانات الحساب: الاسم ورقم الهاتف (والبريد الإلكتروني إن أضفته).", "Account data: your name and phone number (and email if you add it)."],
      ["العناوين وموقع الاستلام الذي تحدده على الخريطة لتنفيذ الطلبات.", "Addresses and the pickup location you pin on the map, to fulfil orders."],
      ["سجل الطلبات والقطع والتقييمات والمدفوعات (نوع وسيلة الدفع فقط — لا نخزن أرقام البطاقات؛ تتم معالجتها لدى مزود الدفع).", "Order history, items, ratings and payments (payment method type only — card numbers are never stored by us; they are processed by our payment provider)."],
      ["معرّفات الأجهزة لإرسال الإشعارات إذا فعّلتها.", "Device push tokens if you enable notifications."],
      ["للمندوبين: الموقع أثناء العمل لعرض التتبع المباشر للزبون.", "For riders: location while online, to show live tracking to customers."],
    ],
  },
  {
    h: ["كيف نستخدم بياناتك", "How we use your data"],
    p: [
      ["تنفيذ طلباتك: الاستلام والغسيل والتوصيل وخدمة العملاء.", "To fulfil your orders: pickup, cleaning, delivery and customer support."],
      ["إرسال رموز التحقق وتحديثات الطلبات والعروض (يمكنك إيقاف العروض في أي وقت).", "To send verification codes, order updates and offers (you can turn off offers at any time)."],
      ["منع الاحتيال وتحسين الخدمة وإعداد إحصاءات مجمعة لا تحدد هويتك.", "To prevent fraud, improve the service and produce aggregated statistics that don't identify you."],
    ],
  },
  {
    h: ["مع من نشارك البيانات", "Who we share data with"],
    p: [
      ["المغسلة التي تختارها والمندوب المكلف بطلبك: الاسم والهاتف والعنوان وتفاصيل الطلب فقط.", "The laundry you choose and the rider assigned to your order: only your name, phone, address and order details."],
      ["مزودو الخدمة: الاستضافة، الرسائل النصية، الإشعارات، ومعالجة الدفع — وفق عقود تلزمهم بحماية البيانات.", "Service providers: hosting, SMS, push notifications and payment processing — under contracts that require them to protect your data."],
      ["الجهات الرسمية عند وجود التزام قانوني فقط. لا نبيع بياناتك أبداً.", "Authorities only where legally required. We never sell your data."],
    ],
  },
  {
    h: ["الاحتفاظ والحذف", "Retention & deletion"],
    p: [
      ["يمكنك حذف حسابك في أي وقت من: حسابي ← حذف الحساب. نحذف بياناتك الشخصية فوراً.", "You can delete your account at any time from Account → Delete account. Your personal data is erased immediately."],
      ["نحتفظ بسجلات الطلبات بشكل مجهول الهوية للأغراض المحاسبية والضريبية فقط.", "Order records are kept in anonymized form for accounting and tax purposes only."],
      ["يمكنك تنزيل نسخة من بياناتك من: حسابي ← تنزيل بياناتي.", "You can download a copy of your data from Account → Download my data."],
    ],
  },
  {
    h: ["الأمان", "Security"],
    p: [
      ["الاتصال مشفر (HTTPS)، ورموز التحقق مخزنة بشكل مشفر ولمدة قصيرة، والوصول للبيانات محدود حسب الصلاحيات.", "Connections are encrypted (HTTPS), verification codes are stored hashed and short-lived, and data access is role-restricted."],
    ],
  },
  {
    h: ["الأطفال", "Children"],
    p: [["الخدمة غير موجهة لمن هم دون 16 عاماً.", "The service is not directed to children under 16."]],
  },
  {
    h: ["التواصل", "Contact"],
    p: [["لأي سؤال حول خصوصيتك تواصل معنا على {phone}.", "For any privacy question contact us at {phone}."]],
  },
];

export default function Privacy() {
  return (
    <LegalPage
      title={["سياسة الخصوصية", "Privacy Policy"]}
      updated="2026-11-11"
      intro={["توضح هذه السياسة كيف يجمع تطبيق {app} بياناتك ويستخدمها ويحميها.", "This policy explains how {app} collects, uses and protects your data."]}
      sections={sections}
    />
  );
}
