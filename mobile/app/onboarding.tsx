import { useEffect, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Pressable, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useI18n } from "@/i18n";
import { ONBOARDED, prefs } from "@/storage";
import { C } from "@/theme";
import { Txt } from "@/ui";
import { Float } from "@/motion";

const SLIDES = [
  { colors: ["#1A62EC", "#56A3FD"], main: "washing-machine", chips: [["shirt-outline", "#F59E0B"], ["sparkles-outline", "#EC4899"], ["star", "#FBBF24"]], t: "ob1_t", b: "ob1_b" },
  { colors: ["#0F766E", "#2DD4BF"], main: "moped", chips: [["location", "#EF4444"], ["time-outline", "#1A62EC"], ["home-outline", "#0B0E14"]], t: "ob2_t", b: "ob2_b" },
  { colors: ["#7C3AED", "#C4B5FD"], main: "camera-iris", chips: [["camera-outline", "#1A62EC"], ["checkmark-circle", "#10B981"], ["shield-checkmark-outline", "#7C3AED"]], t: "ob3_t", b: "ob3_b" },
] as const;

export default function Onboarding() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const rtl = lang === "ar";

  const done = async () => {
    await prefs.set(ONBOARDED, true);
    router.replace("/home");
  };
  const go = (n: number) => setI(Math.max(0, Math.min(SLIDES.length - 1, n)));
  const next = () => (i < SLIDES.length - 1 ? go(i + 1) : done());
  // swipe towards the reading direction to advance
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 50) return;
        const forward = rtl ? g.dx > 0 : g.dx < 0;
        setI((c) => Math.max(0, Math.min(SLIDES.length - 1, c + (forward ? 1 : -1))));
      },
    }),
  ).current;

  return (
    <View style={{ flex: 1, backgroundColor: C.white }} {...pan.panHandlers}>
      <Slide key={i} s={SLIDES[i]} width={width} top={insets.top} />
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, gap: 18 }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {SLIDES.map((_, k) => (
            <Pressable key={k} onPress={() => go(k)} hitSlop={8}>
              <View style={{ height: 8, width: k === i ? 26 : 8, borderRadius: 4, backgroundColor: k === i ? C.brand : C.ink200 }} />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={next} style={({ pressed }) => ({ height: 56, borderRadius: 18, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Txt w="bold" size={16} color="#fff">{i === SLIDES.length - 1 ? t("ob_start") : t("ob_next")}</Txt>
        </Pressable>
      </View>
      <Pressable onPress={done} hitSlop={12} style={{ position: "absolute", top: insets.top + 14, end: 20, backgroundColor: "rgba(255,255,255,.22)", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
        <Txt w="bold" size={13} color="#fff">{t("ob_skip")}</Txt>
      </Pressable>
    </View>
  );
}

function Slide({ s, width, top }: { s: (typeof SLIDES)[number]; width: number; top: number }) {
  const { t } = useI18n();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  const rise = (from: number, d = 24) => ({
    opacity: v.interpolate({ inputRange: [0, from, 1], outputRange: [0, 0, 1] }),
    transform: [{ translateY: v.interpolate({ inputRange: [0, from, 1], outputRange: [d, d, 0] }) }],
  });
  const pos = [{ top: 30, start: 34 }, { top: 120, end: 22 }, { bottom: 40, start: 60 }] as const;
  return (
    <View style={{ width, flex: 1 }}>
      <LinearGradient colors={s.colors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 420 + top, paddingTop: top, borderBottomLeftRadius: 44, borderBottomRightRadius: 44, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <View style={{ position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(255,255,255,.12)", top: -80, end: -90 }} />
        <View style={{ position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,.1)", bottom: -60, start: -70 }} />
        <Animated.View style={[{ width: 260, height: 260, alignItems: "center", justifyContent: "center" }, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>
          <View style={{ position: "absolute", width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(255,255,255,.14)" }} />
          <View style={{ position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,.18)" }} />
          <Float distance={10}>
            <View style={{ width: 120, height: 120, borderRadius: 36, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 }}>
              <MaterialCommunityIcons name={s.main as any} size={64} color={s.colors[0]} />
            </View>
          </Float>
          {s.chips.map(([ic, color], k) => (
            <Float key={ic} delay={k * 500} distance={7} style={[{ position: "absolute" }, pos[k] as any]}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
                <Ionicons name={ic as any} size={24} color={color} />
              </View>
            </Float>
          ))}
        </Animated.View>
      </LinearGradient>
      <View style={{ paddingHorizontal: 30, paddingTop: 34, alignItems: "center" }}>
        <Animated.View style={rise(0.2)}><Txt w="bold" size={26} style={{ textAlign: "center" }}>{t(s.t as any)}</Txt></Animated.View>
        <Animated.View style={rise(0.4)}><Txt size={15} color={C.ink500} style={{ textAlign: "center", marginTop: 10, lineHeight: 24 }}>{t(s.b as any)}</Txt></Animated.View>
      </View>
    </View>
  );
}
