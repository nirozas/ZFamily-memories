/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'catalog-bg': '#fdfcfb',
        'catalog-text': '#2d2621',
        'catalog-accent': '#a0c4ff',
        'pastel-red': '#ffadad',
        'pastel-orange': '#ffd6a5',
        'pastel-yellow': '#fdffb6',
        'pastel-green': '#caffbf',
        'pastel-blue': '#9bf6ff',
        'pastel-indigo': '#a0c4ff',
        'pastel-purple': '#bdb2ff',
        'pastel-pink': '#ffc6ff',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
