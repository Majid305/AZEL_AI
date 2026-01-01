
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        grenadine: {
          DEFAULT: '#C5636C',
          dark: '#A44D55',
        }
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 4s infinite ease-in-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.4))', transform: 'scale(1) rotate(0deg)' },
          '50%': { filter: 'drop-shadow(0 0 25px rgba(255, 255, 255, 0.9))', transform: 'scale(1.08) rotate(5deg)' },
        }
      }
    },
  },
  plugins: [],
}
