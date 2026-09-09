const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { run } = require('./material-review-browser.cjs');

async function main() {
  const staticRoot = path.resolve('.next/static');
  const assets = new Map();
  const styles = [];
  const mime = { '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else {
        const extension = path.extname(file);
        if (!mime[extension]) continue;
        const url = '/_next/static/' + path.relative(staticRoot, file).split(path.sep).map(encodeURIComponent).join('/');
        assets.set(url, { file, type: mime[extension] });
        if (extension === '.css') styles.push(`<link rel="stylesheet" href="${url}">`);
      }
    }
  }
  if (!fs.existsSync(staticRoot)) throw new Error('Run npm run build first; component tests require actual compiled CSS.');
  visit(staticRoot);
  if (!styles.length) throw new Error('No compiled stylesheet found; refusing unstyled visual tests.');
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (request.method !== 'GET') { response.writeHead(405); response.end(); return; }
    const asset = assets.get(pathname);
    if (asset) { response.writeHead(200, { 'Content-Type': asset.type }); response.end(fs.readFileSync(asset.file)); return; }
    if (pathname === '/login') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(`<!doctype html><html><head>${styles.join('')}</head><body>Isolated component test styles only</body></html>`); return;
    }
    // No business API, login bypass or database connection is implemented here.
    response.writeHead(404); response.end();
  });
  const previous = process.env.MATERIAL_BROWSER_BASE_URL;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    process.env.MATERIAL_BROWSER_BASE_URL = `http://127.0.0.1:${server.address().port}`;
    await run();
  } finally {
    if (previous === undefined) delete process.env.MATERIAL_BROWSER_BASE_URL;
    else process.env.MATERIAL_BROWSER_BASE_URL = previous;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
