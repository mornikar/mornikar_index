/**
 * KPR 图片补全 v3 — 通过本地 server.js 代理下载 403 资源
 * 先直连，403 则走 localhost:5679 代理
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BASE_DIR = __dirname;
const UPSTREAM = 'https://kprverse.com';
const LOCAL_PROXY = 'http://localhost:5679';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://kprverse.com/',
};

const JSON_HEADERS = {
  ...HEADERS,
  'Accept': 'application/json, */*',
};

const agent = new https.Agent({ keepAlive: true, maxSockets: 2, timeout: 30000 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 2, timeout: 30000 });

function downloadViaProxy(urlPath) {
  return new Promise((resolve) => {
    const req = http.get(LOCAL_PROXY + urlPath, { agent: httpAgent, timeout: 30000, headers: HEADERS }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve({ status: res.statusCode, size: 0 });
        return;
      }
      const localPath = path.join(BASE_DIR, urlPath.replace(/^\//, ''));
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // Skip if already exists and > 100 bytes
      if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100) {
        res.resume();
        resolve({ status: 200, size: fs.statSync(localPath).size, cached: true });
        return;
      }

      const file = fs.createWriteStream(localPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = fs.statSync(localPath).size;
        resolve({ status: 200, size });
      });
      file.on('error', () => resolve({ status: 200, size: 0, writeError: true }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.code }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

// ── 要下载的完整列表 ──
// 从 Home.js 提取的帧序列 + 已知固定路径
const SEQUENCES = [
  { base: '/images/tableau/keep/character-light/character-light', maxFrames: 5 },
  { base: '/images/tableau/keep/beam-ship/beam-ship', maxFrames: 5 },
  { base: '/images/tableau/keep/kai/kai', maxFrames: 8 },
  { base: '/images/tableau/factions/energy-left/energy-left', maxFrames: 4 },
  { base: '/images/tableau/factions/energy-right/energy-right', maxFrames: 4 },
  { base: '/images/tableau/universe/beam/beam', maxFrames: 8 },
  { base: '/images/tableau/universe/magic/magic', maxFrames: 3 },
];

const EXTRA_PATHS = [
  '/images/collection/character-1.png',
  '/images/compressed/webp/tableau/keep/character-light/character-light-0.webp',
  '/images/compressed/webp/tableau/keep/character-light/character-light-1.webp',
  '/images/compressed/webp/tableau/keep/character-light/character-light-2.webp',
  '/images/compressed/webp/tableau/keep/beam-ship/beam-ship-0.webp',
  '/images/compressed/webp/tableau/keep/beam-ship/beam-ship-1.webp',
  '/images/compressed/webp/tableau/keep/beam-ship/beam-ship-2.webp',
  '/images/compressed/webp/tableau/keep/kai/kai-0.webp',
  '/images/compressed/webp/tableau/keep/kai/kai-1.webp',
  '/images/compressed/webp/tableau/keep/kai/kai-2.webp',
  '/images/compressed/webp/tableau/keep/kai/kai-3.webp',
  '/images/compressed/webp/tableau/factions/energy-left/energy-left-0.webp',
  '/images/compressed/webp/tableau/factions/energy-left/energy-left-1.webp',
  '/images/compressed/webp/tableau/factions/energy-right/energy-right-0.webp',
  '/images/compressed/webp/tableau/factions/energy-right/energy-right-1.webp',
  '/images/compressed/webp/tableau/universe/beam/beam-0.webp',
  '/images/compressed/webp/tableau/universe/beam/beam-1.webp',
  '/images/compressed/webp/tableau/universe/beam/beam-2.webp',
  '/images/compressed/webp/tableau/universe/beam/beam-3.webp',
  '/images/compressed/webp/tableau/universe/beam/beam-4.webp',
  '/images/compressed/webp/tableau/universe/magic/magic-0.webp',
];

async function main() {
  console.log('=== KPR 图片补全 v3 (via server.js proxy) ===\n');

  let ok = 0, skip = 0, fail = 0;

  // Check server.js is running
  try {
    await new Promise((resolve, reject) => {
      http.get(LOCAL_PROXY + '/', { timeout: 3000 }, (res) => {
        res.resume();
        resolve();
      }).on('error', reject);
    });
  } catch (e) {
    console.error('❌ server.js 没在运行！请先: node server.js');
    process.exit(1);
  }

  // 1. Download frame sequences (JSON)
  console.log('--- 帧序列 JSON ---');
  for (const seq of SEQUENCES) {
    for (let i = 0; i <= seq.maxFrames; i++) {
      const p = `${seq.base}-${i}.json`;
      const r = await downloadViaProxy(p);
      if (r.cached) { skip++; continue; }
      if (r.status === 200 && r.size > 100) {
        ok++;
        console.log(`  ✅ ${p} (${(r.size/1024).toFixed(1)}KB)`);
      } else {
        fail++;
        console.log(`  ❌ ${p} (status=${r.status})`);
      }
    }
  }

  // 2. Download extra paths
  console.log('\n--- 其他资源 ---');
  for (const p of EXTRA_PATHS) {
    const r = await downloadViaProxy(p);
    if (r.cached) { skip++; continue; }
    if (r.status === 200 && r.size > 100) {
      ok++;
      console.log(`  ✅ ${p} (${(r.size/1024).toFixed(1)}KB)`);
    } else {
      fail++;
      console.log(`  ❌ ${p} (status=${r.status})`);
    }
  }

  // 3. Storyblok CDN images from __NUXT__
  console.log('\n--- Storyblok CDN ---');
  const html = fs.readFileSync(path.join(BASE_DIR, 'index.html'), 'utf8');
  const sbUrls = new Set();
  const re = /https?:\/\/a\.storyblok\.com\/[^\s"'\\),}\]]+/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    let url = m[0].replace(/[),;]+$/, '');
    if (!url.endsWith('.zip')) sbUrls.add(url);
  }
  // Also find image URLs in __NUXT__ data (look for .png/.jpg/.webp)
  const imgRe = /https?:\/\/[a-z0-9-]+\.[a-z]+\.com\/[^\s"'\\),}\]]+\.(png|jpg|jpeg|webp|gif)/g;
  while ((m = imgRe.exec(html)) !== null) {
    sbUrls.add(m[0].replace(/[),;]+$/, ''));
  }

  if (sbUrls.size === 0) {
    console.log('  (未找到 Storyblok 图片 URL)');
  }
  for (const url of sbUrls) {
    const localName = url.replace(/https?:\/\//, '').replace(/[/?=&]/g, '_');
    const localPath = path.join(BASE_DIR, '_storyblok', localName);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100) {
      skip++;
      continue;
    }
    try {
      const r = await new Promise((resolve) => {
        const req = https.get(url, { agent, headers: HEADERS, timeout: 30000 }, (res) => {
          if (res.statusCode !== 200) { res.resume(); resolve({ status: res.statusCode }); return; }
          const file = fs.createWriteStream(localPath);
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve({ status: 200, size: fs.statSync(localPath).size }); });
          file.on('error', () => resolve({ status: 200, size: 0 }));
        });
        req.on('error', () => resolve({ status: 0 }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 0 }); });
      });
      if (r.status === 200 && r.size > 100) {
        ok++;
        console.log(`  ✅ ${url.substring(0, 80)}... (${(r.size/1024).toFixed(1)}KB)`);
      } else {
        fail++;
        console.log(`  ❌ ${url.substring(0, 80)}... (status=${r.status})`);
      }
    } catch (e) {
      fail++;
    }
  }

  // Summary
  console.log(`\n=== 结果: ✅${ok} ⏭️${skip} ❌${fail} ===`);

  // Count final files
  let totalFiles = 0;
  let totalSize = 0;
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const s = fs.statSync(full);
        if (s.size > 100) { totalFiles++; totalSize += s.size; }
      }
    }
  }
  walk(path.join(BASE_DIR, 'images'));
  console.log(`images/ 有效文件: ${totalFiles} 个, 总计: ${(totalSize/1024/1024).toFixed(1)}MB`);
}

main();
