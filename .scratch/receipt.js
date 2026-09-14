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
    /* Plain white, generous spacing, no decorative background — Tesseract
       misreads digits sitting on a patterned ground. */
    body { width:760px; height:1160px; background:#fff;
      font-family: Arial, Helvetica, sans-serif; color:#000; padding:56px; }
    .card { background:#fff; border:2px solid #000; padding:44px; height:100%; }
    h1 { font-size:40px; text-align:center; margin-bottom:10px; }
    .ok { text-align:center; font-size:26px; margin-bottom:56px; }
    /* Same size as the rest of the document: Tesseract's line model does much
       better on uniform text than on one oversized hero number (it read a
       64px "500" as "900"). */
    .amount { font-size:34px; font-weight:bold; text-align:center; margin:0 0 56px; }
    .row { font-size:30px; margin:34px 0; display:flex; justify-content:space-between; gap:24px; }
    .foot { margin-top:64px; font-size:22px; text-align:center; }
  </style></head><body><div class="card">
    <h1>${method} Receipt</h1>
    <div class="ok">Transfer Successful</div>
    <div class="amount">${amount} EGP</div>
    <div class="row"><span>Date</span><span>${date}</span></div>
    <div class="row"><span>To</span><span>${recipient}</span></div>
    <div class="row"><span>Reference</span><span>${reference}</span></div>
    <div class="foot">Thank you for using ${method}</div>
  </div></body></html>`;
}

/** Returns a PNG Buffer. */
async function makeReceipt(browser, opts) {
  const page = await browser.newPage({ viewport: { width: 760, height: 1160 }, deviceScaleFactor: 2 });
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
