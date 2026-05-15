// Deep analysis: compare live site vs local mirror
const http = require('http');
const https = require('https');

function fetchLocal(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5678' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

function fetchLive(path) {
  return new Promise((resolve, reject) => {
    https.get('https://kprverse.com' + path, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

(async () => {
  // 1. Check the HTML body tag from local
  console.log('=== LOCAL HTML ANALYSIS ===');
  const local = await fetchLocal('/');
  const html = local.body;
  
  // Find the script tag for entry.js
  const scriptMatch = html.match(/<script[^>]*src="([^"]*entry[^"]*)"[^>]*>/);
  console.log('Entry script tag:', scriptMatch ? scriptMatch[0] : 'NOT FOUND');
  
  // Check for src attributes (not href)
  const srcAttrs = html.match(/src="([^"]+)"/g) || [];
  console.log('\nAll src attributes:', srcAttrs);
  
  // Check what type the modulepreload links use
  const modulepreloadLinks = html.match(/rel="modulepreload"[^>]*href="([^"]+)"/g) || [];
  console.log('\nModulepreload links (first 5):', modulepreloadLinks.slice(0, 5));
  
  // Check the actual entry.js content - look for import statements
  console.log('\n=== ENTRY.JS ANALYSIS ===');
  const entryLocal = await fetchLocal('/_nuxt/entry.06ae7dd6.js');
  const entryBody = entryLocal.body;
  
  // Count dynamic imports
  const dynamicImports = entryBody.match(/import\("[^"]+"\)/g) || [];
  console.log('Dynamic imports in entry.js:', dynamicImports.length);
  console.log('First 5:', dynamicImports.slice(0, 5));
  
  // Check for import.meta.url usage
  const importMetaUrl = entryBody.match(/import\.meta\.url/g) || [];
  console.log('import.meta.url occurrences:', importMetaUrl.length);
  
  // Check for new URL() patterns (Vite asset resolution)
  const newUrlPatterns = entryBody.match(/new URL\([^)]+\)/g) || [];
  console.log('new URL() patterns:', newUrlPatterns.length);
  if (newUrlPatterns.length > 0) console.log('Examples:', newUrlPatterns.slice(0, 5));
  
  // 2. Compare live site's entry.js  
  console.log('\n=== LIVE ENTRY.JS COMPARISON ===');
  try {
    const liveEntry = await fetchLive('/_nuxt/entry.06ae7dd6.js');
    console.log('Live entry.js status:', liveEntry.status);
    console.log('Live size vs Local size:', liveEntry.body.length, 'vs', entryBody.length);
    
    // Check if they're the same
    if (liveEntry.body.substring(0, 200) === entryBody.substring(0, 200)) {
      console.log('First 200 chars: MATCH');
    } else {
      console.log('First 200 chars: DIFFERENT');
      console.log('Live first 200:', liveEntry.body.substring(0, 200));
      console.log('Local first 200:', entryBody.substring(0, 200));
    }
  } catch (e) {
    console.log('Could not fetch live entry.js:', e.message);
  }
  
  // 3. Check what the live site's HTML looks like vs our local
  console.log('\n=== LIVE HTML COMPARISON ===');
  try {
    const liveHtml = await fetchLive('/');
    // Check the script tag format
    const liveScriptMatch = liveHtml.body.match(/<script[^>]*src="([^"]*entry[^"]*)"[^>]*>/);
    console.log('Live entry script tag:', liveScriptMatch ? liveScriptMatch[0] : 'NOT FOUND');
    
    // Check crossorigin usage
    const liveCrossorigin = (liveHtml.body.match(/crossorigin/g) || []).length;
    console.log('Live crossorigin count:', liveCrossorigin);
    
    // Check if live uses type="module"
    const liveModuleScripts = liveHtml.body.match(/type="module"[^>]*src/g) || [];
    console.log('Live module scripts:', liveModuleScripts.length);
  } catch (e) {
    console.log('Could not fetch live HTML:', e.message);
  }
})();
