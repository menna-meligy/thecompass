/**
 * Second production pass: the admin's "full day closed" action, and what
 * happens when a receipt is rejected.
 *
 *   node .scratch/e2e2.js
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-chromium");
const { site: SITE } = require("./env");
const { makeReceipt, newReference } = require("./receipt");

const SHOTS = path.join(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const ADMIN = { email: "admin@albosla.test", password: "Albosla123!" };
const CLIENT = { email: "user@albosla.test", password: "Albosla123!" };

const log = (...a) => console.log(...a);
const step = (n, s) => console.log(`\n── ${n} ${s} ${"─".repeat(Math.max(0, 52 - s.length))}`);

function isoDatePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function login(browser, who, label) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`${SITE}/ar/auth`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('form button[type="submit"]:not([disabled])', { timeout: 45000 });
  await page.fill('input[type="email"]', who.email);
  await page.fill('input[type="password"]', who.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/auth"), { timeout: 45000 }),
    page.click('form button[type="submit"]'),
  ]);
  log(`   ${label} signed in`);
  return { ctx, page };
}

const feed = async (offering) =>
  (await fetch(`${SITE}/api/availability/centralized-slots?offering=${encodeURIComponent(offering)}`)).json();

/** Poll the feed until it agrees with `want`, or give up after ~20s. */
async function feedUntil(offering, want) {
  let last = await feed(offering);
  for (let i = 0; i < 20 && !want(last); i++) {
    await new Promise((r) => setTimeout(r, 1000));
    last = await feed(offering);
  }
  return last;
}

async function openDay(page, day) {
  await page.goto(`${SITE}/ar/admin/availability`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("text=/مواعيدك|Your availability/", { timeout: 45000 });
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: new RegExp(`^${day}(\\s|$)`) }).first().click();
  await page.waitForSelector("text=/إدارة اليوم|Manage day/", { timeout: 20000 });
}

async function addTime(page, startTime, endTime) {
  await page.getByRole("button", { name: /يوم متاح|Available day/ }).click();
  await page.waitForSelector('input[type="time"]', { timeout: 15000 });
  const times = page.locator('input[type="time"]');
  await times.nth(0).fill(startTime);
  await times.nth(1).fill(endTime);
  // Career only, so the window collapses to one seat on the first booking.
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole("button", { name: /أضف الموعد|Add this time/ }).click();
  await page.waitForTimeout(3000);
}

async function main() {
  const browser = await chromium.launch();
  const results = [];
  const check = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    log(`   ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  };

  try {
    const admin = await login(browser, ADMIN, "admin");

    // ── A. Close a whole day ────────────────────────────────────────────────
    step("A1", "Admin opens times, then closes the whole day");
    const blockDate = isoDatePlus(12);
    const blockDay = Number(blockDate.slice(8, 10));
    const now = new Date();
    const t1 = `${String(9 + (now.getMinutes() % 8)).padStart(2, "0")}:${String((now.getSeconds() % 6) * 10).padStart(2, "0")}`;
    const t2 = `${String(Number(t1.slice(0, 2)) + 1).padStart(2, "0")}:${t1.slice(3)}`;

    await openDay(admin.page, blockDay);
    await addTime(admin.page, t1, t2);

    let f = await feed("career");
    const publishedSlot = (f.slots || []).find((s) => s.date === blockDate && s.start_time === t1);
    check("time is open before closing the day", !!publishedSlot, `${blockDate} ${t1}`);

    await openDay(admin.page, blockDay);
    await admin.page.getByRole("button", { name: /يوم كامل مقفول|Full day closed/ }).click();
    await admin.page.waitForSelector("text=/اقفل اليوم كله|Close the whole day/", { timeout: 15000 });
    await admin.page.screenshot({ path: path.join(SHOTS, "block-1-confirm.png") });
    await admin.page.getByRole("button", { name: /اقفل اليوم كله|Close the whole day/ }).click();
    await admin.page.waitForTimeout(3500);
    await admin.page.screenshot({ path: path.join(SHOTS, "block-2-closed.png"), fullPage: true });

    f = await feedUntil("career", (d) => (d.blockedDates || []).includes(blockDate));
    const stillOpen = (f.slots || []).some((s) => s.date === blockDate);
    const listedBlocked = (f.blockedDates || []).includes(blockDate);
    check("closed day has no bookable times", !stillOpen);
    check("closed day is reported to clients as blocked", listedBlocked, blockDate);

    step("A2", "Client sees the day as closed");
    const client = await login(browser, CLIENT, "client");
    await client.page.goto(`${SITE}/ar/book/availability`, { waitUntil: "domcontentloaded" });
    await client.page.waitForSelector("text=/اختر موعداً|Choose a time/", { timeout: 45000 });
    await client.page.waitForTimeout(2500);
    const dayCell = client.page.getByRole("button", { name: new RegExp(`^${blockDay}\\s*\\d*$`) }).first();
    const disabled = await dayCell.isDisabled();
    const title = await dayCell.getAttribute("title");
    await client.page.screenshot({ path: path.join(SHOTS, "block-3-client.png"), fullPage: true });
    check("client cannot pick a closed day", disabled, `title="${title}"`);

    step("A3", "Admin re-opens the day");
    await openDay(admin.page, blockDay);
    await admin.page.getByRole("button", { name: /افتح اليوم تاني|Re-open this day/ }).click();
    await admin.page.waitForTimeout(3000);
    f = await feedUntil("career", (d) => !(d.blockedDates || []).includes(blockDate));
    check("re-opened day is no longer blocked", !(f.blockedDates || []).includes(blockDate));

    // ── B. Reject a receipt, slot comes back ────────────────────────────────
    step("B1", "Client books and pays on a fresh day");
    const rejDate = isoDatePlus(13);
    const rejDay = Number(rejDate.slice(8, 10));
    const r1 = `${String(9 + ((now.getMinutes() + 3) % 8)).padStart(2, "0")}:${String((now.getSeconds() % 6) * 10).padStart(2, "0")}`;
    const r2 = `${String(Number(r1.slice(0, 2)) + 1).padStart(2, "0")}:${r1.slice(3)}`;

    await openDay(admin.page, rejDay);
    await addTime(admin.page, r1, r2);

    f = await feed("career");
    const rejSlot = (f.slots || []).find((s) => s.date === rejDate && s.start_time === r1);
    check("fresh time published", !!rejSlot, `${rejDate} ${r1}`);
    if (!rejSlot) throw new Error("could not publish the time for the rejection test");

    await client.page.goto(`${SITE}/ar/book/availability`, { waitUntil: "domcontentloaded" });
    await client.page.waitForSelector("text=/اختر موعداً|Choose a time/", { timeout: 45000 });
    await client.page.waitForTimeout(2500);
    await client.page.getByRole("button", { name: new RegExp(`^${rejDay}\\s*\\d*$`) }).first().click();
    await client.page.waitForSelector(`text=${r1}`, { timeout: 20000 });
    await client.page.getByRole("button", { name: new RegExp(r1) }).first().click();
    await client.page.waitForSelector("text=/إنستاباي|InstaPay/", { timeout: 30000 });
    await client.page.getByText(/إنستاباي|InstaPay/).first().click();
    await client.page.waitForTimeout(700);
    await client.page.getByRole("button", { name: /تم التحويل|I Transferred/ }).click();
    await client.page.waitForSelector('input[type="file"]', { state: "attached", timeout: 30000 });

    const reference = newReference();
    const png = await makeReceipt(browser, { amount: 500, reference });
    await client.page.setInputFiles('input[type="file"]', { name: "r.png", mimeType: "image/png", buffer: png });
    await client.page.waitForTimeout(1200);
    await client.page.getByRole("button", { name: /تحقق وتابع|Verify & Continue/ }).click();
    await client.page.waitForSelector("text=/الدفع مرفوض|Payment rejected|تم التحقق|Verified|شكراً|Thank/", { timeout: 180000 });
    await client.page.waitForTimeout(2500);

    f = await feedUntil("career", (d) => !(d.slots || []).some((s) => s.id === rejSlot.id));
    check("slot held after the receipt", !(f.slots || []).some((s) => s.id === rejSlot.id));

    step("B2", "Closing a day with a held booking is refused");
    await openDay(admin.page, rejDay);
    await admin.page.getByRole("button", { name: /يوم كامل مقفول|Full day closed/ }).click();
    await admin.page.getByRole("button", { name: /اقفل اليوم كله|Close the whole day/ }).click();
    await admin.page.waitForTimeout(3000);
    const refused = await admin.page.locator("text=/paid\\/held bookings|already has/").count();
    await admin.page.screenshot({ path: path.join(SHOTS, "block-4-refused.png") });
    check("admin is stopped from closing a booked day", refused > 0);
    await admin.page.getByRole("button", { name: /^تمام$|^Done$/ }).click().catch(() => {});

    step("B3", "Admin rejects the receipt and the slot returns");
    await admin.page.goto(`${SITE}/ar/admin/receipts`, { waitUntil: "domcontentloaded" });
    await admin.page.waitForSelector("text=/إيصالات العملاء|Client receipts/", { timeout: 45000 });
    await admin.page.waitForTimeout(2500);
    const card = admin.page.locator("div.rounded-2xl").filter({ hasText: reference }).first();
    await card.getByRole("button", { name: /ارفض|Reject/ }).first().click();
    await admin.page.waitForTimeout(4500);
    await admin.page.screenshot({ path: path.join(SHOTS, "block-5-rejected.png"), fullPage: true });

    f = await feedUntil("career", (d) => (d.slots || []).some((s) => s.id === rejSlot.id));
    const backOnSale = (f.slots || []).some((s) => s.id === rejSlot.id);
    check("rejected booking frees the slot again", backOnSale, `${rejDate} ${r1}`);

    await client.ctx.close();
    await admin.ctx.close();
  } catch (err) {
    log(`\n!! ${err.message}`);
    results.push({ name: "run completed", ok: false, detail: err.message.split("\n")[0] });
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  log(`\n════ ${results.length - failed.length}/${results.length} checks passed`);
  for (const x of failed) log(`  FAILED: ${x.name} ${x.detail}`);
  process.exit(failed.length ? 1 : 0);
}

main();
