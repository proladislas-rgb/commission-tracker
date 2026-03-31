import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#07080d',
        surface:  '#0f1117',
        raised:   '#151a24',
        border:   'rgba(255,255,255,0.07)',
        border2:  'rgba(255,255,255,0.12)',
        txt:      '#e8edf5',
        txt2:     '#8898aa',
        txt3:     '#3d4f63',
        indigo:   '#6366f1',
        indigo2:  '#818cf8',
        amber:    '#f59e0b',
        emerald:  '#10b981',
        green:    '#22c55e',
        rose:     '#f43f5e',
        sky:      '#38bdf8',
        violet:   '#8b5cf6',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        card:   '14px',
        btn:    '8px',
      },
      boxShadow: {
        card:   '0 4px 24px rgba(0,0,0,0.4)',
        raised: '0 8px 32px rgba(0,0,0,0.5)',
      },
      width: {
        sidebar: '220px',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        fadeIn:  'fadeIn 0.3s ease forwards',
        pulse2:  'pulse2 1.5s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
