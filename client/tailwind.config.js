/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0a0a0f',
        'night-card': '#12121a',
        'night-border': '#1e1e2e',
        'wolf-red': '#8b1a1a',
        'village-gold': '#c9a227',
        'seer-purple': '#6b21a8',
        'witch-green': '#166534',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { textShadow: '0 0 5px #c9a227, 0 0 10px #c9a227' },
          '100%': { textShadow: '0 0 20px #c9a227, 0 0 40px #c9a227, 0 0 60px #c9a227' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
