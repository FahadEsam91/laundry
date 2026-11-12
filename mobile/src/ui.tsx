import { forwardRef } from "react";
import {
  ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, R, shadow } from "./theme";
import { useI18n } from "./i18n";
import { mediaUrl } from "./config";

// ------------------------------------------------------------------ text
type TxtProps = TextProps & { w?: "regular" | "medium" | "semibold" | "bold"; size?: number; color?: string; center?: boolean };
export function Txt({ w = "regular", size = 14, color = C.ink900, center, style, ...rest }: TxtProps) {
  return <Text {...rest} style={[{ fontFamily: F[w], fontSize: size, color, textAlign: center ? "center" : undefined, writingDirection: undefined }, style]} />;
}

// ------------------------------------------------------------------ icons
const SERVICE_ICON: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  shirt: "tshirt-crew-outline",
  wind: "iron-outline",
  sparkles: "creation",
  "washing-machine": "washing-machine",
  footprints: "shoe-sneaker",
  "bed-double": "bed-outline",
  layers: "rug",
  blinds: "blinds",
  scissors: "content-cut",
};
export function ServiceIcon({ name, size = 24, color }: { name: string; size?: number; color: string }) {
  return <MaterialCommunityIcons name={SERVICE_ICON[name] || "package-variant"} size={size} color={color} />;
}
export const Icon = Ionicons;

// ------------------------------------------------------------------ button
type BtnProps = Omit<PressableProps, "style"> & {
  title: string;
  variant?: "primary" | "secondary" | "outline" | "danger" | "dark" | "success" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  right?: string;
  style?: StyleProp<ViewStyle>;
};
export function Btn({ title, variant = "primary", size = "md", loading, icon, right, disabled, style, ...rest }: BtnProps) {
  const v = {
    primary: [C.brand, C.white],
    secondary: [C.brandSoft, C.brandDark],
    outline: [C.white, C.ink900],
    danger: [C.redSoft, C.red],
    dark: [C.ink900, C.white],
    success: [C.green, C.white],
    ghost: ["transparent", C.ink700],
  }[variant];
  const h = size === "lg" ? 56 : size === "sm" ? 38 : 48;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        { height: h, borderRadius: R.md, backgroundColor: v[0], paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: right ? "space-between" : "center", gap: 8, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "outline" && { borderWidth: 1, borderColor: C.ink200 },
        variant === "primary" && { shadowColor: C.brand, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
        style,
      ]}
      {...rest}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {loading ? <ActivityIndicator color={v[1]} /> : icon ? <Ionicons name={icon} size={18} color={v[1]} /> : null}
        <Txt w="bold" size={size === "lg" ? 16 : 14} color={v[1]}>{title}</Txt>
      </View>
      {right ? <Txt w="bold" size={size === "lg" ? 16 : 14} color={v[1]}>{right}</Txt> : null}
    </Pressable>
  );
}

// ------------------------------------------------------------------ inputs
export const Input = forwardRef<any, TextInputProps & { label?: string; icon?: keyof typeof Ionicons.glyphMap }>(function Input({ label, icon, style, ...rest }, ref) {
  const { rtl } = useI18n();
  return (
    <View>
      {label ? <Txt w="semibold" size={12} color={C.ink500} style={{ marginBottom: 6 }}>{label}</Txt> : null}
      <View style={s.inputWrap}>
        {icon ? <Ionicons name={icon} size={18} color={C.ink400} /> : null}
        <TextInput ref={ref} placeholderTextColor={C.ink400} style={[s.input, { textAlign: rtl ? "right" : "left" }, style]} {...rest} />
      </View>
    </View>
  );
});

// ------------------------------------------------------------------ surfaces
export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Badge({ text, bg = C.ink100, color = C.ink700, style }: { text: string; bg?: string; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" }, style]}>
      <Txt w="bold" size={11} color={color}>{text}</Txt>
    </View>
  );
}

const TONE: Record<string, [string, string]> = {
  amber: ["#FFFBEB", "#B45309"], blue: ["#EFF6FF", "#1D4ED8"], indigo: ["#EEF2FF", "#4338CA"], violet: ["#F5F3FF", "#6D28D9"],
  cyan: ["#ECFEFF", "#0E7490"], sky: ["#F0F9FF", "#0369A1"], teal: ["#F0FDFA", "#0F766E"], emerald: ["#ECFDF5", "#047857"],
  green: ["#F0FDF4", "#15803D"], red: ["#FEF2F2", "#B91C1C"],
};
export function StatusBadge({ status }: { status: string }) {
  const { statusLabel } = useI18n();
  const tone = ({ pending: "amber", accepted: "blue", driver_assigned: "indigo", picked_up: "violet", at_laundry: "cyan", processing: "sky", ready: "teal", out_for_delivery: "emerald", delivered: "green", cancelled: "red" } as any)[status] || "blue";
  const [bg, fg] = TONE[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <Txt w="bold" size={11} color={fg}>{statusLabel(status)}</Txt>
    </View>
  );
}

export function PartnerLogo({ p, size = 48 }: { p: { color: string; color2: string; initials: string; logo_url?: string | null }; size?: number }) {
  const uri = mediaUrl(p.logo_url);
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: "#fff" }} />;
  return (
    <LinearGradient colors={[p.color, p.color2 || p.color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontFamily: F.bold, fontSize: size * 0.34, writingDirection: "ltr" }}>{p.initials}</Text>
    </LinearGradient>
  );
}

export function Stepper({ qty, onChange, small }: { qty: number; onChange: (n: number) => void; small?: boolean }) {
  const d = small ? 28 : 34;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.brandSoft, borderRadius: 999, padding: 2, gap: 2 }}>
      <Pressable accessibilityLabel="minus" onPress={() => onChange(qty - 1)} style={[s.stepBtn, { width: d, height: d, backgroundColor: C.white }]}>
        <Ionicons name="remove" size={16} color={C.brandDark} />
      </Pressable>
      <Txt w="bold" size={small ? 13 : 15} color={C.brandDark} style={{ minWidth: 24, textAlign: "center" }}>{qty}</Txt>
      <Pressable accessibilityLabel="plus" onPress={() => onChange(qty + 1)} style={[s.stepBtn, { width: d, height: d, backgroundColor: C.brand }]}>
        <Ionicons name="add" size={16} color={C.white} />
      </Pressable>
    </View>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={s.grabber} />
        {title ? <Txt w="bold" size={17} style={{ marginBottom: 12 }}>{title}</Txt> : null}
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 560 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function Header({ title, back = true, right, transparent }: { title?: string; back?: boolean; right?: React.ReactNode; transparent?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rtl } = useI18n();
  return (
    <View style={[{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }, !transparent && { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.ink100 }]}>
      {back ? (
        <Pressable accessibilityLabel="back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={[s.round, transparent && { backgroundColor: "rgba(255,255,255,.92)", ...shadow }]}>
          <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={22} color={C.ink900} />
        </Pressable>
      ) : null}
      <Txt w="bold" size={17} style={{ flex: 1 }} numberOfLines={1}>{title}</Txt>
      {right}
    </View>
  );
}

export function Empty({ icon, title, sub, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 56, paddingHorizontal: 24 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.brandSoft, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Ionicons name={icon} size={34} color={C.brand} />
      </View>
      <Txt w="bold" size={16} center>{title}</Txt>
      {sub ? <Txt size={13} color={C.ink500} center style={{ marginTop: 4, maxWidth: 280 }}>{sub}</Txt> : null}
      {action ? <View style={{ marginTop: 18 }}>{action}</View> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
      <ActivityIndicator color={C.brand} size="large" />
    </View>
  );
}

export function Row({ icon, label, onPress, right, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; right?: React.ReactNode; danger?: boolean }) {
  const { rtl } = useI18n();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: pressed ? C.ink50 : C.white }]}>
      <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: danger ? C.redSoft : C.ink100, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={18} color={danger ? C.red : C.ink700} />
      </View>
      <Txt w="semibold" style={{ flex: 1 }} color={danger ? C.red : C.ink900}>{label}</Txt>
      {right}
      {onPress ? <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={16} color={C.ink300} /> : null}
    </Pressable>
  );
}

export function Section({ title, children, style }: { title?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: C.white, padding: 16, marginTop: 8 }, style]}>
      {title ? <Txt w="bold" size={16} style={{ marginBottom: 12 }}>{title}</Txt> : null}
      {children}
    </View>
  );
}

export function Choice({ selected, onPress, children, style }: { selected: boolean; onPress: () => void; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={[{ borderWidth: 2, borderColor: selected ? C.brand : C.ink100, backgroundColor: selected ? C.brandSoft : C.white, borderRadius: R.md, padding: 12 }, style]}>
      {children}
    </Pressable>
  );
}

export const text = (style: TextStyle) => style;

const s = StyleSheet.create({
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 8, height: 50, borderWidth: 1, borderColor: C.ink200, borderRadius: R.md, paddingHorizontal: 12, backgroundColor: C.white },
  input: { flex: 1, minWidth: 0, fontFamily: F.medium, fontSize: 15, color: C.ink900, height: "100%" },
  card: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 1, borderColor: C.ink100, ...shadow },
  stepBtn: { borderRadius: 999, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(11,14,20,.5)" },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: C.ink200, marginBottom: 14 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
