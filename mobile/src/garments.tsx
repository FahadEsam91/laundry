import { useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import useSWR from "swr";
import { api } from "./api";
import { errText, useI18n } from "./i18n";
import { useToast } from "./toast";
import { C } from "./theme";
import { Btn, Sheet, Txt } from "./ui";

type Stage = "collect" | "receive" | "ready";
const STAGES: [string, string][] = [["collected_at", "stage_collected"], ["received_at", "stage_received"], ["ready_at", "stage_ready"], ["delivered_at", "stage_delivered"]];

/** Per-item progress: collected → at laundry → ready → delivered. */
export function GarmentList({ garments }: { garments?: any[] }) {
  const { t } = useI18n();
  if (!garments?.length) return null;
  return (
    <View style={{ gap: 8 }}>
      {garments.map((g) => {
        const reached = STAGES.filter(([k]) => g[k]).length;
        return (
          <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.ink50, borderRadius: 12, padding: 10 }}>
            <Txt size={20}>{g.icon}</Txt>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt w="bold" size={13} numberOfLines={1}>{g.name}</Txt>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {STAGES.map(([k], i) => <View key={k} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < reached ? C.green : C.ink200 }} />)}
              </View>
            </View>
            <View style={{ backgroundColor: reached === 4 ? "#D1FAE5" : C.brandSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Txt w="bold" size={11} color={reached === 4 ? "#047857" : C.brand}>{reached ? t(STAGES[reached - 1][1] as any) : "—"}</Txt>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Rider / laundry scanner: camera QR reading, manual entry, item type for new labels. */
export function ScanSheet({ open, onClose, orderId, stage, title }: { open: boolean; onClose: () => void; orderId: number; stage: Stage; title: string }) {
  const { t, L, lang, money } = useI18n();
  const toast = useToast();
  const [perm, requestPerm] = useCameraPermissions();
  const { data, mutate } = useSWR(open ? `/api/orders/${orderId}` : null);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const busy = useRef(false);
  const last = useRef({ code: "", at: 0 });
  const items: any[] = data?.order?.items || [];
  const garments: any[] = data?.order?.garments || [];
  const col = stage === "collect" ? "collected_at" : stage === "receive" ? "received_at" : "ready_at";
  const done = garments.filter((g) => g[col]).length;

  const send = async (code: string, productId?: number) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await api<any>("/api/scan", { body: { order_id: orderId, code, stage, product_id: productId } });
      setPending(null);
      setTyped("");
      setFlash(r.garment.name);
      setTimeout(() => setFlash(null), 1400);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      mutate();
    } catch (e: any) {
      if (String(e?.code || e?.message) === "tag_item_required") setPending(code);
      else toast(errText(e, lang, money), "error");
    } finally {
      busy.current = false;
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: C.brandSoft, borderRadius: 12, padding: 10 }}>
          <Txt w="bold" color={C.brandDark}>🏷️ {t("scanned_count", { x: `${done}${stage !== "collect" && garments.length ? ` / ${garments.length}` : ""}` })}</Txt>
          {flash ? <Txt w="bold" color={C.green}>✓ {flash}</Txt> : null}
        </View>
        {open && perm?.granted ? (
          <View style={{ height: 240, borderRadius: 18, overflow: "hidden", backgroundColor: "#000" }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data: code }) => {
                if (pending || (code === last.current.code && Date.now() - last.current.at < 2500)) return;
                last.current = { code, at: Date.now() };
                send(code);
              }}
            />
          </View>
        ) : (
          <Btn title={lang === "ar" ? "السماح باستخدام الكاميرا" : "Allow camera"} variant="outline" icon="camera-outline" onPress={requestPerm} />
        )}
        <Txt size={12} color={C.ink500} style={{ textAlign: "center" }}>{t("scan_hint")}</Txt>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={typed} onChangeText={(v) => setTyped(v.toUpperCase())} placeholder="NQ-XXXX-XXXX" autoCapitalize="characters"
            style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.ink200, paddingHorizontal: 12, fontWeight: "700", letterSpacing: 1, color: C.ink900, writingDirection: "ltr" }} />
          <Btn title={t("scan_ok")} disabled={!typed.trim()} onPress={() => send(typed.trim())} />
        </View>
        {pending ? (
          <View style={{ borderWidth: 2, borderColor: "#FCD34D", backgroundColor: "#FFFBEB", borderRadius: 16, padding: 10, gap: 8 }}>
            <Txt w="bold" color="#78350F">{t("scan_choose_item")}</Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {items.map((i) => (
                <Pressable key={i.id} onPress={() => send(pending, i.product_id)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A", paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Txt>{i.icon}</Txt><Txt w="semibold" size={13}>{L(i, "name")}</Txt>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        {garments.length ? (
          <ScrollView style={{ maxHeight: 160 }}>
            {garments.map((g) => (
              <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
                <Txt>{g.icon}</Txt>
                <Txt w="semibold" size={13} style={{ flex: 1 }} numberOfLines={1}>{g.name}</Txt>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: g[col] ? C.green : C.ink200 }} />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </Sheet>
  );
}
