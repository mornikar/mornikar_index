const fs = require('fs');
const path = require('path');
const https = require('https');

const baseDir = process.argv[2] || __dirname;
const htmlPath = path.join(baseDir, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

const assets = new Set();
const patterns = [
  /href="(\/[^"]+)"/g,
  /src="(\/[^"]+)"/g,
  /url\((\/[^)]+)\)/g,
];

for (const pattern of patterns) {
  let m;
  while ((m = pattern.exec(html)) !== null) {
    let url = m[1].trim();
    if (url.startsWith('//')) continue;
    if (url.startsWith('http')) continue;
    // Strip query params for local path
    const cleanUrl = url.split('?')[0];
    assets.add(cleanUrl);
  }
}

const list = [...assets].sort();
console.log('Found ' + list.length + ' assets to download');
fs.writeFileSync(path.join(baseDir, 'assets.json'), JSON.stringify(list, null, 2));

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 5,
  timeout: 30000,
});

function download(urlPath) {
  const url = 'https://kprverse.com' + urlPath;
  const localPath = path.join(baseDir, urlPath.replace(/^\//, ''));
  const dir = path.dirname(localPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(localPath)) {
    console.log('SKIP: ' + urlPath);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const req = https.get(url, { agent, timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirect = res.headers.location.startsWith('http')
          ? res.headers.location
          : 'https://kprverse.com' + res.headers.location;
        https.get(redirect, { agent, timeout: 30000 }, (res2) => {
          if (res2.statusCode !== 200) {
            console.error('FAIL(redirect): ' + urlPath + ' -> ' + res2.statusCode);
            resolve();
            return;
          }
          const file = fs.createWriteStream(localPath);
          res2.pipe(file);
          file.on('finish', () => { file.close(); console.log('OK: ' + urlPath); resolve(); });
          file.on('error', () => { resolve(); });
        }).on('error', (e) => { console.error('FAIL: ' + urlPath + ' ' + e.message); resolve(); });
        return;
      }
      if (res.statusCode !== 200) {
        console.error('FAIL: ' + urlPath + ' status ' + res.statusCode);
        resolve();
        return;
      }
      const file = fs.createWriteStream(localPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log('OK: ' + urlPath); resolve(); });
      file.on('error', () => { resolve(); });
    }).on('error', (e) => {
      console.error('FAIL: ' + urlPath + ' ' + e.message);
      resolve();
    }).on('timeout', () => {
      req.destroy();
      console.error('TIMEOUT: ' + urlPath);
      resolve();
    });
  });
}

(async () => {
  // Download sequentially to avoid overwhelming the server
  for (const asset of list) {
    await download(asset);
  }
  console.log('\nDone!');
})();
