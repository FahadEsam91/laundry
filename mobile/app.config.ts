import type { ExpoConfig } from "expo/config";

/**
 * One codebase → two store apps.
 *   APP_VARIANT=customer (default) → "Nuqa"        com.nuqa.app
 *   APP_VARIANT=rider              → "Nuqa Rider"  com.nuqa.rider
 * Change the bundle identifiers to your own reverse-domain before the first store submission.
 */
const VARIANT = process.env.APP_VARIANT === "rider" ? "rider" : "customer";
const isRider = VARIANT === "rider";
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const EAS_PROJECT_ID = isRider ? process.env.EAS_PROJECT_ID_RIDER : process.env.EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: isRider ? "Nuqa Rider" : "Nuqa",
  slug: isRider ? "nuqa-rider" : "nuqa",
  scheme: isRider ? "nuqarider" : "nuqa",
  version: "1.0.0",
  orientation: "portrait",
  icon: isRider ? "./assets/rider-icon.png" : "./assets/icon.png",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: isRider ? "com.nuqa.rider" : "com.nuqa.app",
    buildNumber: "1",
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSLocationWhenInUseUsageDescription: isRider
        ? "Nuqa Rider uses your location to show customers where their rider is and to navigate to pickups."
        : "Nuqa uses your location to set your pickup and delivery address.",
      CFBundleAllowMixedLocalizations: true,
      CFBundleLocalizations: ["ar", "en"],
    },
  },
  android: {
    package: isRider ? "com.nuqa.rider" : "com.nuqa.app",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: isRider ? "./assets/rider-adaptive-icon.png" : "./assets/adaptive-icon.png",
      backgroundColor: isRider ? "#059669" : "#1A62EC",
    },
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "POST_NOTIFICATIONS"],
    // Google Maps on Android needs an API key: set GOOGLE_MAPS_ANDROID_KEY in EAS secrets
    config: process.env.GOOGLE_MAPS_ANDROID_KEY ? { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY } } : undefined,
  },
  web: { bundler: "metro", output: "single", favicon: "./assets/favicon.png" },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-localization",
    ["expo-notifications", { icon: "./assets/notification-icon.png", color: isRider ? "#059669" : "#1A62EC" }],
    ["expo-location", { locationWhenInUsePermission: isRider ? "Nuqa Rider uses your location for navigation and live tracking." : "Nuqa uses your location to set your address." }],
    ["expo-splash-screen", { image: "./assets/splash-icon.png", imageWidth: 160, backgroundColor: isRider ? "#059669" : "#1A62EC" }],
  ],
  experiments: { typedRoutes: false },
  extra: {
    variant: VARIANT,
    apiUrl: API_URL,
    supportsRTL: true,
    router: {},
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
  ...(EAS_PROJECT_ID ? { updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID}` }, runtimeVersion: { policy: "appVersion" } } : {}),
};

export default config;
