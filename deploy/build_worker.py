"""Bundle the static site into a single Cloudflare Worker module.

    python3 deploy/build_worker.py          # writes deploy/dist/worker.mjs
    npx wrangler deploy                      # uses wrangler.toml in the repo root

The whole site (about 0.9 MB) is embedded in the Worker, so no separate
asset upload step is needed.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCLUDE = ['index.html', 'css', 'js', 'assets']
TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
}

files = {}
for item in INCLUDE:
    base = os.path.join(ROOT, item)
    paths = [base] if os.path.isfile(base) else [os.path.join(d, f) for d, _, fs in os.walk(base) for f in fs]
    for p in sorted(paths):
        rel = '/' + os.path.relpath(p, ROOT).replace(os.sep, '/')
        with open(p, encoding='utf-8') as fh:
            files[rel] = [TYPES.get(os.path.splitext(p)[1], 'application/octet-stream'), fh.read()]

WORKER = '''
export default {
  async fetch(request) {
    const url = new URL(request.url);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const f = FILES[path];
    if (!f) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    return new Response(f[1], { headers: {
      'content-type': f[0],
      'cache-control': path.includes('/vendor/') ? 'public, max-age=604800' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'permissions-policy': 'camera=(self), microphone=(), geolocation=()',
    } });
  },
};
'''

out = os.path.join(ROOT, 'deploy', 'dist')
os.makedirs(out, exist_ok=True)
with open(os.path.join(out, 'worker.mjs'), 'w', encoding='utf-8') as fh:
    fh.write('const FILES = ' + json.dumps(files) + ';\n' + WORKER)
print(f'Wrote deploy/dist/worker.mjs with {len(files)} files')
