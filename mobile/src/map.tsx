import { Linking, Platform, Pressable, View } from "react-native";
import Constants from "expo-constants";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { C } from "./theme";
import { Txt } from "./ui";

const MAPS_OK = Platform.OS !== "android" || !!(Constants.expoConfig?.extra as any)?.androidMaps;

export type Pin = { id: string; lat: number; lng: number; kind: "home" | "laundry" | "rider"; color?: string };

function PinView({ p }: { p: Pin }) {
  const bg = p.color || (p.kind === "home" ? C.ink900 : p.kind === "laundry" ? "#1A62EC" : C.green);
  return (
    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: bg, borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 }}>
      {p.kind === "home" ? <Ionicons name="home" size={16} color="#fff" /> : p.kind === "laundry" ? <MaterialCommunityIcons name="washing-machine" size={18} color="#fff" /> : <MaterialCommunityIcons name="moped" size={18} color="#fff" />}
    </View>
  );
}

/** Native map (Apple Maps on iOS, Google Maps on Android). */
export function LiveMap({ pins, route, height = 300, onPick, center }: { pins: Pin[]; route?: [number, number][] | null; height?: number; onPick?: (lat: number, lng: number) => void; center?: [number, number] }) {
  const ref = useRef<MapView>(null);
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || pins.length < 2) return;
    fitted.current = true;
    setTimeout(() => ref.current?.fitToCoordinates(pins.map((p) => ({ latitude: p.lat, longitude: p.lng })), { edgePadding: { top: 80, bottom: 80, left: 60, right: 60 }, animated: false }), 300);
  }, [pins]);
  const c = center || (pins[0] ? [pins[0].lat, pins[0].lng] : [33.315, 44.38]);
  if (!MAPS_OK) {
    // Google Maps SDK crashes without an API key: show a placeholder that opens the location in the Maps app.
    const target = pins.find((p) => p.kind === "rider") || pins[0];
    return (
      <View style={{ height, width: "100%", backgroundColor: "#E8EEF9", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Ionicons name="map" size={36} color={C.brand} />
        {target ? (
          <Pressable onPress={() => Linking.openURL(`geo:${target.lat},${target.lng}?q=${target.lat},${target.lng}`)} style={{ backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
            <Txt w="bold" size={13} color={C.brand}>Google Maps ↗</Txt>
          </Pressable>
        ) : null}
      </View>
    );
  }
  return (
    <MapView
      ref={ref}
      provider={PROVIDER_DEFAULT}
      style={{ height, width: "100%" }}
      initialRegion={{ latitude: c[0], longitude: c[1], latitudeDelta: 0.04, longitudeDelta: 0.04 }}
      onPress={onPick ? (e) => onPick(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude) : undefined}
      showsUserLocation={!!onPick}
    >
      {route && route.length > 1 ? <Polyline coordinates={route.map(([a, b]) => ({ latitude: a, longitude: b }))} strokeColor={C.brand} strokeWidth={4} lineDashPattern={[2, 8]} /> : null}
      {pins.map((p) => (
        <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={p.kind === "rider"}>
          <PinView p={p} />
        </Marker>
      ))}
    </MapView>
  );
}
