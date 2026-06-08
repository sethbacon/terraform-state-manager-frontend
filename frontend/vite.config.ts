import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import pkg from './package.json'

export default defineConfig({
  plugins: [react()],
  define: {
    // Exposes the frontend package version to the app at build time so the
    // About dialog can display it (mirrors the registry frontend).
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/swagger.json': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/swagger.yaml': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ready': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) return 'vendor'
          if (id.includes('/@mui/icons-material/')) return 'mui-icons'
          if (id.includes('/@mui/material/') || id.includes('/@emotion/')) return 'mui'
          if (id.includes('/recharts/')) return 'charts'
          if (id.includes('/swagger-ui-react/') || id.includes('/swagger-ui-dist/')) return 'swagger-ui'
        },
      },
    },
  },
})
