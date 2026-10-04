import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^@\/lib\/api$/,
        replacement: path.resolve(import.meta.dirname, './src/lib/api/index.ts'),
      },
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
    ],
  },
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:18080',
        changeOrigin: true,
      },
    },
  },
})
