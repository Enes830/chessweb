import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        board: {
          dark: '#739552',
          light: '#ebecd0',
        },
        zinc: {
          850: '#1e212b',
          900: '#141721',
          950: '#0d0f17',
        },
        slate: {
          850: '#151b28',
          900: '#0e131f',
          950: '#090d16',
        },
        badge: {
          brilliant: '#14b8a6',
          great: '#3b82f6',
          best: '#10b981',
          excellent: '#22c55e',
          good: '#4ade80',
          book: '#a1a1aa',
          inaccuracy: '#eab308',
          mistake: '#f97316',
          blunder: '#ef4444',
          missed: '#ec4899',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
