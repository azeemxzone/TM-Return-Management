import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Direct route to serve the latest updated Google Apps Script backend code
  app.get('/gas/Code.gs', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(path.resolve(__dirname, 'gas', 'Code.gs'));
  });

  // Google Apps Script Proxy Endpoint
  // Eliminates browser CORS issues and transparently follows Google 302 redirects
  app.post('/api/gas-proxy', async (req, res) => {
    try {
      const { gasUrl, method = 'POST', payload, queryParams } = req.body;

      if (!gasUrl || typeof gasUrl !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid "gasUrl" in proxy request.'
        });
      }

      // Construct target URL with query parameters
      const url = new URL(gasUrl);
      if (queryParams && typeof queryParams === 'object') {
        for (const [key, val] of Object.entries(queryParams)) {
          if (val !== undefined && val !== null) {
            url.searchParams.set(key, String(val));
          }
        }
      }

      const reqMethod = String(method).toUpperCase();
      let gasResponse: Response;

      if (reqMethod === 'GET') {
        gasResponse = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json, text/plain, */*'
          },
          redirect: 'follow'
        });
      } else {
        // Use text/plain or JSON string as expected by Google Apps Script
        const bodyContent = typeof payload === 'string' 
          ? payload 
          : JSON.stringify(payload || {});

        gasResponse = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Accept': 'application/json, text/plain, */*'
          },
          body: bodyContent,
          redirect: 'follow'
        });
      }

      const rawText = await gasResponse.text();
      let parsedData: any = null;

      try {
        parsedData = JSON.parse(rawText);
      } catch {
        // Non-JSON response (e.g. HTML portal or raw text)
        parsedData = {
          success: gasResponse.ok,
          rawText: rawText,
          status: gasResponse.status
        };
      }

      return res.status(200).json(parsedData);
    } catch (err: any) {
      console.error('[GAS Proxy Error]:', err);
      return res.status(500).json({
        success: false,
        error: `Server proxy failed to communicate with Google Apps Script: ${err.message || String(err)}`
      });
    }
  });

  // Attach Vite middleware in development or serve static in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TABBYMART Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[TABBYMART Server Startup Error]:', err);
  process.exit(1);
});
