// Quick script to check console errors on local KPR verse mirror
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  const failedRequests = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });
  
  page.on('response', res => {
    if (res.status() >= 400) {
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  });
  
  try {
    await page.goto('http://localhost:5678', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('Navigation error:', e.message);
  }
  
  // Wait a bit for any lazy loading
  await page.waitForTimeout(3000);
  
  console.log('\n=== CONSOLE ERRORS ===');
  errors.forEach(e => console.log(e));
  
  console.log('\n=== FAILED REQUESTS ===');
  failedRequests.forEach(r => console.log(r.status ? `${r.status} ${r.url}` : `${r.failure} ${r.url}`));
  
  // Get page content preview
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
  console.log('\n=== PAGE TEXT (first 500 chars) ===');
  console.log(bodyText || '(empty)');
  
  // Get page title
  const title = await page.title();
  console.log('\n=== PAGE TITLE ===');
  console.log(title);
  
  // Screenshot
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: false });
  console.log('\nScreenshot saved to debug-screenshot.png');
  
  await browser.close();
})();
