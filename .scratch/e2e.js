/**
 * End-to-end check of the real production site.
 *
 * Admin opens availability → a client books it → the receipt lands on the admin
 * side → the slot disappears for everyone else → the admin confirms → it shows
 * on the schedule.
 *
 *   node .scratch/e2e.js career
 *   node .scratch/e2e.js individual
 *   node .scratch/e2e.js group
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-chromium");
const { url: SUPABASE_URL, anon: ANON, site: SITE } = require("./env");
const { makeReceipt, newReference } = require("./receipt");

const SHOTS = path.join(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const ADMIN = { email: "admin@albosla.test", password: "Albosla123!" };
const CLIENT = { email: "user@albosla.test", password: "Albosla123!" };

const log = (...a) => console.log(...a);
const step = (n, s) => console.log(`\n── ${n} ${s} ${"─".repeat(Math.max(0, 54 - s.length))}`);

function isoDatePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function login(browser, who, label) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") log(`   [${label} console] ${m.text().slice(0, 160)}`);
  });
  await page.goto(`${SITE}/ar/auth`, { waitUntil: "domcontentloaded" });
  // The submit button stays disabled until React hydrates, so waiting for it to
  // become enabled is exactly "the client-side handler is attached".
  await page.waitForSelector('form button[type="submit"]:not([disabled])', { timeout: 45000 });
  await page.fill('input[type="email"]', who.email);
  await page.fill('input[type="password"]', who.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/auth"), { timeout: 45000 }),
    page.click('form button[type="submit"]'),
  ]);
  log(`   ${label} signed in → ${new URL(page.url()).pathname}`);
  return { ctx, page };
}

async function feed(offering) {
  const r = await fetch(
    `${SITE}/api/availability/centralized-slots?offering=${encodeURIComponent(offering)}`,
    { headers: { "cache-control": "no-cache" } },
  );
  return r.json();
}

async function main() {
  const kind = process.argv[2] || "career";
  const workshopId = process.argv[3] || null;
  const offering = kind === "career" ? "career" : `${workshopId}:${kind}`;
  const price = kind === "group" ? 1200 : 500;

  log(`\n╔══ E2E on ${SITE}`);
  log(`║  offering: ${offering}   price: ${price} EGP`);
  log("╚" + "═".repeat(60));

  const browser = await chromium.launch();
  const results = [];
  const check = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    log(`   ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  };

  try {
    // ── 1. Admin opens a time window ────────────────────────────────────────
    step("1/8", "Admin opens availability");
    const admin = await login(browser, ADMIN, "admin");
    const targetDate = isoDatePlus(kind === "group" ? 9 : kind === "individual" ? 8 : 7);
    const startTime = kind === "group" ? "16:00" : kind === "individual" ? "12:00" : "10:00";
    const endTime = kind === "group" ? "17:00" : kind === "individual" ? "13:00" : "11:00";

    await admin.page.goto(`${SITE}/ar/admin/availability`, { waitUntil: "domcontentloaded" });
    await admin.page.waitForSelector("text=/مواعيدك|Your availability/", { timeout: 45000 });

    const day = Number(targetDate.slice(8, 10));
    // Calendar cells are plain buttons showing the day number.
    await admin.page.getByRole("button", { name: new RegExp(`^${day}(\\s|$)`) }).first().click();
    await admin.page.waitForSelector("text=/إدارة اليوم|Manage day/", { timeout: 20000 });
    await admin.page.screenshot({ path: path.join(SHOTS, `${kind}-1-day-editor.png`) });

    // The two actions are separate — click the green one.
    await admin.page.getByRole("button", { name: /يوم متاح|Available day/ }).click();
    await admin.page.waitForSelector('input[type="time"]', { timeout: 15000 });
    const times = admin.page.locator('input[type="time"]');
    await times.nth(0).fill(startTime);
    await times.nth(1).fill(endTime);

    // Tick every offering so we also prove the commitment rule.
    const boxes = admin.page.locator('input[type="checkbox"]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
    check("admin day editor lists all offerings", n >= 7, `${n} offerings`);

    await admin.page.screenshot({ path: path.join(SHOTS, `${kind}-2-add-time.png`), fullPage: true });
    await admin.page.getByRole("button", { name: /أضف الموعد|Add this time/ }).click();
    await admin.page.waitForTimeout(3500);
    await admin.page.screenshot({ path: path.join(SHOTS, `${kind}-3-after-add.png`), fullPage: true });

    // ── 2. It shows up on the public feed ───────────────────────────────────
    step("2/8", "Slot is public for this offering");
    const before = await feed(offering);
    const slot = (before.slots || []).find((s) => s.date === targetDate && s.start_time === startTime);
    check("slot visible to clients", !!slot, slot ? `${slot.date} ${slot.start_time} (${slot.seats_left} seats)` : `not in feed for ${targetDate} ${startTime}`);
    if (!slot) throw new Error("slot not published — stopping");

    // ── 3. Client books it ──────────────────────────────────────────────────
    step("3/8", "Client books the slot");
    const client = await login(browser, CLIENT, "client");
    const bookPath = kind === "career" ? `/ar/book/availability` : `/ar/workshops/${workshopId}`;
    await client.page.goto(`${SITE}${bookPath}`, { waitUntil: "domcontentloaded" });

    if (kind !== "career") {
      await client.page.getByRole("button", { name: kind === "group" ? /مجموعة|Group/ : /فردي|1-on-1/ }).first().click();
      await client.page.waitForTimeout(1500);
    }

    await client.page.waitForSelector("text=/اختر موعداً|Choose a time/", { timeout: 45000 });
    await client.page.waitForTimeout(2500);
    await client.page.getByRole("button", { name: new RegExp(`^${day}\\s*\\d*$`) }).first().click();
    await client.page.waitForSelector(`text=${startTime}`, { timeout: 20000 });
    await client.page.screenshot({ path: path.join(SHOTS, `${kind}-4-client-calendar.png`), fullPage: true });

    const priceOnCard = await client.page.locator(`text=/${price.toLocaleString("en-US")}/`).count();
    check("client sees the right price", priceOnCard > 0, `${price} EGP`);

    await client.page.getByRole("button", { name: new RegExp(`${startTime}`) }).first().click();
    await client.page.waitForSelector("text=/إنستاباي|InstaPay/", { timeout: 30000 });
    await client.page.getByText(/إنستاباي|InstaPay/).first().click();
    await client.page.waitForTimeout(800);
    await client.page.screenshot({ path: path.join(SHOTS, `${kind}-5-payment.png`), fullPage: true });

    await client.page.getByRole("button", { name: /تم التحويل|I Transferred/ }).click();
    await client.page.waitForSelector('input[type="file"]', { state: "attached", timeout: 30000 });
    check("booking created, reached receipt step", true);

    // ── 4. Slot is still open until the receipt lands ───────────────────────
    step("4/8", "Slot stays open until a receipt arrives");
    const midway = await feed(offering);
    const stillThere = (midway.slots || []).some((s) => s.id === slot.id);
    check("slot NOT held by an unpaid booking", stillThere);

    // ── 5. Upload a valid receipt ───────────────────────────────────────────
    step("5/8", "Client uploads the receipt");
    const reference = newReference();
    const png = await makeReceipt(browser, { amount: price, reference });
    log(`   receipt: ${price} EGP, ref ${reference}, ${(png.length / 1024).toFixed(0)}KB`);
    await client.page.setInputFiles('input[type="file"]', {
      name: "receipt.png",
      mimeType: "image/png",
      buffer: png,
    });
    await client.page.waitForTimeout(1500);
    await client.page.getByRole("button", { name: /تحقق وتابع|Verify & Continue/ }).click();

    // Browser-side OCR is slow; give it room.
    await client.page.waitForSelector("text=/تم التحقق|Verified|الدفع مرفوض|Payment rejected|حصلت مشكلة|Something went wrong/", { timeout: 180000 });
    await client.page.waitForTimeout(2500);
    await client.page.screenshot({ path: path.join(SHOTS, `${kind}-6-receipt-result.png`), fullPage: true });
    const rejected = await client.page.locator("text=/الدفع مرفوض|Payment rejected/").count();
    const verified = await client.page.locator("text=/تم التحقق|Verified/").count();
    check("receipt accepted", verified > 0 && rejected === 0, rejected ? await client.page.locator("li").first().innerText().catch(() => "") : "");

    // ── 6. The slot disappears everywhere ───────────────────────────────────
    step("6/8", "Slot disappears for everyone else");
    await new Promise((r) => setTimeout(r, 2500));
    const after = await feed(offering);
    const gone = !(after.slots || []).some((s) => s.id === slot.id);
    const seatsLeft = (after.slots || []).find((s) => s.id === slot.id)?.seats_left;

    if (kind === "group") {
      check("group slot still open with one fewer seat", !gone && seatsLeft === 7, `seats_left=${seatsLeft}`);
      const otherFeed = await feed("career");
      const leaked = (otherFeed.slots || []).some((s) => s.id === slot.id);
      check("committed group slot NOT offered as a career session", !leaked);
    } else {
      check("slot gone from the client feed", gone);
      for (const other of ["career", workshopId ? `${workshopId}:individual` : null, workshopId ? `${workshopId}:group` : null].filter(Boolean)) {
        const f = await feed(other);
        const leak = (f.slots || []).some((s) => s.id === slot.id);
        if (other !== offering) check(`slot also gone from "${other}"`, !leak);
      }
    }

    // A second client's browser must not see it either.
    const second = await browser.newContext();
    const sp = await second.newPage();
    await sp.goto(`${SITE}${bookPath}`, { waitUntil: "domcontentloaded" });
    await sp.waitForTimeout(4000);
    await sp.screenshot({ path: path.join(SHOTS, `${kind}-7-other-client.png`), fullPage: true });
    await second.close();

    // ── 7. Receipt shows on the admin side ──────────────────────────────────
    step("7/8", "Receipt shows on the admin side");
    await admin.page.goto(`${SITE}/ar/admin/receipts`, { waitUntil: "domcontentloaded" });
    await admin.page.waitForSelector("text=/إيصالات العملاء|Client receipts/", { timeout: 45000 });
    await admin.page.waitForTimeout(3000);
    const refShown = await admin.page.locator(`text=${reference}`).count();
    const imgs = await admin.page.locator('img[alt*="إيصال"], img[alt*="receipt"]').count();
    await admin.page.screenshot({ path: path.join(SHOTS, `${kind}-8-admin-receipts.png`), fullPage: true });
    check("receipt listed on /admin/receipts", refShown > 0, `ref ${reference}`);
    check("receipt image rendered for the admin", imgs > 0, `${imgs} image(s)`);

    // Confirm it.
    const row = admin.page.locator("div", { hasText: reference });
    await admin.page.getByRole("button", { name: /أكّد الحجز|Approve & confirm/ }).first().click();
    await admin.page.waitForTimeout(4000);
    await admin.page.screenshot({ path: path.join(SHOTS, `${kind}-9-approved.png`), fullPage: true });

    // ── 8. It lands on the schedule ─────────────────────────────────────────
    step("8/8", "Confirmed session shows on the schedule");
    await admin.page.goto(`${SITE}/ar/admin/meetings`, { waitUntil: "domcontentloaded" });
    await admin.page.waitForSelector("text=/جدول جلساتك|Your schedule/", { timeout: 45000 });
    await admin.page.waitForTimeout(3000);
    const onSchedule = await admin.page.locator(`text=${startTime}`).count();
    await admin.page.screenshot({ path: path.join(SHOTS, `${kind}-10-schedule.png`), fullPage: true });
    check("session appears on the admin schedule", onSchedule > 0, `${targetDate} ${startTime}`);

    await admin.page.goto(`${SITE}/ar/admin/bookings`, { waitUntil: "domcontentloaded" });
    await admin.page.waitForTimeout(3500);
    await admin.page.screenshot({ path: path.join(SHOTS, `${kind}-11-bookings.png`), fullPage: true });

    await client.ctx.close();
    await admin.ctx.close();
  } catch (err) {
    log(`\n!! ${err.message}`);
    results.push({ name: "run completed", ok: false, detail: err.message });
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  log(`\n════ ${results.length - failed.length}/${results.length} checks passed`);
  for (const f of failed) log(`  FAILED: ${f.name} ${f.detail}`);
  process.exit(failed.length ? 1 : 0);
}

main();
