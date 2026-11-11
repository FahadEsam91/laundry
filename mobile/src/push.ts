import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api } from "./api";
import { VARIANT } from "./config";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * Ask permission, get the Expo push token (APNs/FCM under the hood) and register it with the server.
 * Requires an EAS project id (set EAS_PROJECT_ID when building). Silently no-ops on simulators/web.
 */
export async function registerForPush(lang: string): Promise<"on" | "denied" | "unavailable"> {
  if (Platform.OS === "web" || !Device.isDevice) return "unavailable";
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Orders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 120, 80, 120],
      lightColor: "#1A62EC",
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return "denied";
  const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return "unavailable";
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api("/api/push/mobile", { body: { token, platform: Platform.OS, app: VARIANT, lang } });
  return "on";
}

/** Server links are web paths; map them to app routes. */
export function routeForUrl(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/^\/orders\/(\d+)/);
  if (m) return `/order/${m[1]}`;
  if (url.startsWith("/driver")) return "/rider";
  if (url.startsWith("/plus")) return "/plus";
  if (url.startsWith("/notifications")) return "/notifications";
  if (url.startsWith("/offers") || url === "/") return "/";
  return null;
}
