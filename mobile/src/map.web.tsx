import { useState } from "react";
import { Image, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "./theme";
import type { Pin } from "./map";

const TILE = 256;
const world = (lat: number, lng: number, z: number) => {
  const s = TILE * 2 ** z;
  const r = (lat * Math.PI) / 180;
  return { x: ((lng + 180) / 360) * s, y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * s };
};

/** Web preview (react-native-maps is native-only): street tiles with the order's pins, positioned in Web Mercator. */
export function LiveMap({ pins, height = 300, center }: { pins: Pin[]; route?: [number, number][] | null; height?: number; onPick?: (lat: number, lng: number) => void; center?: [number, number] }) {
  const [width, setWidth] = useState(0);
  const pts = pins.length ? pins.map((p) => [p.lat, p.lng] as [number, number]) : [center || [33.315, 44.38]];
  const [lat0, lat1] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  const [lng0, lng1] = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
  // Highest zoom at which every pin fits inside the inner 70% of the view.
  let z = 15;
  if (width) {
    for (z = 16; z > 3; z--) {
      const a = world(lat1, lng0, z), b = world(lat0, lng1, z);
      if (b.x - a.x <= width * 0.7 && b.y - a.y <= height * 0.6) break;
    }
  }
  const mid = world((lat0 + lat1) / 2, (lng0 + lng1) / 2, z);
  const left = mid.x - width / 2, top = mid.y - height / 2;
  const tiles: { x: number; y: number }[] = [];
  if (width) {
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width) / TILE); tx++)
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height) / TILE); ty++) tiles.push({ x: tx, y: ty });
  }
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height, width: "100%", backgroundColor: "#EEF1F4", overflow: "hidden" }}>
      {tiles.map((t) => (
        <Image
          key={`${t.x}-${t.y}`}
          source={{ uri: `https://tile.openstreetmap.org/${z}/${t.x}/${t.y}.png` }}
          style={{ position: "absolute", width: TILE, height: TILE, left: t.x * TILE - left, top: t.y * TILE - top }}
        />
      ))}
      {width
        ? pins.map((p) => {
            const w = world(p.lat, p.lng, z);
            return (
              <View key={p.id} style={{ position: "absolute", left: w.x - left - 19, top: w.y - top - 19, width: 38, height: 38, borderRadius: 19, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center", backgroundColor: p.color || (p.kind === "home" ? C.ink900 : p.kind === "laundry" ? "#1A62EC" : C.green), shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6 }}>
                {p.kind === "home" ? <Ionicons name="home" size={16} color="#fff" /> : <MaterialCommunityIcons name={p.kind === "laundry" ? "washing-machine" : "moped"} size={18} color="#fff" />}
              </View>
            );
          })
        : null}
    </View>
  );
}
