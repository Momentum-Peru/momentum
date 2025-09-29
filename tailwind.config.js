/** @type {import('tailwindcss').Config} */

import PrimeUI from 'tailwindcss-primeui';

module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  theme: {
    extend: {
      // Solo colores esenciales para el layout
      colors: {
        primary: {
          DEFAULT: '#000000',
          foreground: '#ffffff',
        },
      },
      // Configuración de fuentes
      fontFamily: {
        'alan-sans': ['Alan Sans', 'sans-serif'],
        playfair: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography'), PrimeUI],
};
