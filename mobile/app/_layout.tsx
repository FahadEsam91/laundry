import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SWRConfig } from "swr";
import { useFonts, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic";
import { fetcher, api } from "@/api";
import { AuthProvider, useAuth } from "@/auth";
import { I18nProvider, useI18n } from "@/i18n";
import { CartProvider } from "@/cart";
import { ToastProvider } from "@/toast";
import { registerForPush, routeForUrl } from "@/push";
import { Intro } from "@/intro";

SplashScreen.preventAutoHideAsync().catch(() => {});

function Boot() {
  const { ready, token } = useAuth();
  const { setSettings, lang } = useI18n();
  const router = useRouter();
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    api("/api/config").then((c) => setSettings({ ...c.settings, services: c.services })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // register this device for push once signed in
  useEffect(() => {
    if (token) registerForPush(lang).catch(() => {});
  }, [token, lang]);

  // open the right screen when a notification is tapped
  useEffect(() => {
    if (Platform.OS === "web") return;
    const open = (r: Notifications.NotificationResponse | null) => {
      const path = routeForUrl(r?.notification.request.content.data?.url as string | undefined);
      if (path) router.push(path as any);
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: "#F7F8FA" } }}>
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        <Stack.Screen name="(customer)" options={{ animation: "fade" }} />
      </Stack>
      {intro ? <Intro onDone={() => setIntro(false)} /> : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold });
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <SWRConfig value={{ fetcher, revalidateOnFocus: true }}>
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <ToastProvider>
                <Boot />
              </ToastProvider>
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </SWRConfig>
    </SafeAreaProvider>
  );
}
