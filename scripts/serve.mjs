// Serves _site/ under /ferro-webside/ like GitHub Pages does. No dependencies.
// Usage: node scripts/serve.mjs [port]   (0 = a free port; the address is printed)
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', process.env.SITE_OUT || '_site')
const prefix = '/ferro-webside/'
const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.ttf': 'font/ttf'}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/') { res.writeHead(302, {Location: prefix}); return res.end() }
  if (!url.pathname.startsWith(prefix)) { res.writeHead(404); return res.end('Not found') }
  let file = path.join(root, decodeURIComponent(url.pathname.slice(prefix.length)))
  if (!file.startsWith(root)) { res.writeHead(403); return res.end() }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(301, {Location: url.pathname + '/'}); return res.end() }
    file = path.join(file, 'index.html')
  }
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found') }
  const size = fs.statSync(file).size
  const headers = {'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes'}
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '')
  if (range) {
    const start = Number(range[1] || 0), end = range[2] ? Number(range[2]) : size - 1
    res.writeHead(206, {...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1})
    return fs.createReadStream(file, {start, end}).pipe(res)
  }
  res.writeHead(200, {...headers, 'Content-Length': size})
  fs.createReadStream(file).pipe(res)
})
server.listen(Number(process.argv[2] ?? process.env.PORT ?? 8030), '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${server.address().port}${prefix}`)
})
