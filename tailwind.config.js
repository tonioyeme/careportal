/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mist: "#F3F6F5",
        paper: "#FFFFFF",
        ink: "#182F2B",
        "ink-soft": "#5A6B68",
        line: "#D7E0DE",
        teal: "#1D6A66",
        ochre: "#B0761C",
        agent: "#5A4BD6",
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      keyframes: {
        railIn: {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        cardIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        agentSweep: {
          "0%": { backgroundColor: "rgba(90, 75, 214, 0.10)" },
          "100%": { backgroundColor: "rgba(90, 75, 214, 0)" },
        },
      },
      animation: {
        railIn: "railIn 120ms ease-out both",
        cardIn: "cardIn 160ms ease-out both",
        fadeIn: "fadeIn 140ms ease-out both",
        agentSweep: "agentSweep 1500ms ease-out both",
      },
    },
  },
  plugins: [],
};
