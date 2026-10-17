import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:4173/insights...");
  await page.goto("http://localhost:4173/insights", { waitUntil: "networkidle" });

  await page.waitForTimeout(3000);

  const screenshotPath = "verification/insights_390px.png";
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();
})();
