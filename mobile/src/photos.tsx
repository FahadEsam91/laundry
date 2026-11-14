import { useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { api } from "./api";
import { useAuth } from "./auth";
import { mediaUrl } from "./config";
import { errText, useI18n } from "./i18n";
import { useToast } from "./toast";
import { C } from "./theme";
import { Txt } from "./ui";

/** Private photos need the user's token to load. */
function useSource() {
  const { token } = useAuth();
  return (u: string) => ({ uri: mediaUrl(u)!, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
}

/** Customer photos of their items, uploaded privately before the order is placed. */
export function PhotosPicker({ value, onChange, max = 6 }: { value: string[]; onChange: (v: string[]) => void; max?: number }) {
  const { t, lang, money } = useI18n();
  const toast = useToast();
  const src = useSource();
  const [busy, setBusy] = useState(0);
  const [view, setView] = useState<number | null>(null);

  const add = async (from: "camera" | "library") => {
    const perm = from === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsMultipleSelection: from === "library", selectionLimit: max - value.length };
    const r = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled) return;
    const assets = r.assets.slice(0, max - value.length);
    setBusy(assets.length);
    const added: string[] = [];
    for (const a of assets) {
      try {
        const big = Math.max(a.width || 0, a.height || 0) > 1600;
        const resize = big ? [{ resize: (a.width || 0) >= (a.height || 0) ? { width: 1600 } : { height: 1600 } }] : [];
        const img = await manipulateAsync(a.uri, resize, { compress: 0.8, format: SaveFormat.JPEG, base64: true });
        const res = await api<{ url: string }>("/api/media", { body: { kind: "order", data: `data:image/jpeg;base64,${img.base64}` } });
        added.push(res.url);
      } catch (e) {
        toast(errText(e, lang, money), "error");
      }
      setBusy((n) => n - 1);
    }
    onChange([...value, ...added]);
  };

  const tile = { width: 76, height: 76, borderRadius: 14, overflow: "hidden" as const, backgroundColor: C.ink100 };
  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {value.map((u, i) => (
          <Pressable key={u} onPress={() => setView(i)} style={tile}>
            <Image source={src(u)} style={{ width: "100%", height: "100%" }} />
            <Pressable onPress={() => onChange(value.filter((x) => x !== u))} hitSlop={8} style={{ position: "absolute", top: 4, end: 4, backgroundColor: "rgba(0,0,0,.6)", borderRadius: 999, padding: 3 }}>
              <Ionicons name="close" size={12} color="#fff" />
            </Pressable>
          </Pressable>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <View key={`b${i}`} style={[tile, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={C.brand} /></View>
        ))}
      </View>
      {value.length + busy < max ? (
        <View style={{ flexDirection: "row", gap: 8, marginTop: value.length || busy ? 10 : 0 }}>
          {([["camera", "camera-outline", t("camera")], ["library", "images-outline", t("gallery")]] as const).map(([k, ic, label]) => (
            <Pressable key={k} onPress={() => add(k)} style={({ pressed }) => ({ flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.ink200, backgroundColor: pressed ? C.ink50 : C.white })}>
              <Ionicons name={ic} size={18} color={C.brand} />
              <Txt w="semibold" size={13} color={C.brand}>{label}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Viewer photos={value} index={view} onClose={() => setView(null)} />
    </View>
  );
}

/** Thumbnails that open a full-screen viewer. */
export function PhotoGallery({ photos, size = 64 }: { photos?: string[]; size?: number }) {
  const src = useSource();
  const [view, setView] = useState<number | null>(null);
  if (!photos?.length) return null;
  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {photos.map((u, i) => (
          <Pressable key={u} onPress={() => setView(i)} style={{ width: size, height: size, borderRadius: 12, overflow: "hidden", backgroundColor: C.ink100 }}>
            <Image source={src(u)} style={{ width: "100%", height: "100%" }} />
          </Pressable>
        ))}
      </View>
      <Viewer photos={photos} index={view} onClose={() => setView(null)} />
    </>
  );
}

function Viewer({ photos, index, onClose }: { photos: string[]; index: number | null; onClose: () => void }) {
  const src = useSource();
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible={index !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,.95)" }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: (index || 0) * width, y: 0 }}>
          {photos.map((u) => (
            <View key={u} style={{ width, height, alignItems: "center", justifyContent: "center" }}>
              <Image source={src(u)} style={{ width, height: height * 0.8 }} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>
        <Pressable onPress={onClose} hitSlop={12} style={{ position: "absolute", top: 54, end: 20, backgroundColor: "rgba(255,255,255,.15)", borderRadius: 999, padding: 8 }}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}
