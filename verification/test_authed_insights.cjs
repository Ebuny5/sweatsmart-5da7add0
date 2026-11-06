const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  // Mock Supabase REST endpoints
  await page.route('**/rest/v1/episodes*', async (route) => {
    const episodes = [
      {
        id: 'ep-1',
        user_id: 'test-user-id',
        date: '2025-05-10T14:30:00Z',
        severity: 3,
        primary_area: 'underarms',
        triggers: ['heat', 'stress'],
        notes: 'Sweating heavily during morning presentation.',
        treatment_response: 'good'
      },
      {
        id: 'ep-2',
        user_id: 'test-user-id',
        date: '2025-05-11T09:15:00Z',
        severity: 2,
        primary_area: 'hands',
        triggers: ['caffeine', 'stress'],
        notes: 'Hand sweat after morning coffee.',
        treatment_response: 'moderate'
      },
      {
        id: 'ep-3',
        user_id: 'test-user-id',
        date: '2025-05-12T18:00:00Z',
        severity: 4,
        primary_area: 'underarms',
        triggers: ['spicy_food', 'heat'],
        notes: 'Dinner out.',
        treatment_response: 'poor'
      }
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(episodes)
    });
  });

  await page.route('**/rest/v1/profiles*', async (route) => {
    const profile = [{
      id: 'test-user-id',
      diagnosis_type: 'Primary Focal Hyperhidrosis',
      display_name: 'Alex'
    }];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(profile)
    });
  });

  await page.route('**/auth/v1/user*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'authenticated'
      })
    });
  });

  // Set auth tokens in localStorage before navigating
  const sessionData = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: 'test-user-id',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.com'
    }
  };

  await page.goto('http://localhost:4173/insights');
  await page.evaluate((s) => {
    localStorage.setItem('sb-ujbcolxawpzfjkjviwqw-auth-token', JSON.stringify(s));
  }, sessionData);

  // Reload page so AuthContext picks up the localStorage token
  await page.reload();

  await page.waitForTimeout(2000);

  fs.mkdirSync('verification', { recursive: true });
  await page.screenshot({ path: 'verification/insights_390px_authed.png', fullPage: true });

  await browser.close();
  console.log('Authed screenshot saved to verification/insights_390px_authed.png');
})();
