import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createApp, isBlockedRequestPath } from './server.js';
import { buildStaticSite } from './scripts/build-static.js';

function startTestServer() {
  const app = createApp();
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

test('isBlockedRequestPath blocks server metadata, build config, and hidden paths', () => {
  assert.equal(isBlockedRequestPath('/server.js'), true);
  assert.equal(isBlockedRequestPath('/package.json'), true);
  assert.equal(isBlockedRequestPath('/vercel.json'), true);
  assert.equal(isBlockedRequestPath('/scripts/build-static.js'), true);
  assert.equal(isBlockedRequestPath('/public/index.html'), true);
  assert.equal(isBlockedRequestPath('/node_modules/express/index.js'), true);
  assert.equal(isBlockedRequestPath('/.git/HEAD'), true);
  assert.equal(isBlockedRequestPath('/game/.hidden'), true);
  assert.equal(isBlockedRequestPath('/'), false);
  assert.equal(isBlockedRequestPath('/index.html'), false);
  assert.equal(isBlockedRequestPath('/game/config.txt'), false);
});

test('vercel.json and buildStaticSite produce a clean public/ output directory', () => {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.equal(vercelConfig.outputDirectory, 'public');
  assert.equal(vercelConfig.buildCommand, 'npm run build');

  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'webgal-public-'));
  try {
    const result = buildStaticSite(process.cwd(), tmpOut);
    assert.ok(result.copied.includes('index.html'));
    assert.ok(result.copied.includes('game'));
    assert.equal(fs.existsSync(path.join(tmpOut, 'index.html')), true);
    assert.equal(fs.existsSync(path.join(tmpOut, 'game/config.txt')), true);
    assert.equal(fs.existsSync(path.join(tmpOut, 'assets')), true);
    assert.equal(fs.existsSync(path.join(tmpOut, 'icons')), true);
    assert.equal(fs.existsSync(path.join(tmpOut, 'server.js')), false);
    assert.equal(fs.existsSync(path.join(tmpOut, 'package.json')), false);
    assert.equal(fs.existsSync(path.join(tmpOut, 'vercel.json')), false);
  } finally {
    fs.rmSync(tmpOut, { recursive: true, force: true });
  }
});

test('server serves index, game scripts, Chinese filenames, and handles webgalsync', async () => {
  const { server, baseUrl } = await startTestServer();
  try {
    const homeRes = await fetch(`${baseUrl}/`);
    assert.equal(homeRes.status, 200);
    const homeHtml = await homeRes.text();
    assert.ok(homeHtml.includes('请和我交往吧'));

    const configRes = await fetch(`${baseUrl}/game/config.txt`);
    assert.equal(configRes.status, 200);
    assert.equal(configRes.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(configRes.headers.get('cache-control'), 'no-cache');

    const scssRes = await fetch(`${baseUrl}/game/template/UI/Title/title.scss`);
    assert.equal(scssRes.status, 200);
    assert.equal(scssRes.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(scssRes.headers.get('cache-control'), 'no-cache');

    const chineseImgRes = await fetch(
      `${baseUrl}/game/background/${encodeURIComponent('请和我交往吧.png')}`,
    );
    assert.equal(chineseImgRes.status, 200);
    assert.equal(chineseImgRes.headers.get('cache-control'), 'public, max-age=86400');

    const syncRes = await fetch(`${baseUrl}/api/webgalsync`);
    assert.equal(syncRes.status, 204);

    const blockedRes = await fetch(`${baseUrl}/package.json`);
    assert.equal(blockedRes.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
