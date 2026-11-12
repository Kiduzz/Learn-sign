// Runs the browser self-tests headlessly.
//   python3 -m http.server 8765   (from the repo root, in another terminal)
//   node tests/run.cjs
const { chromium } = require('playwright');
(async () => {
  const base = process.env.BASE_URL || 'http://localhost:8765';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let failed = false;
  for (const path of ['/tests/classifier.html', '/']) {
    await page.goto(base + path);
    if (path === '/') await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
    else await page.waitForFunction(() => ['PASS', 'FAIL'].includes(document.title), null, { timeout: 30000 });
    const title = await page.title();
    const ok = path === '/' ? errors.length === 0 : title === 'PASS';
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${path}${path === '/' ? ' (app loads without errors)' : ''}`);
    if (!ok) failed = true;
  }
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
