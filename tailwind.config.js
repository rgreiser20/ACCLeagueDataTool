/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        'glow-violet': '0 0 15px rgba(139, 92, 246, 0.45)',
        'glow-emerald': '0 0 15px rgba(16, 185, 129, 0.45)',
      }
    },
  },
  plugins: [],
}
