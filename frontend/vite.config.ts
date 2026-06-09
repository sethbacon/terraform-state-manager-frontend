import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import pkg from './package.json'

// Default to the backend's direct HTTP port. Override with VITE_PROXY_TARGET if
// the backend runs elsewhere (e.g. inside the Docker Compose stack).
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'react-vendor'
          if (id.includes('/node_modules/@mui/icons-material/')) return 'mui-icons'
          if (id.includes('/node_modules/@mui/') || id.includes('/node_modules/@emotion/')) return 'mui'
          if (id.includes('/node_modules/@tanstack/')) return 'query'
          if (id.includes('/node_modules/react-router')) return 'router'
        },
      },
    },
  },
  server: {
    port: 3000,
    host: 'localhost',
    proxy: {
      // Proxy API + probe endpoints to the backend so the SPA is same-origin in dev.
      '/api/': { target: proxyTarget, changeOrigin: true, secure: false },
      '/health': { target: proxyTarget, changeOrigin: true, secure: false },
      '/ready': { target: proxyTarget, changeOrigin: true, secure: false },
    },
  },
})
