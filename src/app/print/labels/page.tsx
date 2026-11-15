"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/** Printable sheet of QR labels (A4, 4 × 12). Opened from Admin → QR labels. */
function Sheet() {
  const batch = useSearchParams().get("batch") || "";
  const [labels, setLabels] = useState<{ code: string; svg: string }[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/tags?batch=${encodeURIComponent(batch)}`);
      if (!res.ok) return setError(res.status === 403 || res.status === 401 ? "No access" : "Error");
      const { codes } = await res.json();
      const QR = (await import("qrcode")).default;
      setLabels(await Promise.all(codes.map(async (c: any) => ({ code: c.code, svg: await QR.toString(c.code, { type: "svg", margin: 0, errorCorrectionLevel: "M" }) }))));
    })();
  }, [batch]);
  if (error) return <p style={{ padding: 40, fontFamily: "sans-serif" }}>{error}</p>;
  if (!labels) return <p style={{ padding: 40, fontFamily: "sans-serif" }}>…</p>;
  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm 8mm; }
        body { margin: 0; background: #fff; }
        .sheet { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; font-family: Inter, sans-serif; }
        .label { height: 21mm; border: 0.2mm dashed #cbd5e1; border-radius: 2mm; display: flex; align-items: center; gap: 2mm; padding: 1.5mm 2mm; box-sizing: border-box; break-inside: avoid; }
        .label .qr { width: 17mm; height: 17mm; flex: none; }
        .label .qr svg { width: 100%; height: 100%; }
        .label b { display: block; font-size: 8pt; color: #1A62EC; }
        .label span { font-size: 7.5pt; font-weight: 700; letter-spacing: .02em; color: #0B0E14; }
        .bar { display: flex; justify-content: space-between; align-items: center; font-family: Inter, sans-serif; padding: 12px 0 16px; }
        @media print { .bar { display: none; } .label { border-color: #e5e7eb; } }
      `}</style>
      <div className="bar">
        <div>Nuqa labels · {batch} · {labels.length}</div>
        <button onClick={() => window.print()} style={{ padding: "8px 18px", borderRadius: 10, background: "#1A62EC", color: "#fff", fontWeight: 700, border: 0 }}>Print</button>
      </div>
      <div className="sheet">
        {labels.map((l) => (
          <div className="label" key={l.code}>
            <div className="qr" dangerouslySetInnerHTML={{ __html: l.svg }} />
            <div><b>نقاء · Nuqa</b><span>{l.code}</span></div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function PrintLabels() {
  return (
    <div style={{ padding: "0 8mm" }}>
      <Suspense>
        <Sheet />
      </Suspense>
    </div>
  );
}
