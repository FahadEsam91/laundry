import { LegalPage, type Section } from "@/components/legal";

export const metadata = { title: "Terms of Service" };

// NOTE: template text — have it reviewed by a lawyer before launch.
const sections: Section[] = [
  {
    h: ["الخدمة", "The service"],
    p: [
      ["{app} منصة تربطك بمغاسل مستقلة ومندوبي توصيل. المغسلة مسؤولة عن تنفيذ خدمة التنظيف.", "{app} is a marketplace connecting you with independent laundries and delivery riders. The laundry is responsible for the cleaning service."],
      ["أوقات الجاهزية تقديرية وقد تتغير حسب نوع القطع وضغط العمل.", "Turnaround times are estimates and may vary with item type and demand."],
    ],
  },
  {
    h: ["الطلبات والأسعار", "Orders & pricing"],
    p: [
      ["الأسعار المعروضة في التطبيق عند تأكيد الطلب هي النهائية، شاملة الرسوم والخصومات الموضحة في ملخص الطلب.", "The price shown at checkout is final, including the fees and discounts listed in the order summary."],
      ["يمكن إلغاء الطلب مجاناً قبل استلامه من المندوب. المبالغ المدفوعة إلكترونياً تُعاد إلى المحفظة.", "Orders can be cancelled free of charge before pickup. Electronic payments are refunded to your wallet."],
    ],
  },
  {
    h: ["الاشتراكات", "Memberships"],
    p: [
      ["الاشتراكات تتجدد تلقائياً كل فترة ما لم تُلغِ التجديد. عند الإلغاء تبقى المزايا حتى نهاية الفترة المدفوعة.", "Memberships renew automatically each period unless you cancel renewal. If you cancel, benefits remain until the end of the paid period."],
      ["رسوم الفترة الحالية غير مستردة إلا إذا نص القانون على خلاف ذلك.", "Fees for the current period are non-refundable unless required by law."],
    ],
  },
  {
    h: ["العناية بالملابس والمسؤولية", "Garment care & liability"],
    p: [
      ["يرجى إفراغ الجيوب وإبلاغنا بأي قطع حساسة في الملاحظات.", "Please empty pockets and note any delicate items in the order notes."],
      ["في حال تلف أو فقدان قطعة، أبلغنا خلال 48 ساعة من التسليم وسنعالج المطالبة مع المغسلة وفق سياسة التعويض.", "If an item is damaged or lost, report it within 48 hours of delivery and we'll handle the claim with the laundry under our compensation policy."],
      ["ضمان {app}: إعادة التنظيف مجاناً إذا لم تكن راضياً عن النتيجة.", "{app} guarantee: free re-clean if you're not happy with the result."],
    ],
  },
  {
    h: ["الحساب", "Your account"],
    p: [
      ["أنت مسؤول عن صحة بياناتك وسرية رمز التحقق. يمكنك حذف حسابك في أي وقت من داخل التطبيق.", "You're responsible for accurate details and keeping verification codes private. You can delete your account at any time in the app."],
      ["يحق لنا إيقاف الحسابات المستخدمة في الاحتيال أو إساءة استخدام الخدمة.", "We may suspend accounts used for fraud or abuse of the service."],
    ],
  },
  {
    h: ["التواصل", "Contact"],
    p: [["الدعم الفني: {phone}", "Support: {phone}"]],
  },
];

export default function Terms() {
  return (
    <LegalPage
      title={["الشروط والأحكام", "Terms of Service"]}
      updated="2026-11-11"
      intro={["باستخدامك {app} فإنك توافق على هذه الشروط.", "By using {app} you agree to these terms."]}
      sections={sections}
    />
  );
}
