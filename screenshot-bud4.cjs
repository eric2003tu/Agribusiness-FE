const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto("http://localhost:8104/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill("finance@ur.ac.rw");
  await page.getByLabel(/password/i).fill("finance123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/finance/, { timeout: 15000 });
  await page.goto("http://localhost:8104/budgets/BUD-4", { waitUntil: "load" });
  await page.locator("text=Approval chain").waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "bud4-before.png", fullPage: true });
  await browser.close();
})();
