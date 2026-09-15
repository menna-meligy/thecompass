import { chromium } from 'playwright';
const BASE='http://localhost:3000';
const OUT='/private/tmp/claude-501/-Users-mennaelmeligy/1fb63ca6-96a0-4a6c-a1fc-1a6badfad317/scratchpad';
const CLIENT_ID='27072298-6281-4dd1-955e-b1ee1479ee35'; // user@albosla.test

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1400,height:1000} });
const page = await ctx.newPage();
const logs=[];
page.on('console', m=>logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e=>logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r=>logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(`${BASE}/ar/auth`, {waitUntil:'domcontentloaded'});
await page.waitForTimeout(1500);
await page.locator('input[type="email"]').first().fill('admin@albosla.test');
await page.locator('input[type="password"]').first().fill('Albosla123!');
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(6000);
console.log('admin landed:', page.url());

await page.goto(`${BASE}/ar/admin/clients/${CLIENT_ID}`, {waitUntil:'domcontentloaded'});
await page.waitForTimeout(7000);
console.log('client page:', page.url());
await page.screenshot({path:`${OUT}/admin-client-page.png`, fullPage:true});

const btns = await page.locator('button').allInnerTexts();
console.log('BUTTONS:', JSON.stringify(btns.filter(Boolean).slice(0,30)));

const mentorTab = page.getByRole('button',{name:/ملاحظات \(المنتور\)|Mentor Notes|ملاحظات/}).first();
if(!await mentorTab.count()){ console.log('!! no mentor tab'); console.log((await page.locator('body').innerText()).slice(0,1500)); await browser.close(); process.exit(0); }
await mentorTab.click();
await page.waitForTimeout(2000);
await page.screenshot({path:`${OUT}/admin-mentor-tab.png`, fullPage:true});
console.log('--- MENTOR TAB (admin) ---');
console.log((await page.locator('body').innerText()).slice(0,1800));
console.log('--- CONSOLE ---');
console.log(logs.slice(-25).join('\n'));
await browser.close();
