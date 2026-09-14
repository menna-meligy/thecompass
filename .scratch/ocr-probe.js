/**
 * OCRs a generated receipt with the same tesseract.js the app uses and applies
 * the app's own parse rules, so the fixture can be tuned in seconds instead of
 * by driving the whole booking flow.
 */
const { chromium } = require("playwright-chromium");
const { createWorker } = require("tesseract.js");
const { makeReceipt, newReference } = require("./receipt");

// Mirrors parseReceipt() in src/lib/payments/receipt.ts.
function parse(rawText) {
  const flat = rawText.replace(/\n/g, " ");
  let amount = null;
  const m =
    flat.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:EGP|LE|جنيه|ج\.?\s?م)/i) ||
    flat.match(/(?:EGP|LE|جنيه)\s*(\d[\d,]*(?:\.\d+)?)/i);
  if (m) amount = parseFloat(m[1].replace(/,/g, ""));

  let date = null;
  const d = flat.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})|(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (d) date = d[0];

  const amtStr = amount != null ? String(Math.round(amount)) : null;
  const runs = (flat.match(/\d{6,}/g) || []).filter(
    (x) => x !== amtStr && !/^01\d{9}$/.test(x) && x.length >= 8,
  );
  runs.sort((a, b) => b.length - a.length);
  return { amount, date, reference: runs[0] || null };
}

(async () => {
  const amount = Number(process.argv[2] || 500);
  const browser = await chromium.launch();
  const reference = newReference();
  const png = await makeReceipt(browser, { amount, reference });
  await browser.close();
  console.log(`fixture: ${amount} EGP, ref ${reference}, ${(png.length / 1024).toFixed(0)}KB`);

  const worker = await createWorker("eng", 1, {
    langPath: "https://tessdata.projectnaptha.com/4.0.0_fast",
    logger: () => {},
  });
  let text = "";
  for (const psm of ["3", "11"]) {
    await worker.setParameters({ tessedit_pageseg_mode: psm });
    const { data } = await worker.recognize(png);
    text += "\n" + data.text;
  }
  await worker.terminate();

  console.log("\n─── OCR text ───");
  console.log(text.trim().split("\n").filter(Boolean).join("\n"));
  console.log("\n─── parsed ───");
  const parsed = parse(text);
  console.log(parsed);
  console.log(
    `\namount ${parsed.amount === amount ? "OK" : "WRONG (expected " + amount + ")"}` +
      ` | reference ${parsed.reference === reference ? "OK" : "WRONG (expected " + reference + ")"}` +
      ` | date ${parsed.date ? "OK (" + parsed.date + ")" : "MISSING"}`,
  );
})();
