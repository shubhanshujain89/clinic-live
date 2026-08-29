import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function whatsappApiPlugin(): Plugin {
  return {
    name: 'whatsapp-api-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/whatsapp/webhook')) {
          if (req.method === 'GET') {
            const urlObj = new URL(url, 'http://localhost');
            const challenge = urlObj.searchParams.get('hub.challenge');
            res.setHeader('Content-Type', 'text/plain');
            res.statusCode = 200;
            res.end(challenge || 'EVENT_RECEIVED');
            return;
          }
          if (req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ status: 'EVENT_RECEIVED' }));
            return;
          }
        }
        if (url.startsWith('/api/whatsapp/send-template') && req.method === 'POST') {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({
                success: true,
                messageId: `wamid.HBgL${Date.now()}`,
                to: body.to,
                status: 'accepted',
                timestamp: new Date().toISOString()
              }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), whatsappApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
