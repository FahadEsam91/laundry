"use client";

import { useApp } from "./providers";
import { cx } from "./ui";

/** Saturday-first week, as people plan it in Iraq. */
export const WEEK = [6, 0, 1, 2, 3, 4, 5];
export const TIMES = Array.from({ length: 16 }, (_, i) => `${String(7 + i).padStart(2, "0")}:00`);

export function timeLabel(t: string, lang: string) {
  const h = Number(t.slice(0, 2));
  const h12 = ((h + 11) % 12) + 1;
  return lang === "ar" ? `${h12}:00 ${h < 12 ? "ص" : "م"}` : `${h12}:00 ${h < 12 ? "am" : "pm"}`;
}

/** Weekday chips + pickup time for recurring pickups. */
export function SchedulePicker({ days, time, onChange }: { days: number[]; time: string; onChange: (v: { days: number[]; time: string }) => void }) {
  const { t, lang } = useApp();
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-xs font-semibold text-ink-600">{t("repeat_days")}</div>
        <div className="flex flex-wrap gap-1.5">
          {WEEK.map((d) => {
            const on = days.includes(d);
            return (
              <button key={d} type="button" onClick={() => onChange({ days: on ? days.filter((x) => x !== d) : [...days, d], time })}
                className={cx("h-9 min-w-[3.25rem] rounded-xl border px-2 text-xs font-bold transition", on ? "border-brand-600 bg-brand-600 text-white shadow-glow" : "border-ink-200 bg-white text-ink-700 hover:border-brand-300")}>
                {t(`day_${d}` as any)}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-semibold text-ink-600">{t("repeat_time")}</div>
        <select value={time} onChange={(e) => onChange({ days, time: e.target.value })} className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm font-semibold">
          {TIMES.map((x) => <option key={x} value={x}>{timeLabel(x, lang)}</option>)}
        </select>
      </div>
    </div>
  );
}
