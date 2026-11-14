import { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Pressable, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

/** Fades and lifts its children in on mount. */
export function FadeIn({ delay = 0, y = 18, duration = 520, style, children }: { delay?: number; y?: number; duration?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay, duration]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Pressable that springs down slightly while pressed. */
export function PressScale({ style, children, scaleTo = 0.96, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; children: React.ReactNode }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable {...rest} onPressIn={(e) => { to(scaleTo); rest.onPressIn?.(e); }} onPressOut={(e) => { to(1); rest.onPressOut?.(e); }}>
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Gentle endless up-and-down float. */
export function Float({ delay = 0, distance = 8, duration = 2400, style, children }: { delay?: number; distance?: number; duration?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay, duration]);
  return <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }] }]}>{children}</Animated.View>;
}

/** Confetti burst + popping check mark for success screens. */
export function Celebration({ title, sub }: { title: string; sub?: string }) {
  const { width, height } = Dimensions.get("window");
  const pop = useRef(new Animated.Value(0)).current;
  const pieces = useRef(Array.from({ length: 28 }, () => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 14 }).start();
    pieces.forEach((p, i) => Animated.timing(p, { toValue: 1, duration: 2000 + (i % 5) * 300, delay: (i % 7) * 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start());
  }, [pop, pieces]);
  const colors = ["#FBBF24", "#F472B6", "#34D399", "#FFFFFF", "#93C5FD"];
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute", top: -20, left: ((i * 37) % 100) / 100 * width, width: 8, height: 14, borderRadius: 2, backgroundColor: colors[i % 5],
            transform: [
              { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
              { translateX: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, (i % 2 ? 1 : -1) * 30, 0] }) },
              { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${360 + i * 40}deg`] }) },
            ],
          }}
        />
      ))}
      <Animated.View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", transform: [{ scale: pop }], shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 }}>
        <Text style={{ fontSize: 60, color: "#1A62EC", fontWeight: "900" }}>✓</Text>
      </Animated.View>
      <Animated.View style={{ alignItems: "center", opacity: pop, transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
        <Text style={{ marginTop: 22, color: "#fff", fontSize: 24, fontFamily: "IBMPlexSansArabic_700Bold" }}>{title}</Text>
        {sub ? <Text style={{ color: "rgba(255,255,255,.8)", fontFamily: "IBMPlexSansArabic_500Medium", marginTop: 4 }}>{sub}</Text> : null}
      </Animated.View>
    </View>
  );
}
