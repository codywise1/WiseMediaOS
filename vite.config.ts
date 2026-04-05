import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv with '' prefix loads ALL .env vars, including non-VITE_ ones like WHEREBY_API_KEY.
  // This is necessary because process.env does NOT read from the .env file automatically.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        // All requests to /api/whereby/* are forwarded to the Whereby REST API.
        // The Bearer token is injected here — it NEVER reaches the browser bundle.
        '/api/whereby': {
          target: 'https://api.whereby.dev',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/whereby/, '/v1'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = env.WHEREBY_API_KEY;
              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
              } else {
                console.warn('[Vite Proxy] WHEREBY_API_KEY not found in .env — requests will be unauthorized.');
              }
              proxyReq.setHeader('Content-Type', 'application/json');
            });
          },
        },
      },
    },
  };
});
