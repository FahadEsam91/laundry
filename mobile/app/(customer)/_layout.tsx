import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@/i18n";
import { useAuth } from "@/auth";
import { C, F } from "@/theme";

export default function CustomerTabs() {
  const { t, settings } = useI18n();
  const { me } = useAuth();
  const showPlus = !!settings.memberships || !!me?.member;
  const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, focused }: { color: any; focused: boolean }) => (
    <Ionicons name={(focused ? name : `${name}-outline`) as any} size={23} color={color} />
  );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.ink400,
        tabBarLabelStyle: { fontFamily: F.semibold, fontSize: 11 },
        tabBarStyle: { borderTopColor: C.ink100, height: 84, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t("nav_home"), tabBarIcon: icon("home") }} />
      <Tabs.Screen name="orders" options={{ title: t("nav_orders"), tabBarIcon: icon("receipt") }} />
      <Tabs.Screen name="plus" options={{ title: t("plus_title"), tabBarIcon: icon("diamond"), href: showPlus ? undefined : null }} />
      <Tabs.Screen name="account" options={{ title: t("nav_account"), tabBarIcon: icon("person") }} />
    </Tabs>
  );
}
