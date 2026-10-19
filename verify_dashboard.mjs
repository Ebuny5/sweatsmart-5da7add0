import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }
  });
  const page = await context.newPage();

  // Mock API requests to Supabase for episodes and users
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (url.includes('supabase.co/rest/v1/episodes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', date: new Date(Date.now() - 6 * 86400000).toISOString(), severity: 3, triggers: [], body_areas: [], user_id: 'mock-user-id', created_at: new Date().toISOString() },
          { id: '2', date: new Date(Date.now() - 5 * 86400000).toISOString(), severity: 5, triggers: [], body_areas: [], user_id: 'mock-user-id', created_at: new Date().toISOString() },
          { id: '3', date: new Date(Date.now() - 4 * 86400000).toISOString(), severity: 2, triggers: [], body_areas: [], user_id: 'mock-user-id', created_at: new Date().toISOString() },
          { id: '4', date: new Date(Date.now() - 3 * 86400000).toISOString(), severity: 4, triggers: [], body_areas: [], user_id: 'mock-user-id', created_at: new Date().toISOString() },
          { id: '5', date: new Date(Date.now() - 2 * 86400000).toISOString(), severity: 4, triggers: [], body_areas: [], user_id: 'mock-user-id', created_at: new Date().toISOString() },
          { id: '6', date: new Date(Date.now() - 1 * 86400000).toISOString(), severity: 8, triggers: [], body_areas: [], user_id: 'mock-user-id', created_at: new Date().toISOString() },
          { id: '7', date: new Date().toISOString(), severity: 7, triggers: [], body_areas: [], user_id: 'mock-user-id', created_at: new Date().toISOString() }
        ])
      });
    } else if (url.includes('supabase.co/rest/v1/profiles')) {
       await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'mock-user-id', first_name: 'test', is_profile_complete: true }])
      });
    } else {
      await route.continue();
    }
  });

  // Go to root to establish origin, then set localStorage
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });

  await page.evaluate(() => {
    const mockSession = {
      provider_token: null,
      access_token: "mock-token",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "mock-refresh-token",
      token_type: "bearer",
      user: {
        id: "mock-user-id",
        aud: "authenticated",
        role: "authenticated",
        email: "test@example.com",
        app_metadata: { provider: "email" },
        user_metadata: { first_name: "test", is_profile_complete: true }
      }
    };
    localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
    localStorage.setItem('sb-ujbcolxawpzfjkjviwqw-auth-token', JSON.stringify(mockSession));
  });

  // Now go to the dashboard
  await page.goto('http://localhost:8081/dashboard', { waitUntil: 'networkidle' });

  // Wait a moment for rendering
  await page.waitForTimeout(3000);

  await page.screenshot({ path: '/home/jules/verification/screenshots/dashboard_fixed.png', fullPage: true });

  await browser.close();
  console.log("Screenshot saved to /home/jules/verification/screenshots/dashboard_fixed.png");
})();
