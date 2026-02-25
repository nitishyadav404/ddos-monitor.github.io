/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#050812',
          900: '#0a0e27',
          800: '#0d1234',
          700: '#111840',
          600: '#151b3d',
          500: '#1e2553',
          400: '#252e6a',
        },
        cyber: {
          cyan: '#00d4ff',
          blue: '#0070f3',
          purple: '#7928ca',
          green: '#00ff88',
          red: '#ff3366',
          orange: '#ff6b35',
          yellow: '#ffd700',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'counter-up': 'counterUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        counterUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        glow: { '0%': { boxShadow: '0 0 5px #00d4ff' }, '100%': { boxShadow: '0 0 20px #00d4ff, 0 0 40px #00d4ff44' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
