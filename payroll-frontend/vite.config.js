import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/employee': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/organization': 'http://localhost:3000',
    }
  }
})
