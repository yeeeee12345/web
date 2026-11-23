import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTRA_MIME_TYPES = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.json': 'application/json; charset=utf-8',
  '.scss': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const NO_CACHE_EXTENSIONS = new Set(['.txt', '.json', '.css', '.scss', '.html']);
const LONG_CACHE_EXTENSIONS = new Set([
  '.woff2',
  '.woff',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.mp3',
  '.ogg',
  '.m4a',
]);

const BLOCKED_TOP_LEVEL_ENTRIES = new Set([
  'node_modules',
  'server.js',
  'server.test.js',
  'story.test.js',
  'package.json',
  'package-lock.json',
  'serve.py',
]);

export function isBlockedRequestPath(reqPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(reqPath);
  } catch {
    return true;
  }

  const segments = decoded.split('/').filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  if (segments.some((segment) => segment.startsWith('.'))) {
    return true;
  }

  return BLOCKED_TOP_LEVEL_ENTRIES.has(segments[0].toLowerCase());
}

export function createApp(rootDir = __dirname) {
  const app = express();
  app.disable('x-powered-by');

  // Block internal Node.js / config / hidden files from being served publicly
  app.use((req, res, next) => {
    if (isBlockedRequestPath(req.path)) {
      return res.status(404).end();
    }
    next();
  });

  // Suppress WebGAL editor sync probe 404 noise in static runtime
  app.all(['/api/webgalsync', '/api/webgalsync/*splat'], (_req, res) => {
    res.status(204).end();
  });

  app.use(
    express.static(rootDir, {
      dotfiles: 'ignore',
      index: 'index.html',
      setHeaders(res, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (EXTRA_MIME_TYPES[ext]) {
          res.setHeader('Content-Type', EXTRA_MIME_TYPES[ext]);
        }
        if (NO_CACHE_EXTENSIONS.has(ext)) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (LONG_CACHE_EXTENSIONS.has(ext)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    }),
  );

  return app;
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMainModule) {
  const port = Number(process.env.PORT) || 3000;
  const host = '0.0.0.0';
  const app = createApp(__dirname);
  app.listen(port, host, () => {
    console.log(`请和我交往吧 WebGAL server running at http://${host}:${port}/`);
  });
}
