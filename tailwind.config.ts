import type { Config } from 'tailwindcss'

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#A78BFA',
          DEFAULT: '#7C3AED',
          dark: '#4C1D95',
        },
        secondary: {
          DEFAULT: '#4B5563',
        },
        background: {
          DEFAULT: '#111827',
        },
        foreground: {
          DEFAULT: '#f9fafb',
        },
        highlight: {
          DEFAULT: '#6B21A8',
        },
        neutral: {
          DEFAULT: '#374151',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
