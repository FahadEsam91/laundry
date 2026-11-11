"use client";

import Link from "next/link";
import { useEffect } from "react";
import useSWR from "swr";
import { Bell } from "lucide-react";
import { useApp } from "@/components/providers";
import { TopBar } from "@/components/customer";
import { Empty, cx } from "@/components/ui";
import { api, timeAgo } from "@/lib/client";

export default function NotificationsPage() {
  const { t, L, lang, refreshMe } = useApp();
  const { data } = useSWR("/api/notifications");
  useEffect(() => {
    if (data) api("/api/notifications", { body: {} }).then(() => refreshMe());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data]);
  const list: any[] = data?.notifications || [];
  return (
    <div className="lg:mx-auto lg:max-w-3xl lg:px-8">
      <TopBar title={t("notifications")} />
      {data && !list.length && <Empty icon={<Bell className="h-9 w-9" />} title={t("no_notifications")} />}
      <div className="divide-y divide-ink-100">
        {list.map((n) => {
          const inner = (
            <div className={cx("flex gap-3 p-4", !n.read && "bg-brand-50/50")}>
              <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-600")} />
              <div className="flex-1">
                <div className="text-sm font-bold">{L(n, "title")}</div>
                <div className="mt-0.5 text-sm text-ink-600">{L(n, "body")}</div>
                <div className="mt-1 text-xs text-ink-400">{timeAgo(n.created_at, lang)}</div>
              </div>
            </div>
          );
          return n.order_id ? <Link key={n.id} href={`/orders/${n.order_id}`} className="block">{inner}</Link> : <div key={n.id}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
