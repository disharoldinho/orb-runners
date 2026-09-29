import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      '/ws-summit': {
        target: 'ws://localhost:5174',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});

