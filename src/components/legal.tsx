import Link from "next/link";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/settings";

export type Section = { h: [string, string]; p: [string, string][] };

/** Shared layout for policy pages (server component, bilingual, readable inside the native apps' web views). */
export async function LegalPage({ title, updated, intro, sections }: { title: [string, string]; updated: string; intro: [string, string]; sections: Section[] }) {
  const lang = (await cookies()).get("nuqa_lang")?.value === "en" ? 1 : 0;
  const s = await getSettings();
  const fill = (x: string) => x.replaceAll("{app}", lang ? s.app_name : "نقاء").replaceAll("{phone}", s.support_phone);
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="text-sm font-semibold text-brand-600">← {lang ? "Back to app" : "العودة للتطبيق"}</Link>
        <h1 className="mt-6 text-3xl font-extrabold text-ink-900">{title[lang]}</h1>
        <p className="mt-2 text-sm text-ink-400">{lang ? "Last updated" : "آخر تحديث"}: {updated}</p>
        <p className="mt-6 leading-8 text-ink-700">{fill(intro[lang])}</p>
        {sections.map((sec, i) => (
          <section key={i} className="mt-8">
            <h2 className="text-lg font-bold text-ink-900">{i + 1}. {sec.h[lang]}</h2>
            <ul className="mt-3 list-disc space-y-2 ps-5 leading-7 text-ink-700">
              {sec.p.map((p, j) => <li key={j}>{fill(p[lang])}</li>)}
            </ul>
          </section>
        ))}
        <div className="mt-12 flex gap-4 border-t border-ink-100 pt-6 text-sm">
          <Link href="/privacy" className="font-semibold text-brand-600">{lang ? "Privacy Policy" : "سياسة الخصوصية"}</Link>
          <Link href="/terms" className="font-semibold text-brand-600">{lang ? "Terms of Service" : "الشروط والأحكام"}</Link>
        </div>
      </div>
    </main>
  );
}
