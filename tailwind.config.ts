import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        /*
         * Paleta institucional UNC
         * El tono 600 representa el verde principal de marca.
         */
        unc: {
          50: "#EFF8F5",
          100: "#D9EFE8",
          200: "#B8DFD2",
          300: "#84C9B3",
          400: "#4DAF8F",
          500: "#1F9674",
          600: "#007E5D",
          700: "#00664C",
          800: "#005A43",
          900: "#073D30",
          950: "#050D0A",
          verde: {
  50: '#E6FFE6',
  100: '#B8FFB8',
  200: '#8AFF8A',
  300: '#5CFF5C',
  400: '#2EFF2E',
  500: '#00FF00',
  600: '#00D100',
  700: '#00A300',
  800: '#008000',
  900: '#004700',
  950: '#001A00',
},
        },
        

        /*
         * Colores semánticos del portal
         */
        institutional: {
  ink: '#1F2925',
  night: '#0B281F',
  deep: '#1c8f6a',
  graphite: '#1e6b4c',
  gray: '#767c7a',
  muted: '#B7C5BF',
  border: '#DCE4E0',
  surface: '#F4F7F5',
  softWhite: '#F5F8F6',
  white: '#FFFFFF',
  gold: '#a07e05',
},

        /*
         * Colores nacionales.
         * Uso restringido a contextos patrios y ceremoniales.
         */
        paraguay: {
          red: "#D52B1E",
          blue: "#0038A8",
          yellow: "#F9C900",
        },
      },

      boxShadow: {
        "unc-card":
          "0 14px 40px -24px rgba(5, 13, 10, 0.28)",
        "unc-card-hover":
          "0 24px 54px -24px rgba(0, 126, 93, 0.28)",
        "unc-glass":
          "0 32px 80px -24px rgba(0, 0, 0, 0.65)",
        "unc-button":
          "0 12px 30px -10px rgba(0, 126, 93, 0.5)",
      },

      backgroundImage: {
        "unc-hero":
          "linear-gradient(135deg, #050D0A 0%, #071612 48%, #0B281F 100%)",

        "unc-green":
          "linear-gradient(135deg, #007E5D 0%, #005A43 100%)",

        "unc-overlay":
          "linear-gradient(to bottom, rgba(5,13,10,0.30), rgba(5,13,10,0.72) 55%, rgba(5,13,10,0.96) 100%)",
      },
    },
  },

  plugins: [],
};

export default config;