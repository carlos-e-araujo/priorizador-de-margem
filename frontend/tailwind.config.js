/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        surface: {
          app: '#f8fafc',
          card: '#ffffff',
          muted: '#f1f5f9',
          border: '#e2e8f0',
          borderHover: '#cbd5e1',
        },
        content: {
          primary: '#0f172a',
          secondary: '#475569',
          muted: '#64748b',
          subtle: '#94a3b8',
        },
      },
    },
  },
  plugins: [],
}
