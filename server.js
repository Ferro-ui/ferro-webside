/* Minimal zero-dependency static server for local preview.
   Serves this file's directory. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT ? Number(process.env.PORT) : 8011;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
    // resolve & block path traversal
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.stat(filePath, (err, stat) => {
      let target = filePath;
      if (!err && stat.isDirectory()) target = path.join(filePath, 'index.html');
      fs.readFile(target, (e, data) => {
        if (e) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 Not Found'); return; }
        const ext = path.extname(target).toLowerCase();
        const headers = {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
          'Accept-Ranges': 'bytes'
        };
        // byte ranges: needed for video playback and seeking (Safari requires them)
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        if (range && (range[1] || range[2])) {
          const size = data.length;
          let start = range[1] ? Number(range[1]) : size - Number(range[2]);
          let end = range[1] && range[2] ? Number(range[2]) : size - 1;
          if (start < 0) start = 0;
          if (end >= size) end = size - 1;
          if (start > end) {
            res.writeHead(416, { 'Content-Range': 'bytes */' + size }); res.end(); return;
          }
          headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + size;
          headers['Content-Length'] = end - start + 1;
          res.writeHead(206, headers);
          res.end(data.subarray(start, end + 1));
          return;
        }
        headers['Content-Length'] = data.length;
        res.writeHead(200, headers);
        res.end(data);
      });
    });
  } catch (ex) {
    res.writeHead(500); res.end('Server error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Ferro preview server on http://127.0.0.1:' + PORT + ' (root: ' + ROOT + ')');
});
