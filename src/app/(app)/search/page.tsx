"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Search, X, SearchX } from "lucide-react";
import { useApp } from "@/components/providers";
import { BottomNav, PartnerCard, TopBar } from "@/components/customer";
import { Empty, ServiceIcon, Skeleton, cx } from "@/components/ui";

function SearchInner() {
  const { t, L, services } = useApp();
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get("q") || "");
  const [debounced, setDebounced] = useState(q);
  const service = sp.get("service") || "";
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(id);
  }, [q]);
  const params = new URLSearchParams();
  if (debounced) params.set("q", debounced);
  if (service) params.set("service", service);
  const { data, isLoading } = useSWR(`/api/partners?${params}`);
  const svc = services.find((s) => s.slug === service);
  const setService = (s: string) => {
    const p = new URLSearchParams(sp.toString());
    if (s) p.set("service", s);
    else p.delete("service");
    router.replace(`/search?${p}`);
  };
  return (
    <>
      <TopBar title={svc ? L(svc, "name") : t("search")} />
      <div className="lg:mx-auto lg:max-w-7xl lg:px-8">
      <div className="px-4 pt-3 lg:max-w-2xl lg:px-0">
        <label className="flex h-12 items-center gap-2 rounded-2xl bg-ink-100 px-4">
          <Search className="h-5 w-5 text-ink-400" />
          <input autoFocus={!service} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_ph")} className="h-full flex-1 bg-transparent text-sm outline-none" />
          {q && (
            <button onClick={() => setQ("")} aria-label="clear">
              <X className="h-4 w-4 text-ink-500" />
            </button>
          )}
        </label>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 lg:flex-wrap lg:px-0">
        <button onClick={() => setService("")} className={cx("h-9 shrink-0 rounded-full border px-4 text-xs font-bold", !service ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white")}>
          {t("all")}
        </button>
        {services.map((s) => (
          <button key={s.slug} onClick={() => setService(s.slug)} className={cx("flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold", service === s.slug ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white")}>
            <ServiceIcon name={s.icon} className="h-4 w-4" /> {L(s, "name")}
          </button>
        ))}
      </div>
      {svc && <p className="px-4 pb-1 text-xs text-ink-500 lg:px-0 lg:text-sm">{L(svc, "desc")}</p>}
      {isLoading && [1, 2, 3, 4].map((i) => <Skeleton key={i} className="mx-4 my-3 h-20" />)}
      {data?.partners?.length === 0 && <Empty icon={<SearchX className="h-9 w-9" />} title={t("no_results")} />}
      <div className="lg:hidden">{data?.partners?.map((p: any) => <PartnerCard key={p.id} p={p} />)}</div>
      <div className="hidden grid-cols-3 gap-5 pt-4 lg:grid xl:grid-cols-4">{data?.partners?.map((p: any) => <PartnerCard key={p.id} p={p} variant="grid" />)}</div>
      </div>
      <BottomNav />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
