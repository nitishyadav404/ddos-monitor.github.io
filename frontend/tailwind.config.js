/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030a05',
          900: '#060f08',
          800: '#0a1a0c',
          700: '#0e2212',
          600: '#122818',
          500: '#1a3a22',
          400: '#224d2c',
        },
        cyber: {
          green:   '#00ff88',   // PRIMARY — hacker green
          green2:  '#39ff14',   // neon green accent
          purple:  '#bf5fff',   // hacker purple
          purple2: '#7928ca',   // deep purple
          cyan:    '#00d4ff',   // cold highlight
          red:     '#ff3366',   // critical severity
          orange:  '#ff6b35',   // high severity
          yellow:  '#ffd700',   // medium severity
          dim:     '#1a3a22',   // muted bg panels
        },
        // severity palette used by AttackList + ControlBar badges
        severity: {
          critical: '#ff3366',
          high:     '#ff6b35',
          medium:   '#ffd700',
          low:      '#00ff88',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'counter-up':   'counterUp 0.3s ease-out',
        'slide-in':     'slideIn 0.3s ease-out',
        'fade-in':      'fadeIn 0.2s ease-out',
        'glow-green':   'glowGreen 2s ease-in-out infinite alternate',
        'glow-purple':  'glowPurple 2s ease-in-out infinite alternate',
        'spin-slow':    'spin 8s linear infinite',
        'scan-line':    'scanLine 4s linear infinite',
        'flicker':      'flicker 5s ease-in-out infinite',
      },
      keyframes: {
        counterUp:  { '0%': { opacity:'0', transform:'translateY(10px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        slideIn:    { '0%': { opacity:'0', transform:'translateX(-20px)' }, '100%': { opacity:'1', transform:'translateX(0)' } },
        fadeIn:     { '0%': { opacity:'0' }, '100%': { opacity:'1' } },
        glowGreen:  { '0%': { boxShadow:'0 0 5px #00ff88' }, '100%': { boxShadow:'0 0 20px #00ff88, 0 0 40px #00ff8844' } },
        glowPurple: { '0%': { boxShadow:'0 0 5px #bf5fff' }, '100%': { boxShadow:'0 0 20px #bf5fff, 0 0 40px #bf5fff44' } },
        scanLine:   { '0%': { transform:'translateY(-100%)' }, '100%': { transform:'translateY(100vh)' } },
        flicker:    { '0%,100%': { opacity:'1' }, '92%': { opacity:'1' }, '93%': { opacity:'0.8' }, '94%': { opacity:'1' }, '97%': { opacity:'0.9' } },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        'green-sm':   '0 0 8px rgba(0,255,136,0.3)',
        'green-md':   '0 0 16px rgba(0,255,136,0.4)',
        'purple-sm':  '0 0 8px rgba(191,95,255,0.3)',
        'purple-md':  '0 0 16px rgba(191,95,255,0.4)',
        'panel':      '0 4px 24px rgba(0,0,0,0.8)',
      },
    },
  },
  plugins: [],
}
