const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let html = fs.readFileSync(file, 'utf-8');

// Replace absolute paths with relative paths
// href="/xxx" -> href="./xxx"
// src="/xxx" -> src="./xxx"
// But skip protocol-relative (//) and absolute URLs (http:// https://)

html = html.replace(/href="(\/[^"]*)"/g, (match, p1) => {
  if (p1.startsWith('//')) return match;
  return `href=".${p1}"`;
});

html = html.replace(/src="(\/[^"]*)"/g, (match, p1) => {
  if (p1.startsWith('//')) return match;
  return `src=".${p1}"`;
});

// Also fix url() in inline styles if any
html = html.replace(/url\((\/[^)]+)\)/g, (match, p1) => {
  if (p1.startsWith('//')) return match;
  return `url(.${p1})`;
});

// Fix meta/twitter/og image URLs
html = html.replace(/content="https:\/\/kprverse\.com(\/[^"]*)"/g, (match, p1) => {
  return `content=".${p1}"`;
});

fs.writeFileSync(file, html, 'utf-8');
console.log('Paths fixed!');
