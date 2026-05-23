import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Source maps in prod — temporary debugging aid for the React #185
    // loop. ~1MB added to deploy but we get readable stack traces.
    // Remove once the bug is resolved.
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
  },
})
