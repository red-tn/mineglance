/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#38a169',
          light: '#48bb78',
        },
        accent: {
          DEFAULT: '#38a169',
          light: '#48bb78',
        },
        danger: '#f56565',
        warning: '#ecc94b',
        // Dark mode colors (default)
        dark: {
          bg: '#0a0a0a',
          card: '#141414',
          cardHover: '#1a1a1a',
          border: '#2a2a2a',
        },
        // Light mode colors
        light: {
          bg: '#f7fafc',
          card: '#ffffff',
          cardHover: '#f1f5f9',
          border: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(56, 161, 105, 0.3)',
        'glow-md': '0 0 30px rgba(56, 161, 105, 0.4)',
      },
    },
  },
  plugins: [],
}
