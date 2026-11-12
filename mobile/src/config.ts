import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = (Constants.expoConfig?.extra || {}) as { variant?: string; apiUrl?: string };

export const VARIANT: "customer" | "rider" = extra.variant === "rider" ? "rider" : "customer";
export const IS_RIDER = VARIANT === "rider";
/** Web builds are served from the same origin as the API (used for previews); native apps call the configured server. */
export const API_URL = Platform.OS === "web" ? "" : (extra.apiUrl || "http://localhost:3000").replace(/\/$/, "");
/** Uploaded images are served by the API as relative paths. */
export const mediaUrl = (u?: string | null) => (!u ? null : /^https?:/.test(u) ? u : API_URL + u);
export const BRAND = IS_RIDER ? "#059669" : "#1A62EC";
