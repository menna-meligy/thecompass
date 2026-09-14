/** Reproduces the admin "add time" call and prints whatever the API says. */
const { chromium } = require("playwright-chromium");
const { site: SITE } = require("./env");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

  await page.goto(`${SITE}/ar/auth`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', "admin@albosla.test");
  await page.fill('input[type="password"]', "Albosla123!");
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/auth"), { timeout: 45000 }),
    page.click('form button[type="submit"]'),
  ]);

  const d = new Date();
  d.setDate(d.getDate() + 7);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const body = {
    mode: "available",
    date,
    start_time: "10:00",
    end_time: "11:00",
    offerings: ["career"],
  };

  const out = await page.evaluate(async (payload) => {
    const r = await fetch("/api/admin/availability/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { status: r.status, text: await r.text() };
  }, body);

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
