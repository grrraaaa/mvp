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
      colors: {
        sbbol: {
          bg: "#F2F4F7",
          primary: "#107F8C",
          "primary-dark": "#005E7F",
          "primary-light": "#90D0CC",
          text: "#1F1F22",
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
