"use client";

import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { useApp } from "@/components/providers";
import { AddressForm, AddressIcon, TopBar } from "@/components/customer";
import { Button, Empty, Sheet } from "@/components/ui";
import { api } from "@/lib/client";

export default function AddressesPage() {
  const { t, me, refreshMe } = useApp();
  const [open, setOpen] = useState(false);
  const list: any[] = me?.addresses || [];
  return (
    <div className="lg:mx-auto lg:max-w-3xl lg:px-8">
      <TopBar title={t("addresses")} back="/account" />
      {me?.user && !list.length && <Empty icon={<Plus className="h-8 w-8" />} title={t("add_address")} />}
      <div className="space-y-2 p-4">
        {list.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3">
            <AddressIcon label={a.label} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-bold">
                {t(`label_${a.label}` as any)}
                {a.is_default ? <span className="rounded-full bg-brand-50 px-2 text-[10px] text-brand-700">{t("default")}</span> : null}
              </div>
              <div className="truncate text-xs text-ink-500">{[a.area, a.street, a.building].filter(Boolean).join("، ")}</div>
            </div>
            {!a.is_default && (
              <button onClick={async () => { await api(`/api/addresses/${a.id}`, { method: "PATCH", body: { is_default: true } }); refreshMe(); }} className="rounded-full p-2 text-ink-400 hover:bg-ink-100" aria-label={t("set_default")}>
                <Check className="h-4 w-4" />
              </button>
            )}
            <button onClick={async () => { await api(`/api/addresses/${a.id}`, { method: "DELETE" }); refreshMe(); }} className="rounded-full p-2 text-red-500 hover:bg-red-50" aria-label={t("delete")}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button variant="secondary" block onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t("add_address")}</Button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("add_address")}>
        <AddressForm onDone={() => { refreshMe(); setOpen(false); }} />
      </Sheet>
    </div>
  );
}
