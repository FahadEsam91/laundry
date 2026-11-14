"use client";

import { useEffect, useRef } from "react";

/** Fades/slides its content in when it scrolls into view (once). `stagger` animates the direct children one by one. */
export function Reveal({ children, className = "", stagger, delay = 0, as: Tag = "div", ...rest }: { children: React.ReactNode; className?: string; stagger?: boolean; delay?: number; as?: any } & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return el.classList.add("is-in");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`${stagger ? "reveal-stagger" : "reveal"} ${className}`} style={delay ? ({ "--d": `${delay}ms` } as React.CSSProperties) : undefined} {...rest}>
      {children}
    </Tag>
  );
}
