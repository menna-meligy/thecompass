/**
 * Runs the OCR the way the app actually does it — tesseract.js in a browser,
 * same version, same fast traineddata, same two page-seg passes.
 *
 * Node-side OCR reads these fixtures fine while the browser doesn't, so tune
 * against this, not against ocr-probe.js.
 */
const path = require("path");
const { chromium } = require("playwright-chromium");
const { makeReceipt, newReference } = require("./receipt");

const TESSERACT_UMD = path.join(
  __dirname, "..", "node_modules", "tesseract.js", "dist", "tesseract.min.js",
);

function parse(rawText) {
  const flat = rawText.replace(/\n/g, " ");
  let amount = null;
  const m =
    flat.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:EGP|LE|جنيه|ج\.?\s?م)/i) ||
    flat.match(/(?:EGP|LE|جنيه)\s*(\d[\d,]*(?:\.\d+)?)/i);
  if (m) amount = parseFloat(m[1].replace(/,/g, ""));
  const d = flat.match(/(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})|(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const amtStr = amount != null ? String(Math.round(amount)) : null;
  const runs = (flat.match(/\d{6,}/g) || []).filter(
    (x) => x !== amtStr && !/^01\d{9}$/.test(x) && x.length >= 8,
  );
  runs.sort((a, b) => b.length - a.length);
  return { amount, date: d ? d[0] : null, reference: runs[0] || null };
}

(async () => {
  const amount = Number(process.argv[2] || 500);
  const browser = await chromium.launch();
  const reference = newReference();
  const png = await makeReceipt(browser, { amount, reference });
  console.log(`fixture: ${amount} EGP, ref ${reference}, ${(png.length / 1024).toFixed(0)}KB`);

  const page = await browser.newPage();
  await page.goto("about:blank");
  await page.addScriptTag({ path: TESSERACT_UMD });

  const text = await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: "image/png" });

    const worker = await Tesseract.createWorker("eng", 1, {
      langPath: "https://tessdata.projectnaptha.com/4.0.0_fast",
    });
    let out = "";
    for (const psm of ["3", "11"]) {
      await worker.setParameters({ tessedit_pageseg_mode: psm });
      const { data } = await worker.recognize(blob);
      out += "\n" + data.text;
    }
    await worker.terminate();
    return out;
  }, png.toString("base64"));

  console.log("\n─── browser OCR text ───");
  console.log(text.trim().split("\n").filter(Boolean).join("\n"));
  const parsed = parse(text);
  console.log("\n─── parsed ───");
  console.log(parsed);
  console.log(
    `\namount ${parsed.amount === amount ? "OK" : "WRONG (got " + parsed.amount + ", expected " + amount + ")"}` +
      ` | reference ${parsed.reference === reference ? "OK" : "WRONG (got " + parsed.reference + ")"}` +
      ` | date ${parsed.date ? "OK (" + parsed.date + ")" : "MISSING"}`,
  );
  await browser.close();
})();
