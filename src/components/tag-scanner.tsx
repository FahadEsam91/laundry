"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Camera, CheckCircle2, Keyboard, Loader2, Tag } from "lucide-react";
import { useApp, useToast } from "./providers";
import { Button, Sheet, cx } from "./ui";
import { api, errText } from "@/lib/client";

type Stage = "collect" | "receive" | "ready";

/** Camera QR reader (jsQR on video frames, works on iPhone Safari too) with manual entry as a fallback. */
function CameraReader({ onCode, paused, offText }: { onCode: (code: string) => void; paused: boolean; offText: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onCodeRef = useRef(onCode); // latest callback without restarting the camera
  onCodeRef.current = onCode;
  const [state, setState] = useState<"starting" | "on" | "off">("starting");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stop = false;
    (async () => {
      try {
        const jsQR = (await import("jsqr")).default;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stop || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        setState("on");
        const tick = () => {
          if (stop) return;
          const v = video.current, c = canvas.current;
          if (v && c && v.readyState >= 2 && !pausedRef.current) {
            const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * w) || 360;
            c.width = w; c.height = h;
            const ctx = c.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0, w, h);
            const r = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
            // the same label is ignored for 2.5s so one scan isn't counted twice
            if (r?.data && (r.data !== last.current.code || Date.now() - last.current.at > 2500)) {
              last.current = { code: r.data, at: Date.now() };
              onCodeRef.current(r.data);
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setState("off");
      }
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-950">
      <video ref={video} playsInline muted className="h-full w-full object-cover" />
      <canvas ref={canvas} className="hidden" />
      {state === "on" && <div className="pointer-events-none absolute inset-[18%] rounded-3xl border-4 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,.35)]" />}
      {state !== "on" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
          {state === "starting" ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Camera className="h-7 w-7" /><span className="px-6 text-center">{offText}</span></>}
        </div>
      )}
    </div>
  );
}

/** Scan item labels on an order: riders at pickup ("collect"), laundries on arrival ("receive") and when packed ("ready"). */
export function ScanSheet({ open, onClose, orderId, stage, title, onChange }: { open: boolean; onClose: () => void; orderId: number; stage: Stage; title: string; onChange?: () => void }) {
  const { t, L, lang } = useApp();
  const toast = useToast();
  const { data, mutate } = useSWR(open ? `/api/orders/${orderId}` : null);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState<string | null>(null); // new label waiting for its item type
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const items: any[] = data?.order?.items || [];
  const garments: any[] = data?.order?.garments || [];
  const col = stage === "collect" ? "collected_at" : stage === "receive" ? "received_at" : "ready_at";
  const done = garments.filter((g) => g[col]).length;

  const send = async (code: string, productId?: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api<any>("/api/scan", { body: { order_id: orderId, code, stage, product_id: productId } });
      setPending(null);
      setTyped("");
      setFlash(r.garment.name);
      setTimeout(() => setFlash(null), 1400);
      navigator.vibrate?.(60);
      mutate();
      onChange?.();
    } catch (e: any) {
      if (String(e?.code || e?.message) === "tag_item_required") setPending(code);
      else toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-800">
          <span className="flex items-center gap-2"><Tag className="h-4 w-4" /> {t("scanned_count", { x: `${done}${stage !== "collect" && garments.length ? ` / ${garments.length}` : ""}` })}</span>
          {flash && <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {flash}</span>}
        </div>
        {open && <CameraReader onCode={(c) => !pending && send(c)} paused={!!pending || busy} offText={t("camera_unavailable")} />}
        <p className="text-center text-xs text-ink-500">{t("scan_hint")}</p>
        <form onSubmit={(e) => { e.preventDefault(); if (typed.trim()) send(typed.trim()); }} className="flex gap-2">
          <div className="relative flex-1">
            <Keyboard className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase())} placeholder="NQ-XXXX-XXXX" dir="ltr" className="h-11 w-full rounded-xl border border-ink-200 ps-9 pe-3 text-sm font-bold tracking-wider outline-none focus:border-brand-500" />
          </div>
          <Button type="submit" loading={busy} disabled={!typed.trim()}>{t("scan_ok")}</Button>
        </form>
        {pending && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
            <div className="mb-2 text-sm font-bold text-amber-900">{t("scan_choose_item")} <span dir="ltr" className="text-xs">({pending})</span></div>
            <div className="grid grid-cols-2 gap-2">
              {items.map((i) => (
                <button key={i.id} onClick={() => send(pending, i.product_id)} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white p-2 text-start text-sm font-semibold hover:border-brand-400">
                  <span className="text-lg">{i.icon}</span> {L(i, "name")}
                </button>
              ))}
            </div>
          </div>
        )}
        {garments.length > 0 && (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-ink-100 p-2">
            {garments.map((g) => (
              <div key={g.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                <span className="text-lg">{g.icon}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{g.name}</span>
                <span dir="ltr" className="text-[10px] text-ink-400">{g.tag}</span>
                <span className={cx("h-2.5 w-2.5 rounded-full", g[col] ? "bg-emerald-500" : "bg-ink-200")} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Per-item progress for the customer (and staff): collected → at laundry → ready → delivered. */
export function GarmentList({ garments }: { garments: any[] }) {
  const { t } = useApp();
  if (!garments?.length) return null;
  const stages: [string, string][] = [["collected_at", "stage_collected"], ["received_at", "stage_received"], ["ready_at", "stage_ready"], ["delivered_at", "stage_delivered"]];
  return (
    <div className="space-y-2">
      {garments.map((g) => {
        const reached = stages.filter(([k]) => g[k]).length;
        const label = reached ? t(stages[reached - 1][1] as any) : "—";
        return (
          <div key={g.id} className="flex items-center gap-3 rounded-xl bg-ink-50 px-3 py-2">
            <span className="text-xl">{g.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{g.name}</div>
              <div className="mt-1 flex gap-1">{stages.map(([k], i) => <span key={k} className={cx("h-1.5 flex-1 rounded-full", i < reached ? "bg-emerald-500" : "bg-ink-200")} />)}</div>
            </div>
            <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", reached === 4 ? "bg-emerald-100 text-emerald-700" : "bg-brand-50 text-brand-700")}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
