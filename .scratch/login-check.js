const { url, anon } = require("./env");

(async () => {
  for (const email of ["admin@albosla.test", "user@albosla.test"]) {
    const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Albosla123!" }),
    });
    console.log(email, r.status, r.ok ? "OK" : (await r.text()).slice(0, 140));
  }
})();
