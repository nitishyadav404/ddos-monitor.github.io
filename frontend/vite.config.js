import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  resolve: {
    // Ensure one shared copy of three across all packages
    dedupe: ['three'],
  },

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
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
