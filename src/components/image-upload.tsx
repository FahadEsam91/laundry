"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { useApp, useToast } from "./providers";
import { api, errText } from "@/lib/client";
import { cx } from "./ui";

/** Decode any image the browser can show (incl. iPhone photos), crop/scale it and re-encode as JPEG. */
async function prepare(file: File, kind: "logo" | "cover" | "photo"): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("invalid_image"));
      i.src = url;
    });
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (kind === "logo") { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
    const [maxW, maxH] = kind === "logo" ? [512, 512] : kind === "photo" ? [1600, 1600] : [1600, 1000];
    const scale = Math.min(1, maxW / sw, maxH / sh);
    const c = document.createElement("canvas");
    c.width = Math.round(sw * scale);
    c.height = Math.round(sh * scale);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ImageUpload({ value, onChange, kind, label }: { value?: string | null; onChange: (url: string | null) => void; kind: "logo" | "cover"; label: string }) {
  const { t, lang } = useApp();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await prepare(file, kind);
      const r = await api<{ url: string }>("/api/media", { body: { data } });
      onChange(r.url);
    } catch (e) {
      toast(errText(e, lang), "error");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-ink-600">{label}</div>
      <div className={cx("flex gap-3", kind === "cover" ? "flex-col" : "items-center")}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={cx(
            "relative flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-ink-200 bg-ink-50 text-ink-400 transition hover:border-brand-400 hover:text-brand-600",
            kind === "cover" ? "aspect-[2/1] w-full rounded-2xl" : "h-24 w-24 rounded-2xl",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7" />}
          {busy && <span className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></span>}
        </button>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-50">
            {value ? t("change_photo") : t("upload_photo")}
          </button>
          {value && (
            <button type="button" disabled={busy} onClick={() => onChange(null)} className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> {t("remove_photo")}
            </button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

/** Customer photos of their items (stains, damage, special care). Uploaded privately; returns the list of paths. */
export function PhotosPicker({ value, onChange, max = 6 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const { t, lang } = useApp();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [view, setView] = useState<number | null>(null);

  const pick = async (files: FileList | null) => {
    const list = Array.from(files || []).slice(0, max - value.length);
    if (input.current) input.current.value = "";
    if (!list.length) return;
    setBusy(list.length);
    const added: string[] = [];
    for (const f of list) {
      try {
        const data = await prepare(f, "photo");
        added.push((await api<{ url: string }>("/api/media", { body: { kind: "order", data } })).url);
      } catch (e) {
        toast(errText(e, lang), "error");
      }
      setBusy((n) => n - 1);
    }
    onChange([...value, ...added]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((u, i) => (
          <div key={u} className="relative h-20 w-20 overflow-hidden rounded-xl bg-ink-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-full w-full cursor-zoom-in object-cover" onClick={() => setView(i)} />
            <button type="button" onClick={() => onChange(value.filter((x) => x !== u))} className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white" aria-label={t("remove_photo")}>
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`b${i}`} className="flex h-20 w-20 items-center justify-center rounded-xl bg-ink-100"><Loader2 className="h-5 w-5 animate-spin text-brand-600" /></div>
        ))}
        {value.length + busy < max && (
          <button type="button" onClick={() => input.current?.click()} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-200 text-[11px] font-bold text-ink-500 hover:border-brand-400 hover:text-brand-600">
            <Camera className="h-5 w-5" /> {t("add_photos")}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => pick(e.target.files)} />
      {view !== null && <Lightbox photos={value} start={view} onClose={() => setView(null)} />}
    </div>
  );
}

/** Thumbnails that open a full-screen viewer. */
export function PhotoGallery({ photos, size = 72, className }: { photos: string[]; size?: number; className?: string }) {
  const [view, setView] = useState<number | null>(null);
  if (!photos?.length) return null;
  return (
    <>
      <div className={cx("flex flex-wrap gap-2", className)}>
        {photos.map((u, i) => (
          <button key={u} type="button" onClick={(e) => { e.stopPropagation(); setView(i); }} className="overflow-hidden rounded-xl bg-ink-100 ring-1 ring-ink-100 transition hover:opacity-90" style={{ width: size, height: size }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      {view !== null && <Lightbox photos={photos} start={view} onClose={() => setView(null)} />}
    </>
  );
}

function Lightbox({ photos, start, onClose }: { photos: string[]; start: number; onClose: () => void }) {
  const { dir } = useApp();
  const [i, setI] = useState(start);
  const go = (d: number) => setI((x) => (x + d + photos.length) % photos.length);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(dir === "rtl" ? -1 : 1);
      if (e.key === "ArrowLeft") go(dir === "rtl" ? 1 : -1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photos[i]} alt="" className="max-h-[88vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
      <button onClick={onClose} className="absolute end-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="close"><X className="h-6 w-6" /></button>
      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="previous">
            {dir === "rtl" ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="next">
            {dir === "rtl" ? <ChevronLeft className="h-6 w-6" /> : <ChevronRight className="h-6 w-6" />}
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white" dir="ltr">{i + 1} / {photos.length}</div>
        </>
      )}
    </div>,
    document.body,
  );
}
