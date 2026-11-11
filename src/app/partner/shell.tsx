"use client";

import { KanbanSquare, Tags, History } from "lucide-react";
import { useApp } from "@/components/providers";
import { PanelShell, LiveBadge } from "@/components/admin";
import { PushHeaderButton } from "@/components/push";

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const { t } = useApp();
  return (
    <PanelShell
      title={t("partner_panel")}
      badge={<div className="flex items-center gap-2"><PushHeaderButton label={t("push_partner")} /><LiveBadge /></div>}
      nav={[
        { href: "/partner", label: t("orders"), icon: KanbanSquare, exact: true },
        { href: "/partner/menu", label: t("menu"), icon: Tags },
        { href: "/partner/history", label: t("history"), icon: History },
      ]}
    >
      {children}
    </PanelShell>
  );
}
