"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useApp, useToast } from "./providers";
import { api, errText } from "@/lib/client";
import { cx } from "./ui";

/** Decode any image the browser can show (incl. iPhone photos), crop/scale it and re-encode as JPEG. */
async function prepare(file: File, kind: "logo" | "cover"): Promise<string> {
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
    const [maxW, maxH] = kind === "logo" ? [512, 512] : [1600, 1000];
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
