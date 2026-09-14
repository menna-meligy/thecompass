/**
 * Builds a payment-receipt PNG that the real client-side OCR can read.
 *
 * Rendered with the same headless Chromium the test drives, so there's no
 * native-canvas dependency. The image is deliberately large and textured so it
 * clears the server's 20KB "is this actually a screenshot" floor.
 */

function todayCairo() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

function receiptHtml({ amount, reference, method = "InstaPay", recipient = "01027857707" }) {
  const date = todayCairo();
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:720px; height:1100px; background:
      repeating-linear-gradient(45deg,#fdfdfd 0 12px,#f4f4f6 12px 24px);
      font-family: Arial, Helvetica, sans-serif; color:#0b0b0b; padding:48px; }
    .card { background:#fff; border:3px solid #111; border-radius:18px; padding:40px; height:100%; }
    h1 { font-size:42px; text-align:center; margin-bottom:8px; letter-spacing:1px; }
    .ok { text-align:center; font-size:26px; margin-bottom:36px; }
    .amount { font-size:74px; font-weight:bold; text-align:center; margin:30px 0 44px; }
    .row { font-size:28px; margin:22px 0; display:flex; justify-content:space-between; }
    .row span:last-child { font-weight:bold; }
    .foot { margin-top:48px; font-size:22px; text-align:center; }
  </style></head><body><div class="card">
    <h1>${method} Receipt</h1>
    <div class="ok">Transfer Successful</div>
    <div class="amount">${amount} EGP</div>
    <div class="row"><span>Date</span><span>${date}</span></div>
    <div class="row"><span>To</span><span>${recipient}</span></div>
    <div class="row"><span>Reference</span><span>${reference}</span></div>
    <div class="row"><span>Status</span><span>COMPLETED</span></div>
    <div class="foot">Thank you for using ${method}</div>
  </div></body></html>`;
}

/** Returns a PNG Buffer. */
async function makeReceipt(browser, opts) {
  const page = await browser.newPage({ viewport: { width: 720, height: 1100 } });
  await page.setContent(receiptHtml(opts), { waitUntil: "load" });
  const buf = await page.screenshot({ type: "png" });
  await page.close();
  return buf;
}

/** A reference that is >=8 digits, not the amount, not an Egyptian mobile. */
function newReference() {
  return String(778000000000 + Math.floor(Math.random() * 99999999));
}

module.exports = { makeReceipt, newReference, todayCairo };
