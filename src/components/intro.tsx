"use client";

import { useEffect, useState } from "react";
import { useApp } from "./providers";

import { INTRO_KEY as KEY } from "@/lib/intro-boot";
const DURATION = 2600;

/**
 * Brand intro, shown on the first page of each browser session. It is server-rendered so it covers the page from
 * the first paint; an inline script in <head> hides it for returning visits and for reduced-motion users.
 */
export function Intro() {
  const { lang } = useApp();
  const [phase, setPhase] = useState<"on" | "out" | "gone">("on");

  useEffect(() => {
    if (document.documentElement.classList.contains("nq-intro-seen")) return setPhase("gone");
    try { sessionStorage.setItem(KEY, "1"); } catch {}
    document.documentElement.style.overflow = "hidden";
    const out = setTimeout(() => setPhase("out"), DURATION);
    return () => clearTimeout(out);
  }, []);

  useEffect(() => {
    if (phase !== "out") return;
    document.documentElement.style.overflow = "";
    const gone = setTimeout(() => setPhase("gone"), 850);
    return () => clearTimeout(gone);
  }, [phase]);

  if (phase === "gone") return null;
  const name = lang === "ar" ? "نقاء" : "Nuqa";
  return (
    <div className={`nq-intro ${phase === "out" ? "nq-intro-out" : ""}`} onClick={() => setPhase("out")} role="presentation" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="nq-bubble" style={{ left: `${(i * 37) % 100}%`, width: 6 + ((i * 7) % 18), height: 6 + ((i * 7) % 18), animationDelay: `${(i % 7) * 0.28}s`, animationDuration: `${2.6 + (i % 4) * 0.5}s` }} />
      ))}
      <div className="nq-stage">
        <div className="nq-ripples"><i /><i /><i /></div>
        <svg className="nq-drop" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="nq-intro-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#56A3FD" />
              <stop offset="1" stopColor="#144DD8" />
            </linearGradient>
          </defs>
          <rect className="nq-tile" width="48" height="48" rx="14" fill="url(#nq-intro-g)" />
          <path d="M24 9c-5.5 7.2-9.5 12.6-9.5 17.6a9.5 9.5 0 0 0 19 0C33.5 21.6 29.5 16.2 24 9Z" fill="white" />
          <path className="nq-shine" d="M19.5 27.5a4.5 4.5 0 0 0 4.5 4.5" stroke="#1A62EC" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </svg>
        <div className="nq-word"><span>{name}</span></div>
        <div className="nq-tag">{lang === "ar" ? "غسيل • كوي • توصيل لباب بيتك" : "Wash • Iron • Delivered to your door"}</div>
      </div>
      <div className="nq-bar"><i /></div>
      <button className="nq-skip" onClick={(e) => { e.stopPropagation(); setPhase("out"); }}>{lang === "ar" ? "تخطي" : "Skip"}</button>
    </div>
  );
}
