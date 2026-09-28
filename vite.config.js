import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@inertiajs/react': path.resolve(import.meta.dirname, './src/Utils/inertia-adapter.jsx'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
})
