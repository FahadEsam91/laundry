"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Share, Send, X } from "lucide-react";
import { useApp, useToast } from "./providers";
import { Button, Toggle, cx } from "./ui";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push-client";
import { api } from "@/lib/client";

export function usePush() {
  const { lang, t } = useApp();
  const toast = useToast();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getPushState().then(setState).catch(() => setState("unsupported"));
  }, []);
  const enable = async () => {
    setBusy(true);
    try {
      setState(await enablePush(lang));
    } catch {
      // e.g. browsers that block push services (Brave by default) or no network
      toast(t("error_generic"), "error");
      setState(await getPushState().catch(() => "unsupported" as PushState));
    } finally {
      setBusy(false);
    }
  };
  const disable = async () => {
    setBusy(true);
    setState(await disablePush());
    setBusy(false);
  };
  return { state, busy, enable, disable };
}

/** Full control used on account / settings screens. */
export function PushCard({ label }: { label?: string }) {
  const { t } = useApp();
  const toast = useToast();
  const { state, busy, enable, disable } = usePush();
  if (!state) return null;
  const on = state === "on";
  return (
    <div className="p-4">
      <div className="flex items-center gap-3">
        <span className={cx("flex h-10 w-10 items-center justify-center rounded-xl", on ? "bg-emerald-50 text-emerald-600" : "bg-ink-100 text-ink-600")}>
          {on ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{label || t("push_title")}</div>
          <div className="text-xs text-ink-500">
            {state === "on" ? t("push_on") : state === "denied" ? t("push_denied") : state === "unsupported" ? t("push_unsupported") : state === "ios-install" ? t("push_ios") : t("push_off")}
          </div>
        </div>
        {(state === "on" || state === "off") && <Toggle checked={on} disabled={busy} onChange={(v) => (v ? enable() : disable())} />}
      </div>
      {state === "ios-install" && <IOSHint />}
      {on && (
        <button
          onClick={async () => {
            const r = await api("/api/push/test", { body: {} });
            toast(r.sent ? t("push_sent_test") : t("error_generic"), r.sent ? "success" : "error");
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-xs font-bold text-ink-700"
        >
          <Send className="h-3.5 w-3.5" /> {t("push_test")}
        </button>
      )}
    </div>
  );
}

function IOSHint() {
  return (
    <div className="mt-3 flex items-center justify-center gap-3 rounded-xl bg-ink-50 p-3 text-ink-600">
      <Share className="h-5 w-5" /> <span className="text-lg">→</span> <span className="rounded-md border border-ink-300 px-2 py-0.5 text-xs font-bold">＋ Add to Home Screen</span>
    </div>
  );
}

/** Compact contextual prompt (order tracking). Hidden once enabled or dismissed. */
export function PushPrompt({ text }: { text?: string }) {
  const { t } = useApp();
  const { state, busy, enable } = usePush();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem("nuqa_push_prompt") === "x");
    } catch {}
  }, []);
  if (hidden || !state || !["off", "ios-install"].includes(state)) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem("nuqa_push_prompt", "x");
    } catch {}
  };
  return (
    <div className="animate-fade-up relative flex items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-500 p-4 text-white shadow-glow">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20"><BellRing className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1 text-sm font-semibold">{state === "ios-install" ? t("push_ios") : text || t("push_prompt_order")}</div>
      {state === "off" && (
        <Button size="sm" variant="dark" className="shrink-0 bg-white text-brand-700 hover:bg-white/90" loading={busy} onClick={enable}>
          {t("push_enable")}
        </Button>
      )}
      <button onClick={dismiss} className="absolute end-2 top-2 rounded-full p-1 text-white/70 hover:bg-white/10" aria-label="dismiss"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

/** Small header button for the partner / rider apps. */
export function PushHeaderButton({ label, dark }: { label: string; dark?: boolean }) {
  const { t } = useApp();
  const { state, busy, enable, disable } = usePush();
  if (!state || state === "unsupported") return null;
  const on = state === "on";
  return (
    <button
      onClick={() => (on ? disable() : state === "off" ? enable() : null)}
      disabled={busy}
      title={state === "denied" ? t("push_denied") : state === "ios-install" ? t("push_ios") : label}
      className={cx(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition",
        dark ? (on ? "bg-white/25 text-white" : "bg-white text-ink-900") : on ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
      )}
    >
      {on ? <BellRing className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{label}</span>
      <span>{on ? "✓" : ""}</span>
    </button>
  );
}
