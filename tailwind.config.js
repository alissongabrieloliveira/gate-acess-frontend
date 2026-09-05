/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Paleta da tela de login (Figma) — reaproveitar em outras telas para
        // manter a identidade visual (verde institucional da portaria).
        brand: {
          DEFAULT: '#2a5243',
          50: '#eaf1ec',
        },
        page: '#f2f6f3',
        ink: '#1c2e24',
        muted: '#52655a',
        line: '#d5e0dc',
      },
    },
  },
}
