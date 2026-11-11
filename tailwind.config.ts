import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#EEF6FF", 100: "#D9EBFF", 200: "#BBDBFF", 300: "#8CC4FF", 400: "#56A3FD",
          500: "#2F80F7", 600: "#1A62EC", 700: "#144DD8", 800: "#173FAF", 900: "#19398A", 950: "#142454",
        },
        ink: {
          50: "#F7F8FA", 100: "#EEF0F4", 200: "#DDE1E8", 300: "#C2C8D3", 400: "#9AA3B2",
          500: "#6F7A8C", 600: "#535D6E", 700: "#3E4656", 800: "#262D3A", 900: "#151A24", 950: "#0B0E14",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)",
        lift: "0 8px 30px rgba(16,24,40,.12)",
        glow: "0 10px 30px -8px rgba(26,98,236,.55)",
      },
      borderRadius: { "4xl": "2rem" },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
        "slide-up": { "0%": { transform: "translateY(100%)" }, "100%": { transform: "none" } },
        pulse2: { "0%,100%": { transform: "scale(1)", opacity: "1" }, "50%": { transform: "scale(1.6)", opacity: "0" } },
        bubble: { "0%": { transform: "translateY(0) scale(1)", opacity: ".7" }, "100%": { transform: "translateY(-120px) scale(1.4)", opacity: "0" } },
        spin2: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "fade-up": "fade-up .35s ease-out both",
        "slide-up": "slide-up .3s cubic-bezier(.2,.8,.2,1) both",
        ping2: "pulse2 1.8s ease-out infinite",
        bubble: "bubble 3s ease-in infinite",
        drum: "spin2 2.4s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
