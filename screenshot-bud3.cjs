const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
  await page.goto("http://localhost:8104/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill("finance@ur.ac.rw");
  await page.getByLabel(/password/i).fill("finance123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/finance/, { timeout: 15000 });
  await page.goto("http://localhost:8104/budgets/BUD-3", { waitUntil: "load" });
  await page.getByRole('heading', { name: 'Approval chain' }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "bud3.png", fullPage: true });

  await page.goto("http://localhost:8104/budgets/BUD-2", { waitUntil: "load" });
  await page.getByRole('heading', { name: 'Approval chain' }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "bud2.png", fullPage: true });
  await browser.close();
})();
