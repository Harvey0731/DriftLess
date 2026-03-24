/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#8B5CF6',
        secondary: '#C4B5FD',
        accent: '#10B981',
        background: '#FAF5FF',
        surface: '#FFFFFF',
        text: '#1F2937',
        textSecondary: '#6B7280',
        danger: '#EF4444',
        warning: '#F59E0B',
        calm: '#E0E7FF',
        warmBg: '#FFF7ED',
      },
    },
  },
  plugins: [],
};
