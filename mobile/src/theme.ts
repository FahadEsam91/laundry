import { BRAND } from "./config";

export const C = {
  brand: BRAND,
  brandDark: BRAND === "#059669" ? "#047857" : "#144DD8",
  brandSoft: BRAND === "#059669" ? "#ECFDF5" : "#EEF6FF",
  ink900: "#151A24",
  ink700: "#3E4656",
  ink500: "#6F7A8C",
  ink400: "#9AA3B2",
  ink300: "#C2C8D3",
  ink200: "#DDE1E8",
  ink100: "#EEF0F4",
  ink50: "#F7F8FA",
  white: "#FFFFFF",
  green: "#059669",
  greenSoft: "#ECFDF5",
  amber: "#B45309",
  amberSoft: "#FFFBEB",
  red: "#DC2626",
  redSoft: "#FEF2F2",
  gold: "#FBBF24",
};

export const F = {
  regular: "IBMPlexSansArabic_400Regular",
  medium: "IBMPlexSansArabic_500Medium",
  semibold: "IBMPlexSansArabic_600SemiBold",
  bold: "IBMPlexSansArabic_700Bold",
};

export const R = { sm: 10, md: 14, lg: 20, xl: 28 };

export const shadow = {
  shadowColor: "#101828",
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
