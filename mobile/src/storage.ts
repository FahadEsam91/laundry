import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/** Secrets (session token) go to the Keychain / Android Keystore; on web previews fall back to localStorage. */
export const secure = {
  get: (k: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.setItem(k, v)) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === "web" ? Promise.resolve(globalThis.localStorage?.removeItem(k)) : SecureStore.deleteItemAsync(k)),
};

/** Non-sensitive preferences (language, cart). */
export const prefs = {
  get: async <T,>(k: string, fallback: T): Promise<T> => {
    try {
      const v = await AsyncStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set: (k: string, v: unknown) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {}),
};
