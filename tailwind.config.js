/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050505",
        charcoal: "#09090b",
        surface: "#121317",
        chrome: "#1b1d24",
        paper: "#f5f3ef",
        ember: "#ff6a00",
        emberSoft: "#ff8b3d"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 20px 80px rgba(255,106,0,0.20)",
        glass: "0 18px 70px rgba(0,0,0,0.38)"
      },
      backgroundImage: {
        "ember-grid":
          "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
