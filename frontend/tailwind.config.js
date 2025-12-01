/* eslint-env node */
/*****************************************
 * Tailwind CSS Config - Fantasy Tavern Theme
 *****************************************/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fantasy Tavern Color Palette
        // Wood & Leather (Dark backgrounds)
        oak: {
          DEFAULT: '#2C1810',
          light: '#3E2723',
          dark: '#1A0F08',
        },
        leather: {
          DEFAULT: '#4A3728',
          light: '#5D4A3C',
          dark: '#3A2818',
        },
        // Parchment (Content surfaces)
        parchment: {
          DEFAULT: '#F5F0E6',
          light: '#FAF7F0',
          aged: '#EAE0C8',
          old: '#D4C5A0',
        },
        // Text
        ink: {
          DEFAULT: '#3E2723', // Dark brown for readability
          light: '#5D4A3C',
          black: '#1C1B1A',
        },
        // Action Colors
        crimson: {
          DEFAULT: '#8B0000',
          light: '#A52A2A',
          dark: '#660000',
        },
        gold: {
          DEFAULT: '#B8860B',
          light: '#DAA520',
          dark: '#8B6914',
        },
        brass: {
          DEFAULT: '#B5A642',
          light: '#D4AF37',
          dark: '#918B3B',
        },
        forest: {
          DEFAULT: '#2D5016',
          light: '#3A6B1F',
          dark: '#1F3A0F',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 8px 16px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15)',
        'modal': '0 20px 40px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'wood-texture': "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" /%3E%3C/filter%3E%3Crect width=\"100\" height=\"100\" filter=\"url(%23noise)\" opacity=\"0.05\" /%3E%3C/svg%3E')",
        'parchment-texture': "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" /%3E%3C/filter%3E%3Crect width=\"100\" height=\"100\" filter=\"url(%23noise)\" opacity=\"0.03\" /%3E%3C/svg%3E')",
      },
    },
  },
  plugins: [],
};
