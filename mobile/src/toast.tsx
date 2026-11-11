import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Txt } from "./ui";
import { C } from "./theme";

const ToastC = createContext<(msg: string, kind?: "success" | "error" | "info") => void>(() => {});
export const useToast = () => useContext(ToastC);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<{ text: string; kind: string } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);
  const show = useCallback(
    (text: string, kind: "success" | "error" | "info" = "success") => {
      setMsg({ text, kind });
      clearTimeout(timer.current);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
      timer.current = setTimeout(() => Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMsg(null)), 2800);
    },
    [anim],
  );
  return (
    <ToastC.Provider value={show}>
      {children}
      {msg && (
        <Animated.View pointerEvents="none" style={{ position: "absolute", top: insets.top + 8, left: 16, right: 16, alignItems: "center", opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}>
          <View style={{ backgroundColor: msg.kind === "error" ? C.red : msg.kind === "info" ? C.ink900 : C.green, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 }}>
            <Txt w="semibold" color="#fff">{msg.text}</Txt>
          </View>
        </Animated.View>
      )}
    </ToastC.Provider>
  );
}
