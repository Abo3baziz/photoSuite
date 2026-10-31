#!/usr/bin/env node
/**
 * Static-file server for the local fixture website (src/fixture-site).
 * Zero dependencies; used by local dev and the E2E workflow.
 * Usage: node scripts/serve-fixture.mjs [port] [root]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);
const port = Number(args[0] ?? process.env.FIXTURE_PORT ?? 4173);
const rootArg = args[1];
const root = rootArg ? path.resolve(rootArg) : path.resolve(process.cwd(), 'src', 'fixture-site');

if (!existsSync(root)) {
  console.error(`fixture root not found: ${root}`);
  process.exit(1);
}

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function serve(file, res) {
  readFile(file)
    .then((data) => {
      res.writeHead(200, {
        'content-type': MIME.get(path.extname(file).toLowerCase()) ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });
      res.end(data);
    })
    .catch((error) => {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(`fixture server error: ${error instanceof Error ? error.message : String(error)}`);
    });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://fixture.invalid');
  let rel = decodeURIComponent(url.pathname);
  const file = path.join(root, rel === '/' ? 'index.html' : rel);
  if (
    !path.normalize(file).startsWith(path.normalize(root) + path.sep) &&
    path.normalize(file) !== path.normalize(root)
  ) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('forbidden');
    return;
  }
  try {
    const info = await stat(file);
    if (info.isFile()) {
      serve(file, res);
      return;
    }
  } catch {
    /* fall through to SPA-ish fallback below */
  }
  // unknown path: serve 404 page explicitly (fixture must also exercise 404s)
  const notFound = path.join(root, '404.html');
  if (existsSync(notFound)) {
    res.writeHead(404, { 'content-type': MIME.get('.html') });
    res.end(await readFile(notFound));
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`fixture site: http://127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
