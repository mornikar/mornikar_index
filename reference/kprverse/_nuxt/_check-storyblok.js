const fs = require('fs');
const d = fs.readFileSync('D:/Auxiliary_means/Git/MMO_mornikar_index/reference/kprverse/_nuxt/entry.06ae7dd6.js', 'utf8');

// Find storyblok API calls
let contexts = [];
let pos = 0;
while (contexts.length < 8) {
  const i = d.indexOf('storyblok', pos);
  if (i === -1) break;
  contexts.push(d.substring(Math.max(0, i - 40), i + 100));
  pos = i + 10;
}
contexts.forEach((c, i) => console.log('Context ' + i + ':', c));

// Check if there's a fetch/get call pattern near storyblok
console.log('\n--- Fetch patterns ---');
const fetchIdx = d.indexOf('fetch(');
if (fetchIdx > -1) {
  const nearby = d.substring(fetchIdx - 50, fetchIdx + 200);
  if (nearby.includes('storyblok')) {
    console.log('Storyblok fetch found:', nearby.substring(0, 200));
  }
}

// Check Nuxt useAsyncDataContext / useLazyAsyncData  
console.log('\n--- AsyncData patterns ---');
let asyncPos = 0;
let asyncCount = 0;
while (asyncCount < 5) {
  const idx = d.indexOf('AsyncData', asyncPos);
  if (idx === -1) break;
  console.log('AsyncData at', idx, ':', d.substring(idx, idx + 80));
  asyncPos = idx + 10;
  asyncCount++;
}

// Check for cache TTL / revalidation patterns
console.log('\n--- Revalidate/cache patterns ---');
let revPos = 0;
let revCount = 0;
while (revCount < 5) {
  const idx = d.indexOf('revalidate', revPos);
  if (idx === -1) break;
  console.log('revalidate at', idx, ':', d.substring(Math.max(0, idx - 20), idx + 60));
  revPos = idx + 10;
  revCount++;
}
