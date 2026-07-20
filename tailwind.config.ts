import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        vb: {
          50: "#fdf3e4",
          100: "#f8e2c0",
          200: "#efc588",
          300: "#e2a557",
          400: "#d1883c",
          500: "#b96f2c",
          600: "#9c5a22",
          700: "#7c451c",
          800: "#5c331a",
          900: "#402413",
          950: "#26150b",
        },
        ink: {
          50: "#fbf6ea",
          100: "#f5ecd8",
          200: "#e6dcc4",
          300: "#cabfa8",
          400: "#a89f8f",
          500: "#7c8299",
          600: "#4a5570",
          700: "#2c3852",
          800: "#1c2740",
          900: "#121a2e",
          950: "#0a0e1a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(185, 111, 44, 0.35)" },
          "50%": { boxShadow: "0 0 40px rgba(185, 111, 44, 0.7)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
