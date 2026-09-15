import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const EMAIL = 'user@albosla.test';
const PASS = 'Albosla123!';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const consoleMsgs = [];
page.on('console', m => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => consoleMsgs.push(`[pageerror] ${e.message}`));

await page.goto(`${BASE}/ar/auth`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

// fill login
const email = page.locator('input[type="email"]').first();
await email.waitFor({ timeout: 15000 });
await email.fill(EMAIL);
await page.locator('input[type="password"]').first().fill(PASS);
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(6000);
console.log('after login url:', page.url());

await page.goto(`${BASE}/ar/dashboard/roadmap`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
console.log('roadmap url:', page.url());

const tabs = await page.locator('button').allInnerTexts();
console.log('BUTTONS:', JSON.stringify(tabs.filter(Boolean).slice(0, 25)));

await page.screenshot({ path: '/private/tmp/claude-501/-Users-mennaelmeligy/1fb63ca6-96a0-4a6c-a1fc-1a6badfad317/scratchpad/client-roadmap-mentee.png', fullPage: true });

// click the mentor notes tab
const mentorTab = page.getByRole('button', { name: /ملاحظات المنتور|Mentor Notes/ }).first();
if (await mentorTab.count()) {
  await mentorTab.click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-mennaelmeligy/1fb63ca6-96a0-4a6c-a1fc-1a6badfad317/scratchpad/client-roadmap-mentor.png', fullPage: true });
  const body = await page.locator('body').innerText();
  console.log('--- MENTOR TAB TEXT ---');
  console.log(body.slice(0, 1500));
} else {
  console.log('!! mentor tab not found');
  console.log((await page.locator('body').innerText()).slice(0, 1200));
}

console.log('--- CONSOLE ---');
console.log(consoleMsgs.slice(-30).join('\n'));
await browser.close();
