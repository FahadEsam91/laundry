"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up to `to` when it scrolls into view. */
export function CountUp({ to, decimals = 0, suffix = "", format }: { to: number; decimals?: number; suffix?: string; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || !to) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(to);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1400);
        setV(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);
  const n = Number(v.toFixed(decimals));
  return <span ref={ref} className="tabular">{format ? format(n) : n.toFixed(decimals)}{suffix}</span>;
}

/** Splits a headline into words that rise in one after another. */
export function WordsIn({ text, delay = 0, step = 70 }: { text: string; delay?: number; step?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className="word-in" style={{ animationDelay: `${delay + i * step}ms` }}>
          {w}&nbsp;
        </span>
      ))}
    </>
  );
}

/** Rising bubbles for brand backgrounds. */
export function Bubbles({ count = 10, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="nq-bubble"
          style={{ left: `${(i * 41 + 7) % 100}%`, width: 8 + ((i * 5) % 20), height: 8 + ((i * 5) % 20), animationDelay: `${(i % 6) * 0.9}s`, animationDuration: `${6 + (i % 5)}s` }}
        />
      ))}
    </div>
  );
}

/** Front-loading washing machine with a spinning drum, clothes and water. */
export function WasherArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 240" className={className} aria-hidden>
      <defs>
        <clipPath id="nq-door"><circle cx="100" cy="146" r="52" /></clipPath>
        <linearGradient id="nq-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E4FD6" />
          <stop offset="1" stopColor="#0B2E86" />
        </linearGradient>
        <linearGradient id="nq-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EEF3FB" />
        </linearGradient>
      </defs>
      <rect x="40" y="226" width="22" height="10" rx="4" fill="#0B2E86" opacity=".35" />
      <rect x="138" y="226" width="22" height="10" rx="4" fill="#0B2E86" opacity=".35" />
      <rect x="12" y="8" width="176" height="222" rx="30" fill="url(#nq-body)" />
      <path d="M12 60V38A30 30 0 0 1 42 8h116a30 30 0 0 1 30 30v22Z" fill="#E4ECFB" />
      <circle cx="42" cy="34" r="8" fill="#1A62EC" />
      <circle cx="66" cy="34" r="8" fill="#BFD3FA" />
      <rect x="108" y="24" width="60" height="20" rx="10" fill="#0B0E14" />
      <circle cx="120" cy="34" r="3.5" fill="#34D399"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite" /></circle>
      <rect x="130" y="31" width="30" height="6" rx="3" fill="#34D399" opacity=".8" />
      <circle cx="100" cy="146" r="66" fill="#D7E3F8" />
      <circle cx="100" cy="146" r="58" fill="#FFFFFF" />
      <circle cx="100" cy="146" r="52" fill="url(#nq-glass)" />
      <g clipPath="url(#nq-door)">
        <g className="drum-spin" style={{ transformOrigin: "100px 146px" }}>
          <rect x="66" y="112" width="34" height="26" rx="8" fill="#F59E0B" transform="rotate(-18 83 125)" />
          <rect x="104" y="118" width="30" height="22" rx="7" fill="#EC4899" transform="rotate(22 119 129)" />
          <rect x="78" y="150" width="36" height="22" rx="8" fill="#10B981" transform="rotate(10 96 161)" />
          <rect x="116" y="148" width="22" height="30" rx="7" fill="#FFFFFF" opacity=".9" transform="rotate(-25 127 163)" />
          <circle cx="70" cy="160" r="6" fill="#fff" opacity=".35" />
          <circle cx="128" cy="110" r="4" fill="#fff" opacity=".35" />
          <circle cx="98" cy="104" r="3" fill="#fff" opacity=".35" />
        </g>
        <path className="wave" d="M30 160 Q48 150 66 160 T102 160 T138 160 T174 160 T210 160 V210 H30Z" fill="#56A3FD" opacity=".55" />
        <path d="M58 116a48 48 0 0 1 40-20" stroke="#fff" strokeOpacity=".35" strokeWidth="6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
