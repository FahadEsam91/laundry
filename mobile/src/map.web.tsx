import { View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "./theme";
import type { Pin } from "./map";

/** Web preview fallback (react-native-maps is native-only): a schematic map with relative pin positions. */
export function LiveMap({ pins, height = 300 }: { pins: Pin[]; route?: [number, number][] | null; height?: number; onPick?: (lat: number, lng: number) => void; center?: [number, number] }) {
  const lats = pins.map((p) => p.lat), lngs = pins.map((p) => p.lng);
  const [a, b, c, d] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const pos = (p: Pin) => ({ top: `${15 + (1 - (p.lat - a) / (b - a || 1)) * 70}%`, left: `${15 + ((p.lng - c) / (d - c || 1)) * 70}%` });
  return (
    <View style={{ height, width: "100%", backgroundColor: "#E8EEF5", overflow: "hidden" }}>
      {[...Array(8)].map((_, i) => <View key={i} style={{ position: "absolute", left: 0, right: 0, top: `${i * 14}%`, height: 1, backgroundColor: "#D5DEE9" }} />)}
      {[...Array(8)].map((_, i) => <View key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${i * 14}%`, width: 1, backgroundColor: "#D5DEE9" }} />)}
      {pins.map((p) => (
        <View key={p.id} style={[{ position: "absolute", width: 38, height: 38, marginLeft: -19, marginTop: -19, borderRadius: 19, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center", backgroundColor: p.color || (p.kind === "home" ? C.ink900 : p.kind === "laundry" ? "#1A62EC" : C.green) }, pos(p) as any]}>
          {p.kind === "home" ? <Ionicons name="home" size={16} color="#fff" /> : <MaterialCommunityIcons name={p.kind === "laundry" ? "washing-machine" : "moped"} size={18} color="#fff" />}
        </View>
      ))}
    </View>
  );
}
