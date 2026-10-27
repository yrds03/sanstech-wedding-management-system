import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#FAF8F4',
        surface: '#FFFFFF',
        navy: {
          DEFAULT: '#15263F',
          light: '#223A5E',
          dark: '#0D1829',
        },
        gold: {
          DEFAULT: '#B28A50',
          light: '#D4B483',
          dark: '#8E6B38',
        },
        ink: '#172033',
        border: '#E8E7E2',
        success: '#16805D',
        warning: '#B66F15',
        danger: '#C33F49',
      },
      borderRadius: {
        card: '16px',
        button: '10px',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
