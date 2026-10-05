import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101820",
        paper: "#f4f7fb",
        line: "#d6dee8",
        signal: "#1167b1",
        mint: "#e6f6ff",
        night: "#0b1726",
        steel: "#52677c",
        amber: "#b7791f",
        fault: "#b42318",
        secure: "#16a34a",
        vault: "#d7f2df"
      },
      boxShadow: {
        panel: "0 18px 50px rgba(11,23,38,0.10)"
      }
    }
  },
  plugins: []
};

export default config;
