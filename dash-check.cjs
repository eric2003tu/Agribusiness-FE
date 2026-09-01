const { chromium } = require("playwright");
const OUT = "C:/Users/mukar/AppData/Local/Temp/claude/c--Users-mukar-Desktop-Agribusines-fe/a99c1736-a732-4d30-ad08-b823d60e92a5/scratchpad";
const BASE = "http://localhost:8082";

async function freshLoad(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.localStorage.clear()).catch(() => {});
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

async function signInAs(page, phone, otp) {
  await freshLoad(page, `${BASE}/`);
  await page.locator("text=Demo accounts").waitFor({ timeout: 15000 });
  await page.waitForTimeout(2200);
  await page.fill("#phone", phone);
  await page.fill("#otp", otp);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  await page.getByRole("heading", { name: /dashboard/i }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1600 } });
    page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });

    await signInAs(page, "+250788200001", "1234"); // buyer
    await page.screenshot({ path: `${OUT}/d1-buyer.png`, fullPage: true });

    await signInAs(page, "+250788300001", "1234"); // supplier
    await page.screenshot({ path: `${OUT}/d2-supplier.png`, fullPage: true });

    await signInAs(page, "+250788999999", "1234"); // admin
    await page.screenshot({ path: `${OUT}/d3-admin.png`, fullPage: true });

    await signInAs(page, "+250788400001", "1234"); // transporter
    await page.screenshot({ path: `${OUT}/d4-transporter.png`, fullPage: true });

    console.log("ERRORS:" + errors.length);
    errors.forEach((e) => console.log(e));
    console.log("DONE");
  } catch (err) {
    console.log("FAILED:", err.message);
  } finally {
    await browser.close();
  }
})();
