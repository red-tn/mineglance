import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode primary palette
        primary: '#38a169',
        'primary-light': '#48bb78',
        'primary-dark': '#2f855a',
        accent: '#38a169',
        warning: '#f6ad55',
        danger: '#fc8181',
        // Dark backgrounds
        'dark-bg': '#0a0f1a',
        'dark-card': '#111827',
        'dark-card-hover': '#1a2332',
        'dark-border': '#1f2937',
        'dark-border-light': '#374151',
        // Text colors
        'dark-text': '#f3f4f6',
        'dark-text-muted': '#9ca3af',
        'dark-text-dim': '#6b7280',
        // Legacy (for compatibility)
        background: '#0a0f1a',
        foreground: '#f3f4f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(56, 161, 105, 0.3)',
        'glow-lg': '0 0 40px rgba(56, 161, 105, 0.4)',
        'dark': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(56, 161, 105, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(56, 161, 105, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
