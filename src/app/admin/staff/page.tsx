"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, ShieldCheck, Lock, Ban, RotateCcw, Trash2, Check } from "lucide-react";
import { useApp, useToast } from "@/components/providers";
import { PageHead, Panel, Table, Td } from "@/components/admin";
import { Badge, Button, Input, Select, Sheet, Skeleton, Segmented, Toggle, cx } from "@/components/ui";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { api, errText, timeAgo } from "@/lib/client";

const ROLE_TONE: Record<string, string> = { super_admin: "violet", operations: "blue", support: "emerald", finance: "amber", marketing: "cyan" };

export default function StaffPage() {
  const { t, L, lang, fmtDate, me } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState<"staff" | "roles">("staff");
  const { data: sd, mutate: ms } = useSWR("/api/admin/staff");
  const { data: rd, mutate: mr } = useSWR("/api/admin/roles");
  const [invite, setInvite] = useState<any>(null);
  const [roleEdit, setRoleEdit] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const roles: any[] = rd?.roles || [];
  const myPerms: string[] = me?.user?.permissions || [];
  const isSuper = me?.user?.admin_role === "super_admin";

  const run = async (fn: () => Promise<any>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
      ms();
      mr();
      return true;
    } catch (e) {
      toast(errText(e, lang), "error");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const roleLabel = (r: any) => (r ? L(r, "name") : "—");

  return (
    <div className="animate-fade-up">
      <PageHead
        title={t("staff")}
        sub={lang === "ar" ? "حدد من يرى ماذا ومن يستطيع تعديل ماذا" : "Control who can see and change what"}
        actions={
          <div className="flex items-center gap-2">
            <Segmented value={tab} onChange={setTab} options={[{ value: "staff", label: t("staff_members") }, { value: "roles", label: t("roles") }]} />
            {tab === "staff" ? (
              <Button onClick={() => setInvite({ name: "", phone: "", role_id: roles.find((r) => r.key === "support")?.id || roles[0]?.id })}><Plus className="h-4 w-4" /> {t("invite_staff")}</Button>
            ) : (
              <Button onClick={() => setRoleEdit({ name_ar: "", name_en: "", desc_ar: "", desc_en: "", perms: [] })}><Plus className="h-4 w-4" /> {t("new_role")}</Button>
            )}
          </div>
        }
      />

      {tab === "staff" ? (
        <Panel bodyClass="p-0">
          {!sd ? <div className="p-4"><Skeleton className="h-64" /></div> : (
            <Table head={[t("name"), t("phone"), t("role"), t("status"), t("last_active"), lang === "ar" ? "العمليات" : "Actions logged", ""]}>
              {sd.staff.map((s: any) => {
                const self = s.id === me?.user?.id;
                return (
                  <tr key={s.id} className="hover:bg-ink-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-white">{s.name.slice(0, 1)}</span>
                        <div className="font-bold">{s.name} {self && <Badge tone="blue">{t("you")}</Badge>}</div>
                      </div>
                    </Td>
                    <Td dir="ltr" className="text-ink-500">{s.phone}</Td>
                    <Td>
                      {self || (s.role_key === "super_admin" && !isSuper) ? (
                        <Badge tone={ROLE_TONE[s.role_key] || "gray"}>{L({ name_ar: s.role_ar, name_en: s.role_en }, "name")}</Badge>
                      ) : (
                        <select
                          value={s.admin_role_id || ""}
                          onChange={(e) => run(() => api(`/api/admin/staff/${s.id}`, { method: "PATCH", body: { role_id: Number(e.target.value) } }), t("saved"))}
                          className="h-9 rounded-lg border border-ink-200 bg-white px-2 text-sm font-semibold"
                        >
                          {roles.map((r) => <option key={r.id} value={r.id}>{roleLabel(r)}</option>)}
                        </select>
                      )}
                    </Td>
                    <Td>{s.status === "active" ? <Badge tone="green">{t("active")}</Badge> : <Badge tone="red">{t("suspended")}</Badge>}</Td>
                    <Td className="text-xs text-ink-500">{s.last_seen ? timeAgo(s.last_seen, lang) : "—"}</Td>
                    <Td className="tabular">{s.actions}</Td>
                    <Td>
                      {!self && !(s.role_key === "super_admin" && !isSuper) && (
                        s.status === "active" ? (
                          <button onClick={() => run(() => api(`/api/admin/staff/${s.id}`, { method: "PATCH", body: { status: "suspended" } }), t("saved"))} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" title={t("suspend_staff")}><Ban className="h-4 w-4" /></button>
                        ) : (
                          <button onClick={() => run(() => api(`/api/admin/staff/${s.id}`, { method: "PATCH", body: { status: "active" } }), t("saved"))} className="rounded-lg p-2 text-ink-400 hover:bg-emerald-50 hover:text-emerald-600" title={t("restore_staff")}><RotateCcw className="h-4 w-4" /></button>
                        )
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!rd && [...Array(5)].map((_, i) => <Skeleton key={i} className="h-40" />)}
          {roles.map((r) => (
            <button key={r.id} onClick={() => setRoleEdit({ ...r })} className="rounded-2xl border border-ink-100 bg-white p-5 text-start shadow-soft transition hover:border-brand-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldCheck className="h-4 w-4 text-brand-600" /> {roleLabel(r)}
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{L(r, "desc")}</p>
                </div>
                {r.system ? <Badge tone="gray"><Lock className="h-3 w-3" /> {t("system_role")}</Badge> : <Badge tone="violet">{t("custom_role")}</Badge>}
              </div>
              <div className="mt-4 flex gap-2 text-xs">
                <span className="rounded-lg bg-ink-100 px-2 py-1 font-semibold">{t("members_count", { n: r.members })}</span>
                <span className="rounded-lg bg-brand-50 px-2 py-1 font-semibold text-brand-700">{t("perms_count", { n: r.perms.length })}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!invite} onClose={() => setInvite(null)} title={t("invite_staff")}>
        {invite && (
          <div className="space-y-4">
            <Input label={t("name")} value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
            <Input label={t("phone")} value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} dir="ltr" placeholder="+964 7XX XXX XXXX" />
            <Select label={t("role")} value={invite.role_id} onChange={(e) => setInvite({ ...invite, role_id: Number(e.target.value) })}>
              {roles.filter((r) => isSuper || r.perms.every((p: string) => myPerms.includes(p))).map((r) => <option key={r.id} value={r.id}>{roleLabel(r)}</option>)}
            </Select>
            <p className="rounded-xl bg-ink-50 p-3 text-xs text-ink-500">{t("invite_note")}</p>
            <Button block loading={busy} disabled={invite.name.trim().length < 2 || invite.phone.replace(/\D/g, "").length < 9} onClick={async () => { if (await run(() => api("/api/admin/staff", { body: invite }), t("saved"))) setInvite(null); }}>{t("save")}</Button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!roleEdit} onClose={() => setRoleEdit(null)} wide title={roleEdit?.id ? roleLabel(roleEdit) : t("new_role")}>
        {roleEdit && (
          <RoleEditor
            role={roleEdit}
            locked={!!roleEdit.system}
            myPerms={myPerms}
            isSuper={isSuper}
            busy={busy}
            onSave={async (r) => {
              const ok = await run(() => (r.id ? api(`/api/admin/roles/${r.id}`, { method: "PATCH", body: { name_ar: r.name_ar, name_en: r.name_en, desc_ar: r.desc_ar, desc_en: r.desc_en, perms: r.perms } }) : api("/api/admin/roles", { body: r })), t("saved"));
              if (ok) setRoleEdit(null);
            }}
            onDelete={async () => { if (await run(() => api(`/api/admin/roles/${roleEdit.id}`, { method: "DELETE" }), t("saved"))) setRoleEdit(null); }}
          />
        )}
      </Sheet>
    </div>
  );
}

function RoleEditor({ role, locked, myPerms, isSuper, busy, onSave, onDelete }: { role: any; locked: boolean; myPerms: string[]; isSuper: boolean; busy: boolean; onSave: (r: any) => void; onDelete: () => void }) {
  const { t, lang } = useApp();
  const [r, setR] = useState<any>({ ...role, perms: [...(role.perms || [])] });
  const toggle = (p: string, on: boolean) => setR({ ...r, perms: on ? [...r.perms, p] : r.perms.filter((x: string) => x !== p) });
  const grantable = (p: string) => isSuper || myPerms.includes(p);
  return (
    <div className="space-y-5">
      {locked && <div className="flex items-center gap-2 rounded-xl bg-ink-50 p-3 text-sm text-ink-600"><Lock className="h-4 w-4" /> {lang === "ar" ? "دور أساسي — صلاحياته محددة مسبقاً. أنشئ دوراً مخصصاً لتركيبة مختلفة." : "Built-in role — permissions are predefined. Create a custom role for a different mix."}</div>}
      {!locked && (
        <div className="grid gap-3 md:grid-cols-2">
          <Input label={t("name_ar")} value={r.name_ar} onChange={(e) => setR({ ...r, name_ar: e.target.value })} />
          <Input label={t("name_en")} value={r.name_en} onChange={(e) => setR({ ...r, name_en: e.target.value })} />
          <Input label={`${t("details")} (AR)`} value={r.desc_ar || ""} onChange={(e) => setR({ ...r, desc_ar: e.target.value })} />
          <Input label={`${t("details")} (EN)`} value={r.desc_en || ""} onChange={(e) => setR({ ...r, desc_en: e.target.value })} />
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {PERMISSION_GROUPS.map((g) => (
          <div key={g.key} className="rounded-2xl border border-ink-100 p-4">
            <div className="mb-2 text-sm font-bold">{lang === "ar" ? g.ar : g.en}</div>
            <div className="space-y-2">
              {g.perms.map(([key, ar, en]) => {
                const on = r.perms.includes(key);
                return (
                  <label key={key} className={cx("flex items-center justify-between gap-3 text-sm", !locked && !grantable(key) && "opacity-50")}>
                    <span className="flex items-center gap-2">
                      {locked ? <span className={cx("flex h-4 w-4 items-center justify-center rounded", on ? "bg-emerald-500 text-white" : "bg-ink-100")}>{on && <Check className="h-3 w-3" />}</span> : null}
                      {lang === "ar" ? ar : en}
                    </span>
                    {!locked && <Toggle checked={on} disabled={!grantable(key)} onChange={(v) => toggle(key, v)} />}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {!locked && (
        <div className="flex items-center justify-between gap-2">
          {r.id ? <Button variant="danger" onClick={onDelete} loading={busy}><Trash2 className="h-4 w-4" /> {t("delete")}</Button> : <span />}
          <Button loading={busy} disabled={!r.name_ar || !r.name_en || !r.perms.length} onClick={() => onSave(r)}>{t("save")}</Button>
        </div>
      )}
    </div>
  );
}
