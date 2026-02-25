import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // ─── KEY FIX ───────────────────────────────────────────────────────────────
  // three-globe@2.27+ imports `three/webgpu` and `three/tsl` — subpath exports
  // only present in Three.js r163+. Vite's esbuild pre-bundler can't resolve
  // them at startup. Excluding globe.gl / three-globe from optimizeDeps tells
  // Vite to serve them as-is (they're already valid ESM) and skip pre-bundling.
  optimizeDeps: {
    exclude: ['globe.gl', 'three-globe'],
  },

  resolve: {
    // Make sure all packages share one copy of three at runtime
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
    target: 'esnext',   // needed so three-globe's ESM top-level await works
    rollupOptions: {
      output: {
        manualChunks: {
          react:   ['react', 'react-dom'],
          charts:  ['chart.js', 'react-chartjs-2'],
          motion:  ['framer-motion'],
          zustand: ['zustand'],
        },
      },
    },
  },
})
