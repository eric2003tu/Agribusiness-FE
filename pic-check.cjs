const { chromium } = require("playwright");
const OUT = "C:/Users/mukar/AppData/Local/Temp/claude/c--Users-mukar-Desktop-Agribusines-fe/a99c1736-a732-4d30-ad08-b823d60e92a5/scratchpad";
const BASE = "http://localhost:8081";

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1450, height: 1000 } });
    page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });

    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.locator("text=Demo accounts").waitFor({ timeout: 15000 });
    await page.waitForTimeout(2200);
    await page.fill("#phone", "+250788100001");
    await page.fill("#otp", "1234");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    await page.goto(`${BASE}/listings`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Produce listings" }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/pic-listings-table.png`, fullPage: true });

    await page.goto(`${BASE}/listings/PL-1002`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Maize" }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/pic-listing-detail.png`, fullPage: true });

    await page.goto(`${BASE}/listings/new`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "New produce listing" }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/pic-listing-new.png`, fullPage: true });

    await page.goto(`${BASE}/inputs`, { waitUntil: "load" });
    await page.getByRole("heading", { name: "Input marketplace" }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/pic-inputs-table.png`, fullPage: true });

    await page.goto(`${BASE}/inputs/IL-4005`, { waitUntil: "load" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/pic-input-detail.png`, fullPage: true });

    console.log("ERRORS:" + errors.length);
    errors.forEach((e) => console.log(e));
    console.log("DONE");
  } catch (err) {
    console.log("FAILED:", err.message);
  } finally {
    await browser.close();
  }
})();
