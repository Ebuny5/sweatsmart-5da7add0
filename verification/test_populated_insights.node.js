import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Route Supabase REST requests to return mock data
  await page.route('**/rest/v1/episodes*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'ep-1',
          user_id: 'user-123',
          date: new Date().toISOString(),
          severity: 3,
          triggers: ['heat', 'stress'],
          body_areas: ['underarms', 'feet_soles'],
          created_at: new Date().toISOString()
        },
        {
          id: 'ep-2',
          user_id: 'user-123',
          date: new Date(Date.now() - 86400000).toISOString(),
          severity: 2,
          triggers: ['heat'],
          body_areas: ['underarms'],
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ])
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'user-123',
          diagnosis_type: 'Primary Focal Hyperhidrosis',
          is_profile_complete: true
        }
      ])
    });
  });

  // Inject session into localStorage if needed or let page load
  await page.goto('http://localhost:4173/insights', { waitUntil: 'networkidle' });

  // Take screenshot
  await page.screenshot({ path: 'verification/insights_populated_390px.png', fullPage: true });

  await browser.close();
  console.log('Saved verification/insights_populated_390px.png');
})();
