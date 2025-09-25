/* eslint-env node */
/*****************************************
 * Tailwind CSS Config (MVP)
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
        // Neutral ink & parchment palette
        parchment: '#F5F0E6', // soft off-white parchment background
        ink: '#1C1B1A',       // near-black ink color
      },
    },
  },
  plugins: [],
};
