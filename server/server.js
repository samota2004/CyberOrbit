import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

export async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL-encoded body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const viteConfigFile = path.resolve(__dirname, '../client/vite.config.js');
    const vite = await createViteServer({
      configFile: viteConfigFile,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CyberOrbit SOC] Server running on http://0.0.0.0:${PORT}`);
  });
  return app;
}

startServer().catch((err) => {
  console.error('[CyberOrbit SOC] Failed to start server:', err);
  process.exit(1);
});
