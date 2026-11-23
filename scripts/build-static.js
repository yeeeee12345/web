import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT_DIR = path.resolve(__dirname, '..');

export const STATIC_PUBLISH_ENTRIES = [
  'index.html',
  'manifest.json',
  'webgal-engine.json',
  'webgal-serviceworker.js',
  'assets',
  'game',
  'icons',
];

export function buildStaticSite(
  rootDir = DEFAULT_ROOT_DIR,
  outputDir = path.join(rootDir, 'public'),
) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const copied = [];
  for (const entry of STATIC_PUBLISH_ENTRIES) {
    const src = path.join(rootDir, entry);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing required static asset: ${entry}`);
    }
    const dest = path.join(outputDir, entry);
    fs.cpSync(src, dest, { recursive: true });
    copied.push(entry);
  }

  return { outputDir, copied };
}

const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMainModule) {
  const { outputDir, copied } = buildStaticSite();
  console.log(
    `Built static WebGAL output to ${path.relative(DEFAULT_ROOT_DIR, outputDir)}/ (${copied.join(', ')})`,
  );
}
