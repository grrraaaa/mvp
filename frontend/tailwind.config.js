/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Inter"', "sans-serif"],
      },
      colors: {
        assistant: {
          surface: "#fafbfc",
          "surface-border": "#e8ebef",
        },
        brand: {
          DEFAULT: "#21A038",
        },
        "sber-green": {
          DEFAULT: "#21A038",
          hover: "#1b852e",
        },
        "sber-dark": "#083526",
        "sber-teal": "#138d8a",
        gray: {
          150: "#ebedf0",
          450: "#8a93a0",
          550: "#5a6470",
          705: "#424c5a",
          750: "#3a4350",
          805: "#2f3946",
          850: "#1f2937",
        },
        emerald: {
          150: "#c3eed3",
          250: "#a3e5b9",
          505: "#10b67a",
          850: "#064e2e",
        },
        amber: {
          150: "#fde4a3",
          550: "#d9870a",
        },
        teal: {
          150: "#b7e2e0",
          250: "#95d3d0",
        },
        sky: {
          150: "#c7e2f3",
        },
        indigo: {
          150: "#c7cef9",
        },
        green: {
          150: "#bde6c7",
        },
        red: {
          150: "#f2c7c7",
        },
        rose: {
          150: "#f5c4c5",
        },
        slate: {
          150: "#e0e5ec",
        },
        sbbol: {
          bg: "#F2F4F7",
          primary: "#128e8b",
          "primary-dark": "#107c79",
          "primary-light": "#90D0CC",
          text: "#1F1F22",
          secondary: "#565B62",
          muted: "#7D838A",
          border: "#D0D7DD",
        },
        sber: {
          green: "#21A038",
          "green-dark": "#0A9B2E",
          "green-light": "#64D072",
          "green-deep": "#053517",
          gold: "#FFCD00",
          bg: "#041810",
          panel: "#0a2418",
          "panel-elevated": "#0f2f1c",
          muted: "#9cb8a8",
        },
      },
      boxShadow: {
        "3xs": "0 1px 1px 0 rgb(0 0 0 / 0.03)",
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out",
        scaleIn: "scaleIn 0.18s ease-out",
      },
      borderColor: {
        "sber-border": "rgba(33, 160, 56, 0.28)",
      },
      backgroundImage: {
        "sber-gradient": "linear-gradient(135deg, #053517 0%, #041810 50%, #0a2418 100%)",
      },
    },
  },
  plugins: [],
};
