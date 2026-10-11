import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const apiPort = Number(process.env.PDI_PORT ?? 5174)
const webPort = Number(process.env.PDI_WEB_PORT ?? 5173)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: webPort,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${apiPort}` },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
