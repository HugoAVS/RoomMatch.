/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'petroleo': '#164E63',
        'menta': '#2DD4BF',
        'gris-fondo': '#F8FAFC',
        'gris-texto': '#334155',
        'coral': '#F43F5E',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
      },
      boxShadow: {
        card: '0 10px 25px -5px rgba(22, 78, 99, 0.08)',
      },
    },
  },
  plugins: [],
};
