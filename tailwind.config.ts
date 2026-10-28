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
          dark: '#769656',
          light: '#eeeed2',
        },
        slate: {
          850: '#151e2e',
          900: '#0f172a',
          950: '#080c15',
        },
        eval: {
          white: '#f8fafc',
          black: '#1e293b',
        },
        badge: {
          brilliant: '#1baca6',
          great: '#5c8bb0',
          best: '#95bb4a',
          excellent: '#96bc4b',
          good: '#96bc4b',
          book: '#d5a47d',
          inaccuracy: '#f0c15c',
          mistake: '#e69d35',
          blunder: '#ca3431',
          missed: '#dbac16',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
