const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 2200 }, deviceScaleFactor: 1 });
  const file = `file://${path.resolve(__dirname, 'render-assets.html').replace(/\\/g, '/')}`;
  await page.goto(file);
  await page.locator('#icon').screenshot({ path: path.join(__dirname, 'yoojel-app-icon-512.png') });
  await page.locator('#feature').screenshot({ path: path.join(__dirname, 'yoojel-feature-graphic-1024x500.png') });
  await page.locator('#chat').screenshot({ path: path.join(__dirname, 'yoojel-screenshot-chat-9x16.png') });
  await page.locator('#research').screenshot({ path: path.join(__dirname, 'yoojel-screenshot-research-9x16.png') });
  await browser.close();
})();
