import type { Config } from "tailwindcss";

export default {
  content: ["./client/src/**/*.{ts,tsx}", "./client/index.html"],
  theme: {
    extend: {
      colors: {
        // Farm-inspired earthy palette
        farm: {
          green: "#4a7c59",
          "green-light": "#6b9e7a",
          brown: "#8b6f47",
          cream: "#faf6f0",
          gold: "#d4a843",
          red: "#c44536",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
