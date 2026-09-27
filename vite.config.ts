import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cpSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import trackHandler from './api/track';
import adsenseConfigHandler from './api/adsense-config';
import loginHandler from './api/admin/login';
import logoutHandler from './api/admin/logout';
import statsHandler from './api/admin/stats';
import adsenseAdminHandler from './api/admin/adsense';
import statsResetHandler from './api/admin/stats-reset';
import trackingHandler from './api/admin/tracking';
import healthHandler from './api/health';

const rootDir = dirname(fileURLToPath(import.meta.url));
const pdfjsDir = resolve(rootDir, 'node_modules/pdfjs-dist');

const ASSET_DIRS = ['cmaps', 'standard_fonts', 'wasm', 'iccs'] as const;

/** Dev: sajikan aset pdf.js langsung dari node_modules via middleware. */
function pdfjsAssetsDev(): Plugin {
  return {
    name: 'piclite-pdfjs-assets-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const match = /^\/pdfjs\/(cmaps|standard_fonts|wasm|iccs)\/(.+)$/.exec(url);
        if (!match) return next();
        try {
          const filePath = resolve(pdfjsDir, match[1], match[2]);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.end(readFileSync(filePath));
        } catch {
          res.statusCode = 404;
          res.end();
        }
      });
    },
  };
}

/** Build: salin aset pdf.js ke dist/pdfjs agar tersedia di hosting statis. */
function pdfjsAssetsBuild(): Plugin {
  return {
    name: 'piclite-pdfjs-assets-build',
    apply: 'build',
    closeBundle() {
      for (const dir of ASSET_DIRS) {
        cpSync(resolve(pdfjsDir, dir), resolve(rootDir, 'dist/pdfjs', dir), { recursive: true });
      }
    },
  };
}

/**
 * Dev: jalankan fungsi serverless folder api/ langsung di Vite agar #admin,
 * tracking, dan AdSense bisa dites lokal tanpa `vercel dev`. Produksi tetap
 * memakai fungsi Vercel asli — kode handler yang sama persis.
 */
function devApi(): Plugin {
  return {
    name: 'piclite-dev-api',
    apply: 'serve',
    configureServer(server) {
      // Muat .env ke process.env (Vite hanya meng-expose VITE_* ke import.meta.env).
      try {
        const text = readFileSync(resolve(rootDir, '.env'), 'utf8');
        for (const line of text.split(/\r?\n/)) {
          const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
          if (m && process.env[m[1]] === undefined) {
            process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
          }
        }
      } catch {
        /* .env belum ada — API akan menjawab error yang jelas */
      }

      type AnyHandler = typeof trackHandler;
      const handlers: Record<string, Record<string, AnyHandler>> = {
        '/api/track': { POST: trackHandler },
        '/api/adsense-config': { GET: adsenseConfigHandler },
        '/api/admin/login': { POST: loginHandler },
        '/api/admin/logout': { POST: logoutHandler },
        '/api/admin/stats': { GET: statsHandler },
        '/api/admin/adsense': { GET: adsenseAdminHandler, POST: adsenseAdminHandler },
        '/api/admin/stats-reset': { POST: statsResetHandler },
        '/api/admin/tracking': { GET: trackingHandler, POST: trackingHandler },
        '/api/health': { GET: healthHandler },
      };

      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        const method = (req.method ?? 'GET').toUpperCase();
        const handler = handlers[url]?.[method];
        if (!handler) return next();

        // Kumpulkan body mentah lalu parse JSON (bentuk seperti req.body Vercel).
        let body: unknown = undefined;
        if (method === 'POST') {
          const raw = await new Promise<string>((resolveBody) => {
            let data = '';
            req.on('data', (chunk) => (data += chunk));
            req.on('end', () => resolveBody(data));
          });
          try {
            body = raw ? JSON.parse(raw) : {};
          } catch {
            body = {};
          }
        }

        // Adaptor kecil: bentuk req/res Node → bentuk req/res Vercel.
        const shimReq = { method, headers: req.headers, body, url: req.url };
        const shimRes = {
          setHeader: (name: string, value: string) => res.setHeader(name, value),
          status: (code: number) => ({
            json: (data: unknown) => {
              res.statusCode = code;
              res.setHeader('Content-Type', 'application/json');
              res.end(data === undefined ? '' : JSON.stringify(data));
            },
            end: () => {
              res.statusCode = code;
              res.end();
            },
          }),
        };

        try {
          await handler(shimReq as Parameters<AnyHandler>[0], shimRes as Parameters<AnyHandler>[1]);
        } catch (err) {
          console.error('dev-api error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'server_error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), pdfjsAssetsDev(), devApi(), pdfjsAssetsBuild()],
});
