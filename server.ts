import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

// Universal persistent config file path
const CONFIG_FILE = path.resolve(__dirname, 'gas-config.json');

const DEFAULT_CONFIG = {
  gasUrl: 'https://script.google.com/macros/s/AKfycbzE4_JnfY5jpz4QnuXY5p2ZDy7SwUpezjouJXNkN2aZmfslYu_IcVAHNd5CggUZNf-7/exec',
  sheetId: '',
  warehousePasscode: 'TBM-PASS-2026',
  credentials: {
    adminPin: '888888',
    operatorPin: '123456'
  },
  updatedAt: new Date().toISOString()
};

function readUniversalConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('[Config Warn]: Could not read gas-config.json, using default', e);
  }
  return { ...DEFAULT_CONFIG };
}

function saveUniversalConfig(patch: any) {
  const current = readUniversalConfig();
  const updated = {
    ...current,
    ...patch,
    credentials: {
      ...current.credentials,
      ...(patch.credentials || {})
    },
    updatedAt: new Date().toISOString()
  };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    const publicConfigFile = path.resolve(__dirname, 'public', 'gas-config.json');
    fs.writeFileSync(publicConfigFile, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Config Error]: Could not write gas-config.json', e);
  }
  return updated;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Universal GAS Config API: Enables single universal URL and credentials across all browsers
  app.get('/api/gas-config', (req, res) => {
    const config = readUniversalConfig();
    res.json({ success: true, ...config });
  });

  app.post('/api/gas-config', (req, res) => {
    try {
      const { gasUrl, sheetId, warehousePasscode, credentials } = req.body;
      const patch: any = {};
      if (gasUrl !== undefined && typeof gasUrl === 'string') patch.gasUrl = gasUrl.trim();
      if (sheetId !== undefined && typeof sheetId === 'string') patch.sheetId = sheetId.trim();
      if (warehousePasscode !== undefined && typeof warehousePasscode === 'string') patch.warehousePasscode = warehousePasscode.trim();
      if (credentials && typeof credentials === 'object') patch.credentials = credentials;

      const updated = saveUniversalConfig(patch);
      console.log(`[Universal Config]: Updated universal GAS URL: ${updated.gasUrl}`);
      res.json({ success: true, config: updated, message: 'Universal configuration saved and active across all stations.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to save universal configuration.' });
    }
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
      let { gasUrl, method = 'POST', payload, queryParams } = req.body;

      // If gasUrl is not provided, automatically use the server's universal configured URL
      if (!gasUrl || typeof gasUrl !== 'string' || gasUrl.trim() === '') {
        const universalConfig = readUniversalConfig();
        gasUrl = universalConfig.gasUrl;
      }

      if (!gasUrl || typeof gasUrl !== 'string' || !gasUrl.startsWith('http')) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid "gasUrl". Please configure the Web App URL in Database & Sync Hub.'
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

      // Check if Google redirected to a Google Accounts Login page (happens when "Who has access" is set to "Only myself" instead of "Anyone")
      if (
        rawText.includes('ServiceLogin') ||
        rawText.includes('accounts.google.com') ||
        rawText.includes('Sign in - Google Accounts') ||
        (gasResponse.url && gasResponse.url.includes('accounts.google.com'))
      ) {
        return res.status(200).json({
          success: false,
          isGoogleLoginRedirect: true,
          error: 'Google Sheet Access Configuration: Google returned a sign-in screen because your Apps Script deployment is set to "Only myself". To keep your Google Sheet private to "Only Me" while allowing the app to sync seamlessly: In Google Apps Script, click Deploy > Manage deployments > Edit (pencil icon) > set "Execute as: Me" and "Who has access: Anyone". Then click Deploy.'
        });
      }

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
