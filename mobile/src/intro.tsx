import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { IS_RIDER } from "./config";
import { useI18n } from "./i18n";
import { F } from "./theme";

const BG = IS_RIDER ? "#059669" : "#1A62EC";

/**
 * Animated brand intro played over the app on launch. It starts exactly where the native splash screen
 * leaves off (same colour, same icon, same size), so the hand-off is seamless. Tap to skip.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const { lang } = useI18n();
  const { height } = useWindowDimensions();
  const icon = useRef(new Animated.Value(0)).current; // 0 = splash pose
  const ripple = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const word = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const bubbles = useRef(Array.from({ length: 10 }, () => new Animated.Value(0))).current;
  const [leaving, setLeaving] = useState(false);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    Animated.timing(exit, { toValue: 1, duration: 650, easing: Easing.bezier(0.75, 0, 0.25, 1), useNativeDriver: true }).start(() => onDone());
  };

  useEffect(() => {
    bubbles.forEach((b, i) =>
      Animated.loop(Animated.timing(b, { toValue: 1, duration: 2600 + (i % 4) * 500, delay: (i % 5) * 260, easing: Easing.linear, useNativeDriver: true })).start(),
    );
    Animated.parallel([
      Animated.sequence([
        Animated.timing(icon, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(icon, { toValue: 2, useNativeDriver: true, speed: 14, bounciness: 12 }),
      ]),
      Animated.stagger(180, ripple.map((r) => Animated.timing(r, { toValue: 1, duration: 1300, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }))),
      Animated.timing(word, { toValue: 1, duration: 600, delay: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(tag, { toValue: 1, duration: 600, delay: 820, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const t = setTimeout(leave, 2100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iconScale = icon.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 0.82, 0.62] });
  const iconLift = icon.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 0, -36] });
  const up = (v: Animated.Value, d = 18) => ({ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }] });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: BG, zIndex: 100, transform: [{ translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, -height] }) }] }]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={leave}>
        {bubbles.map((b, i) => (
          <Animated.View
            key={i}
            style={{
              position: "absolute", bottom: -30, left: `${(i * 37 + 5) % 100}%`, width: 8 + ((i * 7) % 16), height: 8 + ((i * 7) % 16), borderRadius: 99,
              backgroundColor: "rgba(255,255,255,.18)",
              opacity: b.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ translateY: b.interpolate({ inputRange: [0, 1], outputRange: [0, -height - 40] }) }],
            }}
          />
        ))}
        <Animated.View style={{ flex: 1, alignItems: "center", justifyContent: "center", opacity: exit.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0] }) }}>
          {ripple.map((r, i) => (
            <Animated.View
              key={i}
              style={{
                position: "absolute", width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: "rgba(255,255,255,.55)",
                opacity: r.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.9, 0] }),
                transform: [{ translateY: -36 }, { scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.4, 3] }) }],
              }}
            />
          ))}
          <Animated.View style={{ transform: [{ translateY: iconLift }, { scale: iconScale }] }}>
            <Image source={require("../assets/splash-icon.png")} style={{ width: 160, height: 160 }} />
          </Animated.View>
          <Animated.View style={[{ position: "absolute", marginTop: 150, alignItems: "center" }, up(word)]}>
            <Text style={{ color: "#fff", fontFamily: F.bold, fontSize: 46, writingDirection: lang === "ar" ? "rtl" : "ltr" }}>{lang === "ar" ? "نقاء" : "Nuqa"}</Text>
            <Animated.Text style={[{ color: "rgba(255,255,255,.85)", fontFamily: F.semibold, fontSize: 15, marginTop: 6 }, up(tag, 10)]}>
              {IS_RIDER ? (lang === "ar" ? "تطبيق المندوبين" : "Rider app") : lang === "ar" ? "غسيل • كوي • توصيل لباب بيتك" : "Wash • Iron • Delivered to your door"}
            </Animated.Text>
          </Animated.View>
        </Animated.View>
        <Text style={{ position: "absolute", top: 58, end: 22, color: "rgba(255,255,255,.8)", fontFamily: F.semibold, fontSize: 13 }}>{lang === "ar" ? "تخطي" : "Skip"}</Text>
      </Pressable>
    </Animated.View>
  );
}
