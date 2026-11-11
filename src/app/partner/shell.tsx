"use client";

import { KanbanSquare, Tags, History } from "lucide-react";
import { useApp } from "@/components/providers";
import { PanelShell, LiveBadge } from "@/components/admin";

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const { t } = useApp();
  return (
    <PanelShell
      title={t("partner_panel")}
      badge={<LiveBadge />}
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
