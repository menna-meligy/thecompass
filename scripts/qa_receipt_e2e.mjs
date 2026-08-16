import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const RECEIPT = process.argv[2] || "test-receipts/qa_correct_500_today.png";
const log = (...a) => console.log("[e2e]", ...a);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
const page = await ctx.newPage();
const out = { steps: [], result: null };

try {
  // 1) Login as client
  await page.goto(`${BASE}/ar/auth`, { waitUntil: "networkidle" });
  await page.fill('input[type=email]', "user@albosla.test");
  await page.fill('input[type=password]', "Albosla123!");
  await page.locator("form").first().evaluate((f) => f.requestSubmit());
  await page.waitForTimeout(2500);
  out.steps.push("after-login url=" + page.url());

  // 2) Booking page
  await page.goto(`${BASE}/ar/book/general`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const btns1 = await page.$$eval("button", (bs) => bs.map((b) => b.innerText.trim()).filter(Boolean).slice(0, 40));
  out.steps.push("book/general buttons: " + JSON.stringify(btns1));

  // Pick the first slot — the "احجز" (Book) button on a slot card
  const book = page.getByRole("button", { name: "احجز" }).first();
  const bookLink = page.getByText("احجز", { exact: true }).first();
  if (await book.count()) { await book.click().catch(() => {}); out.steps.push("clicked احجز (button)"); }
  else if (await bookLink.count()) { await bookLink.click().catch(() => {}); out.steps.push("clicked احجز (text)"); }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
  out.steps.push("after-book url=" + page.url());
  out.steps.push("payment-step buttons: " + JSON.stringify(await page.$$eval("button", (bs) => bs.map((b) => b.innerText.trim().replace(/\n/g, " ")).filter(Boolean).slice(0, 30))));

  // Choose InstaPay (a method card/button)
  const instapay = page.getByText(/إنستاباي|انستاباي|InstaPay/i).first();
  if (await instapay.count()) { await instapay.click().catch(() => {}); out.steps.push("clicked instapay"); }
  await page.waitForTimeout(800);

  // Proceed to upload step ("تم التحويل" / "رفع الإيصال")
  const proceed = page.getByRole("button", { name: /تم التحويل|رفع الإيصال|تأكيد التحويل|التالي/ }).first();
  if (await proceed.count()) { await proceed.click().catch(() => {}); out.steps.push("clicked proceed→proof"); }
  await page.waitForTimeout(1500);

  const btns2 = await page.$$eval("button", (bs) => bs.map((b) => b.innerText.trim()).filter(Boolean).slice(0, 40));
  out.steps.push("proof-step buttons: " + JSON.stringify(btns2));
  const fileInputs = await page.$$('input[type=file]');
  out.steps.push("file inputs found: " + fileInputs.length);

  // Upload receipt
  if (fileInputs.length) {
    await page.setInputFiles('input[type=file]', RECEIPT);
    out.steps.push("set receipt file: " + RECEIPT);
    await page.waitForTimeout(1200);
    // Click a verify/submit button
    const verify = page.getByRole("button", { name: /تحقق|تأكيد|رفع|إرسال|verify|submit/i }).first();
    if (await verify.count()) { await verify.click().catch(() => {}); out.steps.push("clicked verify/submit"); }
    // OCR + verify can take several seconds
    await page.waitForTimeout(12000);
    out.result = (await page.innerText("body")).replace(/\s+/g, " ").slice(0, 900);
  } else {
    out.result = "NO_FILE_INPUT — flow diagnostics: " + (await page.innerText("body")).replace(/\s+/g, " ").slice(0, 600);
  }
} catch (e) {
  out.error = String(e).slice(0, 300);
} finally {
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
