/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        daun: '#2b6446',
        'daun-tua': '#1b4530',
        kertas: '#f6f7f3',
        tinta: '#16241d',
        pena: '#1c3a7a',
        kuning: '#9a6408',
        garis: '#d6d9cd',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.015em',
      },
    },
  },
  plugins: [],
}
