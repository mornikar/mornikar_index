const http = require('http');

http.get('http://localhost:5679/', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const bodyStart = d.indexOf('<body');
    const body = d.substring(bodyStart);
    
    // Remove all <script>...</script> blocks
    let visibleBody = body;
    let scriptRegex = /<script[\s\S]*?<\/script>/gi;
    visibleBody = visibleBody.replace(scriptRegex, '');
    
    // Also remove <style> blocks
    visibleBody = visibleBody.replace(/<style[\s\S]*?<\/style>/gi, '');
    
    console.log('=== VISIBLE HTML (no scripts/styles) ===');
    console.log('Has Mornikar:', visibleBody.includes('Mornikar'));
    console.log('Has Initial Collection:', visibleBody.includes('Initial Collection'));
    console.log('Has 10K:', visibleBody.includes('10K'));
    console.log('Has infinity:', visibleBody.includes('∞'));
    console.log('Has Featured Works:', visibleBody.includes('Featured Works'));
    console.log('Has AI PM Skills:', visibleBody.includes('AI PM Skills'));
    console.log('Has Wiki System:', visibleBody.includes('Wiki System'));
    console.log('Has KPR:', visibleBody.includes('KPR'));
    console.log('Has Collection:', visibleBody.includes('Collection'));
    
    // Find Collection occurrences
    let collIdx = 0;
    let count = 0;
    while (count < 5) {
      const idx = visibleBody.indexOf('Collection', collIdx);
      if (idx === -1) break;
      console.log('Collection at', idx, ':', visibleBody.substring(Math.max(0, idx - 30), idx + 60));
      collIdx = idx + 10;
      count++;
    }
    
    // Find KPR occurrences in visible HTML
    let kprIdx = 0;
    count = 0;
    while (count < 5) {
      const idx = visibleBody.indexOf('KPR', kprIdx);
      if (idx === -1) break;
      console.log('KPR at', idx, ':', visibleBody.substring(Math.max(0, idx - 20), idx + 50));
      kprIdx = idx + 3;
      count++;
    }
    
    // Check what's in the SSR content div
    const appDiv = visibleBody.indexOf('id="__nuxt"');
    if (appDiv > -1) {
      const appContent = visibleBody.substring(appDiv, appDiv + 500);
      console.log('\n=== __nuxt div first 500 chars ===');
      console.log(appContent);
    }
  });
}).on('error', e => console.log('ERROR:', e.message));
