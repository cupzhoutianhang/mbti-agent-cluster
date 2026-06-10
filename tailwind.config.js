/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        primary: '#111827',
        secondary: '#374151',
        tertiary: '#6B7280',
        border: '#E5E7EB',
        blue: {
          DEFAULT: '#2563EB',
          light: '#DBEAFE',
        },
        green: '#22C55E',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}