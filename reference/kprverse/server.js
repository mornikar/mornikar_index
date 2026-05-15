/**
 * KPR verse 本地镜像服务器
 * 策略：本地文件优先，缺失资源从 kprverse.com 实时代理
 * HTML 保持绝对路径不变，JS 动态 import 正常工作
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 5679;
const ROOT = __dirname;
const UPSTREAM = 'https://kprverse.com';

process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err && err.stack || err);
});

process.on('unhandledRejection', (err) => {
  console.error('[server] unhandledRejection:', err && err.stack || err);
});

// ── Server-side __NUXT__ HTML patching ──
// Replaces string values in the __NUXT__ payload directly in the HTML source.
// This ensures Vue hydrates with patched data — no browser timing issues.
function patchNuxtHtml(html, config) {
  if (!config) return html;

  // Comprehensive server-side __NUXT__ patching
  // ALL text replacements are applied at the HTML source level,
  // so Vue hydrates with Mornikar data from the start.
  // This makes changes PERMANENT — even if content-patcher.js fails,
  // the page will show Mornikar content.
  const patches = [];

  // ── Site ──
  if (config.site) {
    if (config.site.title) patches.push({ from: 'KPR | Story', to: config.site.title });
  }

  // ── Landing (Block 0: HomeLanding) ──
  if (config.landing) {
    const l = config.landing;
    patches.push({ from: 'KPR is a brand that focuses on collective narrative and empowering storytellers. Keepers is a living story, an uncharted world waiting to be explored, to be imagined.', to: l.desc });
    if (l.keep) patches.push({ from: 'Keep', to: l.keep });
    if (l.protect) patches.push({ from: 'Protect', to: l.protect });
    if (l.reimagine) patches.push({ from: 'Reimagine', to: l.reimagine });
  }

  // ── Story Intro (Block 1: HomeStoryIntro) ──
  if (config.storyIntro) {
    const s = config.storyIntro;
    patches.push({ from: 'A familiar world... Set on a different path.', to: s.title });
    patches.push({ from: 'Isolated within the New Eden safe zone, you witness humanity struggling to avoid descending into chaos.', to: s.body });
    if (s.video_caption) patches.push({ from: 'Trailer V.004', to: s.video_caption });
    if (s.character_caption) patches.push({ from: 'Animus character', to: s.character_caption });
    if (s.image_caption_medium) patches.push({ from: 'Animus Character', to: s.image_caption_medium });
  }

  // ── Story Project (Block 2: HomeStoryProject) ──
  if (config.storyProject) {
    const sp = config.storyProject;
    patches.push({ from: 'You are a Keeper: an agent of power and change in this world.', to: sp.strapline_1 });
    patches.push({ from: 'What will you do with this power? Will you choose to protect or destroy? To give or to take?', to: sp.strapline_2 });
    if (sp.console_text_loading) patches.push({ from: '//Initializing\\nKeeper Story\\n\\nLoading...[47%]\\n\\nLocation_Data\\nCharacter_Attributes\\nKLMx Transmissions', to: sp.console_text_loading });
    if (sp.console_text_coordinates) patches.push({ from: 'N 35\\u00b027.37\\nE 139\\u00b038.57', to: sp.console_text_coordinates });
  }

  // ── Collection (Block 3: HomeCollectionIntro) ──
  if (config.collection) {
    const c = config.collection;
    if (c.name) patches.push({ from: 'Initial Collection', to: c.name });
    if (c.size) patches.push({ from: '10K', to: c.size });
    if (c.launch_date) patches.push({ from: 'TBA', to: c.launch_date });
    if (c.launch_label) patches.push({ from: 'Launch at', to: c.launch_label });
    if (c.caption_1) patches.push({ from: 'Kai Crystal', to: c.caption_1 });
    if (c.caption_2) patches.push({ from: 'Windows to the Soul', to: c.caption_2 });
  }

  // ── Collection Gallery (Block 4: HomeCollectionGallery) ──
  if (config.collectionGallery) {
    const g = config.collectionGallery;
    patches.push({ from: '10,000 unique digital collectibles. ', to: g.heading });
    if (g.body) patches.push({ from: 'Every Keeper is born, endowed with attributes from a collection of over 400 meticulously hand-painted assets. They are personable, iconic possessions that represent KPR\'s foundational pillars of evolution, inclusion, and imagination.', to: g.body });
    if (g.description) patches.push({ from: 'A curated collection of 10,000 unique digital collectibles, each with its own traits and rarity.', to: g.description });
    if (g.console_text) patches.push({ from: 'Initial Collection', to: g.console_text });
  }

  // ── Tableaux (Blocks 5-7) ──
  if (config.tableaux) {
    if (config.tableaux.keep) {
      patches.push({ from: 'The last stronghold of all knowledge. The Keep is where all the value accrues. A place to wonder, protect, and fight for.', to: config.tableaux.keep.description });
      if (config.tableaux.keep.console_text) patches.push({ from: 'The Keep', to: config.tableaux.keep.console_text });
    }
    if (config.tableaux.factions) {
      patches.push({ from: 'One world, two factions. Divided in belief, united in purpose.', to: config.tableaux.factions.description });
      if (config.tableaux.factions.console_text) patches.push({ from: 'Factions', to: config.tableaux.factions.console_text });
    }
    if (config.tableaux.universe) {
      patches.push({ from: "The discovery of Kai, the world\\'s primordial energy source, heralded mankind\\'s Golden Age. Or so they believed.", to: config.tableaux.universe.description });
      if (config.tableaux.universe.console_text) patches.push({ from: 'The World', to: config.tableaux.universe.console_text });
    }
  }

  // ── Launch (Block 8) ──
  if (config.launch) {
    const l = config.launch;
    patches.push({ from: 'What path will you forge as you become the Keeper of your destiny?', to: l.description });
    if (l.cta_label) patches.push({ from: 'Launch Sep 9', to: l.cta_label });
    if (l.console_text) patches.push({ from: 'Become a Keeper', to: l.console_text });
    if (l.link_caption_keep) patches.push({ from: 'The Keep', to: l.link_caption_keep });
    if (l.link_caption_factions) patches.push({ from: 'Factions', to: l.link_caption_factions });
    if (l.link_caption_universe) patches.push({ from: 'The World', to: l.link_caption_universe });
  }

  // ── Nav ──
  if (config.nav) {
    if (config.nav.buy_title) patches.push({ from: 'Buy On', to: config.nav.buy_title });
    if (config.nav.nav_title) patches.push({ from: 'Discover', to: config.nav.nav_title });
  }

  // ── Footer ──
  if (config.footer) {
    const f = config.footer;
    if (f.nav_title) patches.push({ from: 'Discover More', to: f.nav_title });
    if (f.social_title) patches.push({ from: 'Join the Conversation', to: f.social_title });
    if (f.press_title) patches.push({ from: 'More Details', to: f.press_title });
    if (f.press_desc) patches.push({ from: 'Want to learn more about how we collaborate with partners?', to: f.press_desc });
    if (f.press_kit_label) patches.push({ from: 'Download Brand Book', to: f.press_kit_label });
    if (f.press_email) {
      patches.push({ from: 'HELLO@KPRVERSE.COM', to: f.press_email });
      patches.push({ from: 'hello@kprverse.com', to: f.press_email });
    }
    if (f.copyright) patches.push({ from: '© 2022', to: f.copyright });
  }

  // ── KEEPERS → PORTFOLIO ──
  patches.push({ from: 'KEEPERS', to: 'PORTFOLIO' });

  // Apply each patch as a string replacement in the __NUXT__ region
  // We only replace within the __NUXT__ script tag to avoid changing other parts
  const nuxtStart = html.indexOf('window.__NUXT__=');
  if (nuxtStart < 0) return html;
  const nuxtEnd = html.indexOf('</script>', nuxtStart);
  if (nuxtEnd < 0) return html;

  let before = html.substring(0, nuxtStart);
  let nuxtRegion = html.substring(nuxtStart, nuxtEnd);
  let after = html.substring(nuxtEnd);

  let patchCount = 0;
  patches.forEach(p => {
    // Try both quoted and unquoted variants
    const quoted = '"' + p.from + '"';
    const escaped = '"' + p.from.replace(/'/g, "\\'") + '"';
    if (nuxtRegion.includes(quoted)) {
      nuxtRegion = nuxtRegion.split(quoted).join('"' + p.to + '"');
      patchCount++;
    } else if (nuxtRegion.includes(escaped)) {
      nuxtRegion = nuxtRegion.split(escaped).join('"' + p.to.replace(/'/g, "\\'") + '"');
      patchCount++;
    }
  });

  if (patchCount > 0) {
    console.log('[server] __NUXT__ patched:', patchCount, 'replacements');
  }
  return before + nuxtRegion + after;
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.xml': 'text/xml',
};

function proxyUpstream(urlPath, res) {
  const url = UPSTREAM + urlPath;
  console.log('PROXY:', urlPath);
  
  const client = url.startsWith('https') ? https : http;
  const req = client.get(url, { timeout: 30000 }, (upRes) => {
    if (upRes.statusCode >= 300 && upRes.statusCode < 400 && upRes.headers.location) {
      const redirect = upRes.headers.location;
      const finalUrl = redirect.startsWith('http') ? redirect : UPSTREAM + redirect;
      https.get(finalUrl, { timeout: 30000 }, (finalRes) => {
        const ext = path.extname(urlPath.split('?')[0]).toLowerCase();
        const contentType = mimeTypes[ext] || finalRes.headers['content-type'] || 'application/octet-stream';
        // CSS: rewrite S3 font URLs to local proxy
        if (contentType.includes('css')) {
          rewriteCssFonts(finalRes, res, contentType);
          return;
        }
        res.writeHead(finalRes.statusCode, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600',
        });
        finalRes.pipe(res);
      }).on('error', () => {
        res.writeHead(502);
        res.end('Bad Gateway');
      });
      return;
    }

    const ext = path.extname(urlPath.split('?')[0]).toLowerCase();
    const contentType = mimeTypes[ext] || upRes.headers['content-type'] || 'application/octet-stream';
    // CSS: rewrite S3 font URLs to local proxy
    if (contentType.includes('css')) {
      rewriteCssFonts(upRes, res, contentType);
      return;
    }
    res.writeHead(upRes.statusCode, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    });
    upRes.pipe(res);
  });

  req.on('error', () => {
    if (!res.headersSent) { res.writeHead(502); res.end('Bad Gateway'); }
  });
  req.on('timeout', () => {
    req.destroy();
    if (!res.headersSent) { res.writeHead(504); res.end('Gateway Timeout'); }
  });
}

// Rewrite S3 font URLs in proxied CSS to local /_nuxt/ files
function rewriteCssFonts(upRes, res, contentType) {
  const chunks = [];
  upRes.on('data', c => chunks.push(c));
  upRes.on('end', () => {
    let css = Buffer.concat(chunks).toString('utf8');
    // Replace S3 URLs with local font files
    css = css.replace(
      /https?:\/\/loginsignup-widget-assets\.s3\.amazonaws\.com\/fonts\/([A-Za-z0-9_-]+\.(woff2?|ttf|otf))/g,
      '/_nuxt/$1'
    );
    res.writeHead(upRes.statusCode, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(css);
  });
  upRes.on('error', () => {
    res.writeHead(502);
    res.end('Bad Gateway');
  });
}

function serveLocal(urlPath, res) {
  // Strip query string for file lookup
  const cleanPath = urlPath.split('?')[0];
  const filePath = path.join(ROOT, cleanPath);
  
  // Security: prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  // For HTML files, inject CORS fix script + patch __NUXT__ data from site-config.json
  if (ext === '.html') {
    let content = fs.readFileSync(filePath, 'utf8');

    // ── Server-side __NUXT__ patching ──
    // Read site-config.json and replace strings directly in the __NUXT__ payload.
    // More reliable than browser-side JS interception (no timing issues, no sync XHR).
    try {
      const configPath = path.join(ROOT, 'site-config.json');
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      content = patchNuxtHtml(content, configData);
      if (configData.footer && configData.footer.press_email) {
        content = content.split('HELLO@KPRVERSE.COM').join(configData.footer.press_email);
        content = content.split('hello@kprverse.com').join(configData.footer.press_email);
      }

      // Also patch <title> and <meta> tags server-side
      if (configData.site && configData.site.title) {
        content = content.replace(/<title>[^<]*<\/title>/, '<title>' + configData.site.title + '</title>');
      }
      if (configData.site && configData.site.description) {
        content = content.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, '$1' + configData.site.description + '$2');
      }
    } catch(e) {
      console.warn('[server] __NUXT__ HTML patch failed:', e.message);
    }

    // ── DIAGNOSTIC PANEL ──
    // 启用方法：将 false 改为 true
    // 功能：右下角显示 __NUXT__ 状态、Collection_Name、DOM-KPR/Mornikar 检测
    // 详见 README.md "诊断面板" 章节
    const ENABLE_DIAG = false;

    // ── Card scale: inject zoom style before any JS runs ──
    // Using <style> in <head> ensures GSAP reads zoomed dimensions during init.
    // zoom (not transform:scale) affects offsetWidth/offsetHeight, so GSAP
    // layout calculations automatically adapt to the new card size.
    var cardScaleStyle = '';
    try {
      const cfgData2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'site-config.json'), 'utf8'));
      const cs = (cfgData2.gallery && cfgData2.gallery.cardScale) || 1;
      if (cs !== 1) {
        cardScaleStyle = '<style>.collectionGallery__item{zoom:' + cs + '}</style>';
        console.log('[server] 🃏 Card zoom ' + cs + 'x injected in HTML');
      }
    } catch(e) {}

    const profileCardsInject = '<link rel="stylesheet" href="/profile-cards.css?v=reactbits-original"><script>(function(){function loadProfileCards(){setTimeout(function(){if(document.querySelector("script[data-mornikar-profile-cards]"))return;var s=document.createElement("script");s.src="/profile-cards.js?v=reactbits-original";s.defer=true;s.dataset.mornikarProfileCards="true";document.body.appendChild(s);},3000)}if(document.readyState==="complete"){loadProfileCards()}else{window.addEventListener("load",loadProfileCards,{once:true})}})();</script>';

    const inject = `<script>
// KPR-PROXY: Rewrite S3 font URLs to local proxy to avoid CORS
(function(){
  var origFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.includes('loginsignup-widget-assets.s3.amazonaws.com')) {
      url = '/proxy/ext/' + encodeURIComponent(url);
    }
    return origFetch.call(this, url, opts);
  };
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && url.includes('loginsignup-widget-assets.s3.amazonaws.com')) {
      url = '/proxy/ext/' + encodeURIComponent(url);
    }
    return origOpen.apply(this, arguments);
  };
})();
</script>
${ENABLE_DIAG ? '<script>\n(function runDiagnostic() {\n  function doit() {\n    try {\n      var info = "DIAG v3 | ";\n      var nuxt = window.__NUXT__;\n      info += "__NUXT__:" + (nuxt ? "OK" : "MISSING") + " | ";\n      if (nuxt && nuxt.data && nuxt.data["us-en/"] && nuxt.data["us-en/"].content) {\n        var b = nuxt.data["us-en/"].content.body;\n        if (b && b[3]) info += "Col:\\"" + b[3].Collection_Name + "\" | ";\n      }\n      var bodyText = (document.body && document.body.innerText) || "";\n      info += "DOM-KPR:" + (bodyText.indexOf("KPR") !== -1) + " DOM-Morn:" + (bodyText.indexOf("Mornikar") !== -1);\n      console.log("[DIAG]", info);\n      var bar = document.createElement("div");\n      bar.style.cssText = "position:fixed;bottom:4px;right:4px;z-index:999999;background:rgba(0,0,0,0.7);color:#0f0;padding:3px 8px;font-size:10px;font-family:monospace;border-radius:4px;cursor:pointer;";\n      bar.textContent = info;\n      bar.onclick = function() { bar.style.display = "none"; };\n      document.body.appendChild(bar);\n    } catch(e) { console.error("DIAG ERR:", e); }\n  }\n  setTimeout(doit, 4000);\n})();\n</script>' : ''}`;
    const injected = content.replace('</head>', cardScaleStyle + profileCardsInject + inject + '</head>');
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache',
    });
    res.end(injected);
    return true;
  }
  
    // For .js files — apply runtime patches for specific files
  if (ext === '.js') {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    // ── Home.js: Patch gallery carousel interval + hover pause ──
    // KPR's Ys class has nextItemDuration:Xt?1.6:.8 (0.8s on desktop).
    // We override it with the carouselInterval from site-config.json.
    // Also inject hover pause: when #collection-gallery is hovered, loopCards skips.
    if (cleanPath.includes('Home.') && cleanPath.endsWith('.js')) {
      try {
        const configPath = path.join(ROOT, 'site-config.json');
        const cfgData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const interval = (cfgData.gallery && cfgData.gallery.carouselInterval) || 10;

        let jsContent = fs.readFileSync(filePath, 'utf8');

        // Patch 1: Override carousel interval
        const origPattern = /nextItemDuration:Xt\?1\.6:\.8/;
        if (origPattern.test(jsContent)) {
          jsContent = jsContent.replace(origPattern, 'nextItemDuration:Xt?1.6:' + interval);
          console.log('[server] 🎠 Home.js patched: carousel nextItemDuration = ' + interval + 's');
        }

        // Patch 2: Hover pause — skip index++ when paused, but always schedule next delayedCall
        // Original minified: this.props.index++,null==(e=this.loopDelay)||e.kill(),this.loopDelay=i.delayedCall(t,this.loopCards)
        // These are comma expressions in one statement. We must NOT skip the delayedCall.
        // Patched: if(!window.__kprCarouselPaused)this.props.index++;null==(e=this.loopDelay)||e.kill(),this.loopDelay=i.delayedCall(t,this.loopCards)
        // (Split index++ into its own if-statement, keep kill+delayedCall always executing)
        const loopCardsPattern = /this\.props\.index\+\+,null==\(e=this\.loopDelay\)\|\|e\.kill\(\),this\.loopDelay=i\.delayedCall\(t,this\.loopCards\)/;
        if (loopCardsPattern.test(jsContent)) {
          jsContent = jsContent.replace(
            loopCardsPattern,
            'if(!window.__kprCarouselPaused)this.props.index++;null==(e=this.loopDelay)||e.kill(),this.loopDelay=i.delayedCall(t,this.loopCards)'
          );
          console.log('[server] 🎠 Home.js patched: loopCards hover pause (index++ guarded, delayedCall always runs)');
        }

        // Patch 3: Expose gallery instance for wheel-driven card switching
        // We inject window.__kprGallery=this right after the collection-gallery options are set.
        // This allows content-patcher.js to call setIndex() on the gallery for smooth animated switching.
        const galleryInstPattern = /t\(this,"options",\{template:Vs,id:"collection-gallery"\}\)/;
        if (galleryInstPattern.test(jsContent)) {
          jsContent = jsContent.replace(
            galleryInstPattern,
            't(this,"options",{template:Vs,id:"collection-gallery"});window.__kprGallery=this'
          );
          console.log('[server] 🎠 Home.js patched: gallery instance exposed to window.__kprGallery');
        }

        // ── Patch 4a: Landing scene — replace GLB asset path with custom image ──
        // Architecture doc §4.2 方案D: PlaneGeometry + MeshBasicMaterial replaces GLB
        const landingGlbPattern = /gltf:`\$\{Q\}landing\/landing-\$\{V\.textureSize\}\.glb`/;
        if (landingGlbPattern.test(jsContent)) {
          jsContent = jsContent.replace(landingGlbPattern, 'gltf:"/images/newImage/01.jpg#texture"');
          console.log('[server] 🖼️ Home.js patched: Landing gltf asset replaced with 01.jpg#texture');
        }

        // ── Patch 4b: Landing setupScene — replace GLB traversal with PlaneGeometry + texture ──
        // Original: loads GLB → traverse → replace each mesh material with custom shader
        // 方案D: Object3D container + PlaneGeometry + MeshBasicMaterial (preserves this.gltfScene for animations)
        const setupSceneOrig = 'async setupScene(){this.scene=new ye;this.gltf=this.assets.gltf,this.gltfScene=this.gltf.scene,this.gltfScene.traverse((e=>{const{order:t}=e.userData;if(e.material){const t=e.material.side;e.material.map&&(e.material.map.encoding=Fe,e.material=new K({uniforms:{uTexture:e.material.map},options:{},fs:"\\n              uniform sampler2D uTexture;\\n                varying vec2 vUv;\\n                void main() {\\n                  vec4 tDiffuse = texture2D(uTexture, vUv);\\n                  vec3 color = mix(tDiffuse.rgb, vec3(0.0), 0.15);\\n                  gl_FragColor = vec4(color, tDiffuse.a);\\n                }\\n            "})),e.material.side=t}t&&(e.renderOrder=20-t)})),this.scene.add(this.gltfScene)}';
        const setupSceneNew = 'async setupScene(){this.scene=new ye;this.gltfScene=new fe;const e=new Te(0.896,1.2544),t=new ce({map:this.assets.gltf,side:2});t.map.encoding=Fe;const s=new ue(e,t);this.gltfScene.add(s),this.scene.add(this.gltfScene)}';
        if (jsContent.includes(setupSceneOrig)) {
          jsContent = jsContent.replace(setupSceneOrig, setupSceneNew);
          console.log('[server] 🖼️ Home.js patched: Landing setupScene replaced with 方案D (PlaneGeometry+texture)');
        }









        // ── Patch 5: ProjectIntro card texture replacement (02.jpg) ──
        // Replaces frontSide/backSide KTX2 textures with custom image
        const projectIntroCfg = cfgData.projectIntro || {};
        if (projectIntroCfg.mode === 'image' && projectIntroCfg.image) {
          const cardImg = projectIntroCfg.image;
          // frontSide: ${O}project-intro/front-face${Is}.ktx2 → /images/newImage/02.jpg#texture
          const frontPattern = /frontSide:`\$\{O\}project-intro\/front-face\$\{Is\}\.ktx2`/;
          if (frontPattern.test(jsContent)) {
            jsContent = jsContent.replace(frontPattern, 'frontSide:`' + cardImg + '#texture`');
            console.log('[server] 🃏 Home.js patched: frontSide replaced with ' + cardImg + '#texture');
          }
          // backSide: ${O}project-intro/back-face.ktx2 → /images/newImage/02.jpg#texture
          const backPattern = /backSide:`\$\{O\}project-intro\/back-face\.ktx2`/;
          if (backPattern.test(jsContent)) {
            jsContent = jsContent.replace(backPattern, 'backSide:`' + cardImg + '#texture`');
            console.log('[server] 🃏 Home.js patched: backSide replaced with ' + cardImg + '#texture');
          }
        }

        // ── Patch 6: ProjectIntro img1 (trailer-side-media) replacement ──
        // Replaces the <img class="homeProjectIntro__img1"> src in lit-html template
        const img1Pattern = /src="\$\{U\}project-intro\/trailer-side-media\.webp"/;
        if (img1Pattern.test(jsContent)) {
          jsContent = jsContent.replace(img1Pattern, 'src="/images/newImage/03.jpg"');
          console.log('[server] 🖼️ Home.js patched: homeProjectIntro__img1 replaced with 03.jpg');
        }




        // ── Patch 8: Collection mediaWrap image (face-traits) replacement ──
        // Replaces the <img class="mediaEl"> src in lit-html template
        // Original: src="${U}collection/face-traits.webp"
        const mediaElPattern = /src="\$\{U\}collection\/face-traits\.webp"/;
        if (mediaElPattern.test(jsContent)) {
          jsContent = jsContent.replace(mediaElPattern, 'src="/images/newImage/08.webp"');
          console.log('[server] 🖼️ Home.js patched: mediaInner img replaced with 08.webp');
        }

        // ── Patch 7a: Collection assets — replace GLB with card image ──
        // Original: t(this,"assets",{gltf:`${V.gltfBaseFolder}collection/collection-${V.textureSize}.glb`})
        // New:      t(this,"assets",{gltf:"/images/newImage/05.png#texture"})
        // Patch 9: Keep Tableau BG layer texture replacement.
        // Keep this scoped to the Keep class: add one texture asset, then replace
        // only the Keep GLB backdrop meshes in Keep.onAfterSetup(). Do not touch sprites or structures.
        const keepGlbSpread = ',...V.hasMobileFallback?{}:{sheetCharacter0:';
        if (jsContent.includes(keepGlbSpread) && !jsContent.includes('bgImg:"/images/newImage/10.webp#texture"')) {
          jsContent = jsContent.replace(
            keepGlbSpread,
            ',bgImg:"/images/newImage/10.webp#texture",...V.hasMobileFallback?{}:{sheetCharacter0:'
          );
          console.log('[server] Home.js patched: Keep bgImg asset added (10.webp#texture)');
        }

        const keepOnAfterSetupOrig = 'onAfterSetup(){this.options.useControls&&(this.camera.position.z=2),this.tlIn=this.getAnimIn()}';
        const keepOnAfterSetupPatched = 'onAfterSetup(){this.options.useControls&&(this.camera.position.z=2),this.tlIn=this.getAnimIn();if(this.gltfScene&&this.assets.bgImg){const e=this.assets.bgImg;e.encoding=Fe;e.needsUpdate=!0;const t=["sky_backdrop","mountains_godrays_backdrop"];let s=0;this.gltfScene.traverse((i)=>{const o=i.userData&&i.userData.name||i.name||"";if(i.isMesh&&i.material&&t.indexOf(o)>=0){s++;let n="fallback";if(i.material.uniforms&&i.material.uniforms.tMap){i.material.uniforms.tMap.value=e;i.material.uniforms.tMap.needsUpdate=!0;n="uniforms.tMap"}else if(i.material.uniforms&&i.material.uniforms.uTexture){i.material.uniforms.uTexture.value=e;i.material.uniforms.uTexture.needsUpdate=!0;n="uniforms.uTexture"}else if(i.material.map){i.material.map=e;i.material.needsUpdate=!0;n="material.map"}else{i.material.dispose&&i.material.dispose();i.material=new ce({map:e,side:2,transparent:!0,depthWrite:!1})}console.log("[Keep BG] replaced GLB backdrop mesh: "+o+" via "+n)}});console.log("[Keep BG] targeted backdrop meshes replaced: "+s)}}';
        if (jsContent.includes(keepOnAfterSetupOrig) && !jsContent.includes('[Keep BG] targeted backdrop meshes replaced')) {
          jsContent = jsContent.replace(keepOnAfterSetupOrig, keepOnAfterSetupPatched);
          console.log('[server] Home.js patched: Keep GLB backdrop meshes targeted for 10.webp');
        }

        // Patch 9c: Factions Tableau BG/person texture replacement.
        // Scoped to the Factions class: add one texture asset, then replace
        // only rear GLB background meshes and character meshes in Factions.onAfterSetup().
        const factionsGlbSpread = ',...V.hasMobileFallback?{}:{sheetLeftHand0:';
        if (jsContent.includes(factionsGlbSpread) && !jsContent.includes('bgImg:"/images/newImage/11.webp#texture"')) {
          jsContent = jsContent.replace(
            factionsGlbSpread,
            ',bgImg:"/images/newImage/11.webp#texture",charImg:"/images/newImage/04.webp#texture",...V.hasMobileFallback?{}:{sheetLeftHand0:'
          );
          console.log('[server] Home.js patched: Factions bgImg/charImg assets added (11.webp#texture, 04.webp#texture)');
        }

        const factionsOnAfterSetupOrig = 'async onAfterSetup(){this.options.useControls&&(this.camera.position.z=1),this.tlStory=this.getAnimStory()}';
        const factionsOnAfterSetupPatched = 'async onAfterSetup(){this.options.useControls&&(this.camera.position.z=1),this.tlStory=this.getAnimStory();const e=e=>{e.encoding=Fe,e.needsUpdate=!0},t=(t,s,i)=>{if(t){e(t);let o=0;this.gltfScene.traverse((e)=>{const n=e.userData&&e.userData.name||e.name||"";if(e.isMesh&&e.material&&s.indexOf(n)>=0){o++;let a="fallback";if(e.material.uniforms&&e.material.uniforms.tMap){e.material.uniforms.tMap.value=t,e.material.uniforms.tMap.needsUpdate=!0,a="uniforms.tMap"}else if(e.material.uniforms&&e.material.uniforms.uTexture){e.material.uniforms.uTexture.value=t,e.material.uniforms.uTexture.needsUpdate=!0,a="uniforms.uTexture"}else if(e.material.map){e.material.map=t,e.material.needsUpdate=!0,a="material.map"}else{e.material.dispose&&e.material.dispose();e.material=new ce({map:t,side:2,transparent:!0,depthWrite:!1})}console.log("[Factions "+i+"] replaced GLB mesh: "+n+" via "+a)}});console.log("[Factions "+i+"] targeted meshes replaced: "+o)}};if(this.gltfScene){const s=["girl","Man_head","man_Body","Head_accessoris"];this.gltfScene.traverse((e)=>{const t=e.userData&&e.userData.name||e.name||"";s.indexOf(t)>=0&&(e.visible=!1,console.log("[Factions CHAR_SOURCE] disabled GLB mesh: "+t))}),t(this.assets.bgImg,["sky_bg","mountain_01"],"BG");if(this.assets.charImg&&!this.factionsMalePlane){const t=this.assets.charImg;e(t);const s=t.image&&t.image.width&&t.image.height?t.image.width/t.image.height:.66,i=.5,o=i*s,n=new Te(o,i),a=new ce({map:t,side:2,transparent:!0,depthWrite:!1,depthTest:!1}),r=new ue(n,a);r.name="mornikar_factions_male_04",r.position.set(.12,.02,-1.16),r.rotation.set(0,0,0),r.renderOrder=50,this.gltfScene.add(r),this.factionsMalePlane=r,console.log("[Factions CHAR_PLANE] added full male plane 04.webp front-facing size: "+o+"x"+i)}}}';
        if (jsContent.includes(factionsOnAfterSetupOrig) && !jsContent.includes('mornikar_factions_male_04')) {
          jsContent = jsContent.replace(factionsOnAfterSetupOrig, factionsOnAfterSetupPatched);
          console.log('[server] Home.js patched: Factions background uses 11.webp; source characters hidden; full male 04.webp plane added');
        }

        // Patch 9d: Universe Tableau BG/person texture replacement.
        // Universe GLB nodes confirmed from tableaux-universe-2048.glb:
        // BG: city_and_ground, cloud_hadows, cloud. Character: character.
        const universeGlbSpread = ',...V.hasMobileFallback?{}:{sheetBeam0:';
        if (jsContent.includes(universeGlbSpread) && !jsContent.includes('bgImg:"/images/newImage/15.webp#texture"')) {
          jsContent = jsContent.replace(
            universeGlbSpread,
            ',bgImg:"/images/newImage/15.webp#texture",charImg:"/images/newImage/05.webp#texture",...V.hasMobileFallback?{}:{sheetBeam0:'
          );
          console.log('[server] Home.js patched: Universe bgImg/charImg assets added (15.webp#texture, 05.webp#texture)');
        }

        const universeOnAfterSetupOrig = 'async onAfterSetup(){this.options.useControls&&(this.camera.position.z=10),this.tlStory=this.getAnimStory()}';
        const universeOnAfterSetupPatched = 'async onAfterSetup(){this.options.useControls&&(this.camera.position.z=10),this.tlStory=this.getAnimStory();const e=e=>{e.encoding=Fe,e.needsUpdate=!0},t=(t,s,i)=>{if(t){e(t);let o=0;this.gltfScene.traverse((e)=>{const n=e.userData&&e.userData.name||e.name||"";if(e.isMesh&&e.material&&s.indexOf(n)>=0){o++;let a="fallback";if(e.material.uniforms&&e.material.uniforms.tMap){e.material.uniforms.tMap.value=t,e.material.uniforms.tMap.needsUpdate=!0,a="uniforms.tMap"}else if(e.material.uniforms&&e.material.uniforms.uTexture){e.material.uniforms.uTexture.value=t,e.material.uniforms.uTexture.needsUpdate=!0,a="uniforms.uTexture"}else if(e.material.map){e.material.map=t,e.material.needsUpdate=!0,a="material.map"}else{e.material.dispose&&e.material.dispose();e.material=new ce({map:t,side:2,transparent:!0,depthWrite:!1})}console.log("[Universe "+i+"] replaced GLB mesh: "+n+" via "+a)}});console.log("[Universe "+i+"] targeted meshes replaced: "+o)}};this.gltfScene&&(t(this.assets.bgImg,["city_and_ground","cloud_hadows","cloud"],"BG"),t(this.assets.charImg,["character"],"CHAR"))}';
        if (jsContent.includes(universeOnAfterSetupOrig) && !jsContent.includes('[Universe CHAR]')) {
          jsContent = jsContent.replace(universeOnAfterSetupOrig, universeOnAfterSetupPatched);
          console.log('[server] Home.js patched: Universe background uses 15.webp; character uses 05.webp');
        }

        // Patch 9e: Launch singleCard textures.
        // The DOM classes are singleCard--universe/keep/factions, but the images
        // are WebGL textures loaded through Ui.assets mapCard*.
        const launchCardsAssetsPattern = /t\(this,"assets",\{mapCardKeep:`\$\{O\}launch\/card-keep\.ktx2`,mapCardFactions:`\$\{O\}launch\/card-factions\.ktx2`,mapCardUniverse:`\$\{O\}launch\/card-universe\.ktx2`\}\)/;
        if (launchCardsAssetsPattern.test(jsContent) && !jsContent.includes('mapCardUniverse:"/images/newImage/04.jpg#texture"')) {
          jsContent = jsContent.replace(
            launchCardsAssetsPattern,
            't(this,"assets",{mapCardKeep:"/images/newImage/10.jpeg#texture",mapCardFactions:"/images/newImage/09.jpg#texture",mapCardUniverse:"/images/newImage/04.jpg#texture"})'
          );
          console.log('[server] Home.js patched: Launch singleCard textures (universe=04.jpg, keep=10.jpeg, factions=09.jpg)');
        }

        const collectionAssetsPattern = /t\(this,"assets",\{gltf:`\$\{V\.gltfBaseFolder\}collection\/collection-\$\{V\.textureSize\}\.glb`\}\)/;
        if (collectionAssetsPattern.test(jsContent)) {
          jsContent = jsContent.replace(collectionAssetsPattern, 't(this,"assets",{gltf:"/images/newImage/05.png#texture"})');
          console.log('[server] 🖼️ Home.js patched: Collection assets — gltf→05.png#texture');
        }

        // ── Patch 7b: Collection setupScene — card in Three.js ──
        // Original: GLB traversal + purple background box
        // New: Card(05.png) only — no character portrait (to be handled via DOM overlay later)
        // Te=PlaneGeometry, ce=MeshBasicMaterial, ue=Mesh, ye=Scene, Fe=SRGBColorSpace
        const collectionSetupOrig = 'setupScene(){this.scene=new ye,this.box=new ue(Zt,Vt("#A79BED")),this.box.scale.setScalar(20),this.box.material.side=ve,this.scene.add(this.box);this.gltf=this.assets.gltf,this.gltfScene=this.gltf.scene,this.gltfScene.traverse((e=>{const{order:t}=e.userData;e.material&&(e.material.map&&(e.material.map.encoding=Fe),e.material=new K({uniforms:{uTexture:e.material.map}})),t&&(e.renderOrder=30-t)})),this.scene.add(this.gltfScene)}';
        const collectionSetupNew = 'setupScene(){this.scene=new ye;const e=new Te(1.5,1.5),t=new ce({map:this.assets.gltf,side:2});t.map.encoding=Fe;const s=new ue(e,t);this.scene.add(s)}';
        if (jsContent.includes(collectionSetupOrig)) {
          jsContent = jsContent.replace(collectionSetupOrig, collectionSetupNew);
          console.log('[server] 🖼️ Home.js patched: Collection setupScene → card only (PlaneGeometry+texture)');
        }




        res.end(jsContent);
        return true;
      } catch(e) {
        console.warn('[server] Home.js patch failed, serving original:', e.message);
        // Fall through to serve original file
      }
    }

    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  // JSON files (site-config.json etc.) — no-cache to avoid stale config
  if (ext === '.json') {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=3600',
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function proxyExternal(fullUrl, res) {
  console.log('PROXY-EXT:', fullUrl);
  const client = fullUrl.startsWith('https') ? https : http;
  const req = client.get(fullUrl, { timeout: 30000 }, (upRes) => {
    if (upRes.statusCode >= 300 && upRes.statusCode < 400 && upRes.headers.location) {
      const redirect = upRes.headers.location;
      const finalUrl = redirect.startsWith('http') ? redirect : new URL(redirect, fullUrl).href;
      proxyExternal(finalUrl, res);
      return;
    }
    const contentType = upRes.headers['content-type'] || 'application/octet-stream';
    res.writeHead(upRes.statusCode, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=86400',
    });
    upRes.pipe(res);
  });
  req.on('error', () => { res.writeHead(502); res.end('Bad Gateway'); });
  req.on('timeout', () => { req.destroy(); res.writeHead(504); res.end('Gateway Timeout'); });
}

// ── Bilibili Video Preview Proxy ──
// Proxies low-quality video streams from Bilibili for gallery card hover previews.
const biliCache = {};
const BILI_CACHE_TTL = 1800000; // 30 min

function biliGet(urlStr, headers) {
  return new Promise(function (resolve, reject) {
    var opts = {
      headers: Object.assign({ 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://www.bilibili.com' }, headers || {})
    };
    https.get(urlStr, opts, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return biliGet(res.headers.location, headers).then(resolve, reject);
      }
      var body = '';
      res.on('data', function (c) { body += c; });
      res.on('end', function () { resolve(body); });
    }).on('error', reject);
  });
}

function getBiliVideoCid(bvid) {
  var cached = biliCache[bvid];
  if (cached && cached.cid && Date.now() - cached.timestamp < BILI_CACHE_TTL) {
    return Promise.resolve(cached.cid);
  }
  return biliGet('https://api.bilibili.com/x/web-interface/view?bvid=' + bvid)
    .then(function (body) {
      var json = JSON.parse(body);
      if (json.code !== 0 || !json.data) throw new Error('Bili API error: ' + (json.message || 'no data'));
      var cid = json.data.cid;
      biliCache[bvid] = biliCache[bvid] || {};
      biliCache[bvid].cid = cid;
      biliCache[bvid].timestamp = Date.now();
      return cid;
    });
}

function getBiliStreamUrl(bvid, cid) {
  var cached = biliCache[bvid];
  if (cached && cached.streamUrl && Date.now() - cached.streamTs < BILI_CACHE_TTL) {
    return Promise.resolve(cached.streamUrl);
  }
  return biliGet('https://api.bilibili.com/x/player/playurl?bvid=' + bvid + '&cid=' + cid + '&qn=16&fnval=0')
    .then(function (body) {
      var json = JSON.parse(body);
      if (json.code !== 0 || !json.data || !json.data.durl || !json.data.durl[0]) {
        throw new Error('Bili stream API error: ' + (json.message || 'no durl'));
      }
      var streamUrl = json.data.durl[0].url;
      biliCache[bvid].streamUrl = streamUrl;
      biliCache[bvid].streamTs = Date.now();
      return streamUrl;
    });
}

function handleBiliPreview(req, res, urlPath) {
  var bvid = urlPath.split('/').pop();
  if (!/^BV[\w]+$/.test(bvid)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    return res.end('Invalid bvid');
  }

  getBiliVideoCid(bvid)
    .then(function (cid) { return getBiliStreamUrl(bvid, cid); })
    .then(function (streamUrl) {
      var parsed = new URL(streamUrl);
      var proxyHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
        'Origin': 'https://www.bilibili.com'
      };
      if (req.headers.range) proxyHeaders['Range'] = req.headers.range;

      https.get(parsed.href, { headers: proxyHeaders }, function (upstream) {
        if (upstream.statusCode >= 300 && upstream.statusCode < 400 && upstream.headers.location) {
          // Follow redirect
          var rp = new URL(upstream.headers.location);
          https.get(rp.href, { headers: proxyHeaders }, function (up2) {
            var h = { 'Content-Type': up2.headers['content-type'] || 'video/mp4', 'Access-Control-Allow-Origin': '*', 'Accept-Ranges': 'bytes' };
            if (up2.headers['content-length']) h['Content-Length'] = up2.headers['content-length'];
            if (up2.headers['content-range']) h['Content-Range'] = up2.headers['content-range'];
            res.writeHead(up2.statusCode, h);
            up2.pipe(res);
            up2.on('error', function () { res.end(); });
          }).on('error', function () { if (!res.headersSent) { res.writeHead(502); res.end(); } });
          return;
        }
        var headers = {
          'Content-Type': upstream.headers['content-type'] || 'video/mp4',
          'Access-Control-Allow-Origin': '*',
          'Accept-Ranges': 'bytes'
        };
        if (upstream.headers['content-length']) headers['Content-Length'] = upstream.headers['content-length'];
        if (upstream.headers['content-range']) headers['Content-Range'] = upstream.headers['content-range'];
        res.writeHead(upstream.statusCode, headers);
        upstream.pipe(res);
        upstream.on('error', function () { res.end(); });
      }).on('error', function (e) {
        console.error('[server] Bilibili stream proxy error:', e.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('Stream proxy error');
        }
      });
    })
    .catch(function (e) {
      console.error('[server] Bilibili preview error:', e.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bilibili API error: ' + e.message);
      }
    });
}

// ── API: Upload image file to images/ directory ──
// ══════════════════════════════════════════════════════════════
// Image Manager API (decoupled)
// GET  /api/img/list?dir=/images            → 列出目录下图片
// POST /api/img/write  {targetPath,data}   → 写文件到磁盘
// GET  /api/img/mapping                    → 读映射配置
// POST /api/img/mapping {mapping}          → 保存映射配置
// ══════════════════════════════════════════════════════════════
function handleImgApi(req, res, urlPath) {
  const sub = urlPath.slice('/api/img/'.length);

  // GET /api/img/list?dir=/images
  if (req.method === 'GET' && sub === 'list') {
    try {
      const u = new URL(req.url, 'http://localhost');
      const dir = (u.searchParams.get('dir') || '/images').replace(/\.\./g, '');
      const fullPath = path.join(ROOT, dir.replace(/^\//, ''));
      const files = fs.readdirSync(fullPath).filter(f =>
        /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f)
      ).map(f => {
        const s = fs.statSync(path.join(fullPath, f));
        return { name: f, size: s.size, mtime: s.mtime };
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: true, dir, files, count: files.length }));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ ok: true, dir: '/images', files: [], count: 0, error: 'dir not found or empty' }));
    }
    return;
  }

  // POST /api/img/write {targetPath, data(base64)}
  if (req.method === 'POST' && sub === 'write') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const tp = (body.targetPath || '').replace(/^\//, '').replace(/\.\./g, '');
        if (!tp) { res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify({ok:false, error:'no targetPath'})); return; }
        const buf = Buffer.from(body.data, 'base64');
        const savePath = path.join(ROOT, tp);
        fs.mkdirSync(path.dirname(savePath), { recursive: true });
        fs.writeFileSync(savePath, buf);
        console.log('[img-manager] WRITE:', tp, buf.length, 'bytes');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, path: '/' + tp, size: buf.length }));
      } catch (e) {
        console.error('[img-manager] write error:', e);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // GET|POST /api/img/mapping
  const cfgPath = path.join(ROOT, 'img-mapping.json');
  if (sub === 'mapping') {
    if (req.method === 'GET') {
      try {
        const data = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, mapping: data }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, mapping: {} }));
      }
      return;
    }
    if (req.method === 'POST') {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          fs.writeFileSync(cfgPath, JSON.stringify(body.mapping || {}, null, 2), 'utf8');
          console.log('[img-manager] mapping saved —', Object.keys(body.mapping || {}).length, 'entries');
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ ok: true, count: Object.keys(body.mapping || {}).length }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ok:false, error:'unknown endpoint'}));
}

const server = http.createServer((req, res) => {
  console.log('[server] request:', req.method, req.url);
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  let urlPath = req.url.split('?')[0];

  // ── Bilibili video preview proxy ──
  if (req.method === 'GET' && urlPath.startsWith('/api/bilibili/preview/')) {
    handleBiliPreview(req, res, urlPath);
    return;
  }

  // ── Image Manager API (decoupled) ──
  if (urlPath.startsWith('/api/img/')) {
    handleImgApi(req, res, urlPath);
    return;
  }

  // ── site-config.json patch APIs ──
  const siteConfigPath = path.join(ROOT, 'site-config.json');

  // GET /api/config — read site-config.json
  if (req.method === 'GET' && urlPath === '/api/config') {
    try {
      const cfg = fs.existsSync(siteConfigPath)
        ? JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'))
        : { images: [] };
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(cfg));
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ images: [] }));
    }
    return;
  }

  // POST /api/save-patch — add/replace patches in site-config.json images[]
  if (req.method === 'POST' && urlPath === '/api/save-patch') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const patches = body.patches || [];
        let cfg = fs.existsSync(siteConfigPath)
          ? JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'))
          : { images: [] };
        if (!cfg.images || !Array.isArray(cfg.images)) cfg.images = [];

        patches.forEach(function (patch) {
          if (!patch.selector || !patch.src) return;
          // Remove existing patch with same selector
          cfg.images = cfg.images.filter(function (img) { return img.selector !== patch.selector; });
          cfg.images.push(patch);
        });

        fs.writeFileSync(siteConfigPath, JSON.stringify(cfg, null, 2), 'utf8');
        console.log('[img-manager] patch saved —', patches.length, 'entries');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, count: patches.length }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // POST /api/delete-patch — remove patch by selector
  if (req.method === 'POST' && urlPath === '/api/delete-patch') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const selector = body.selector;
        if (!selector) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ ok: false, error: 'no selector' }));
          return;
        }
        let cfg = fs.existsSync(siteConfigPath)
          ? JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'))
          : { images: [] };
        if (!cfg.images) cfg.images = [];
        const before = cfg.images.length;
        cfg.images = cfg.images.filter(function (img) { return img.selector !== selector; });
        fs.writeFileSync(siteConfigPath, JSON.stringify(cfg, null, 2), 'utf8');
        console.log('[img-manager] patch deleted:', selector, '(' + (before - cfg.images.length) + ' removed)');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, removed: before - cfg.images.length }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // External resource proxy: /proxy/ext/https://example.com/path
  // Used to bypass CORS restrictions on external fonts/assets
  if (urlPath.startsWith('/proxy/ext/')) {
    const targetUrl = decodeURIComponent(urlPath.slice('/proxy/ext/'.length));
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      proxyExternal(targetUrl, res);
      return;
    }
    res.writeHead(400);
    res.end('Invalid proxy URL');
    return;
  }

  // POST /api/save-text — add/replace text patches in site-config.json texts[]
  if (req.method === 'POST' && urlPath === '/api/save-text') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const texts = body.texts || [];
        let cfg = fs.existsSync(siteConfigPath)
          ? JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'))
          : { images: [], texts: [] };
        if (!cfg.texts || !Array.isArray(cfg.texts)) cfg.texts = [];

        texts.forEach(function (txt) {
          if (!txt.selector || !txt.original || !txt.replacement) return;
          // Remove existing with same selector+original
          cfg.texts = cfg.texts.filter(function (t) {
            return !(t.selector === txt.selector && t.original === txt.original);
          });
          cfg.texts.push(txt);
        });

        fs.writeFileSync(siteConfigPath, JSON.stringify(cfg, null, 2), 'utf8');
        console.log('[content-manager] text patch saved —', texts.length, 'entries');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, count: texts.length }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // POST /api/delete-text — remove text patch by selector+original
  if (req.method === 'POST' && urlPath === '/api/delete-text') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const selector = body.selector;
        const original = body.original;
        if (!selector || !original) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ ok: false, error: 'no selector or original' }));
          return;
        }
        let cfg = fs.existsSync(siteConfigPath)
          ? JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'))
          : { images: [], texts: [] };
        if (!cfg.texts) cfg.texts = [];
        const before = cfg.texts.length;
        cfg.texts = cfg.texts.filter(function (t) {
          return !(t.selector === selector && t.original === original);
        });
        fs.writeFileSync(siteConfigPath, JSON.stringify(cfg, null, 2), 'utf8');
        console.log('[content-manager] text patch deleted:', selector, '(' + (before - cfg.texts.length) + ' removed)');
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, removed: before - cfg.texts.length }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  
  // Root path -> index.html (use original, not the modified version)
  if (urlPath === '/') {
    urlPath = '/index_original.html';
  }
  // Map /index.html to original too
  if (urlPath === '/index.html') {
    urlPath = '/index_original.html';
  }

  // Try local file first
  if (serveLocal(urlPath, res)) {
    return;
  }

  // Not found locally -> proxy from upstream
  proxyUpstream(req.url, res);
});

server.on('clientError', (err, socket) => {
  console.error('[server] clientError:', err && err.message || err);
  if (socket && socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

server.on('error', (err) => {
  console.error('[server] listen/server error:', err && err.stack || err);
});

server.listen(PORT, () => {
  console.log(`KPR verse mirror running at http://localhost:${PORT}/`);
  console.log('Strategy: local files first, proxy missing from kprverse.com');
});
