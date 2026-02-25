import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // When built in GitHub Actions, set the correct base path for Pages
  // Repo: nitishyadav404/ddos-monitor.github.io  →  https://nitishyadav404.github.io/ddos-monitor.github.io/
  base: process.env.GITHUB_ACTIONS ? '/ddos-monitor.github.io/' : '/',

  resolve: {
    dedupe: ['three'],
  },

  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws':  { target: 'ws://localhost:8000',   ws: true },
    },
  },

  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          react:   ['react', 'react-dom'],
          three:   ['three'],
          charts:  ['chart.js', 'react-chartjs-2'],
          motion:  ['framer-motion'],
          zustand: ['zustand'],
        },
      },
    },
  },
})
