import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // Mock Supabase calls before page loads
  await page.route("**/rest/v1/episodes*", async (route) => {
    const mockEpisodes = [
      {
        id: "1",
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        severity: 3,
        body_areas: ["underarms", "palms"],
        triggers: ["heat_temperature", "stress_anxiety"],
        is_dry_day: false,
        notes: "Warm afternoon in office presentation.",
      },
      {
        id: "2",
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        severity: 4,
        body_areas: ["underarms"],
        triggers: ["heat_temperature"],
        is_dry_day: false,
        notes: "Hot commute home on bus.",
      },
      {
        id: "3",
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        date: new Date(Date.now() - 3 * 86400000).toISOString(),
        severity: 2,
        body_areas: ["palms"],
        triggers: ["stress_anxiety"],
        is_dry_day: false,
        notes: "Meeting new team members.",
      },
      {
        id: "4",
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        date: new Date(Date.now() - 4 * 86400000).toISOString(),
        severity: 3,
        body_areas: ["underarms", "soles"],
        triggers: ["heat_temperature"],
        is_dry_day: false,
        notes: "Outdoor walking tour.",
      },
      {
        id: "5",
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        severity: 1,
        body_areas: [],
        triggers: [],
        is_dry_day: true,
        notes: "Quiet day at home.",
      },
    ];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockEpisodes),
    });
  });

  await page.route("**/rest/v1/profiles*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "test-user-id",
        user_id: "test-user-id",
        diagnosis_type: "Primary Focal Hyperhidrosis",
        display_name: "Test Warrior",
      }),
    });
  });

  // Mock authenticated state in localStorage
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "sb-test-auth-token",
      JSON.stringify({
        access_token: "fake-jwt",
        user: { id: "test-user-id", email: "test@example.com" },
      })
    );
  });

  console.log("Navigating to http://localhost:4173/insights with mock data...");
  await page.goto("http://localhost:4173/insights", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const screenshotPath = "verification/insights_390px_populated.png";
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Populated screenshot saved to ${screenshotPath}`);

  await browser.close();
})();
