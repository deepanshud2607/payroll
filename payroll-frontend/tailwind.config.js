/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#0A0A0F',
          50: '#F5F5F8',
          100: '#EBEBF1',
          200: '#D1D1E0',
          300: '#9999B8',
          400: '#6666A0',
          500: '#3D3D6E',
          600: '#2A2A52',
          700: '#1C1C3A',
          800: '#111128',
          900: '#0A0A1A',
        },
        neon: {
          green: '#00FFA3',
          blue: '#00C6FF',
          purple: '#8B5CF6',
        },
        gold: '#F5C842',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0,255,163,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,163,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
