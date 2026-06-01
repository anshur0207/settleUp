export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0f766e',
        surface: '#f8fafc',
        card: '#ffffff',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(15, 118, 110, 0.08)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
