import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  // Route Supabase calls
  await page.route('**/rest/v1/**', async route => {
    const url = route.request().url();
    if (url.includes('episodes')) {
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([
          {
            id: 'ep1',
            user_id: 'test-user-123',
            date: new Date().toISOString(),
            severity: 3,
            primary_area: 'palms',
            secondary_areas: ['feet_soles'],
            triggers: ['stress', 'heat'],
            notes: 'Felt very hot in meeting',
            dry_day: false,
            created_at: new Date().toISOString()
          },
          {
            id: 'ep2',
            user_id: 'test-user-123',
            date: new Date(Date.now() - 86400000).toISOString(),
            severity: 2,
            primary_area: 'palms',
            secondary_areas: [],
            triggers: ['anxiety'],
            notes: '',
            dry_day: false,
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ])
      });
    }
    if (url.includes('profiles')) {
      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([
          {
            id: 'test-user-123',
            display_name: 'Alex',
            is_profile_complete: true,
            diagnosis_type: 'Primary Focal Hyperhidrosis',
            primary_area: 'palms',
            secondary_areas: ['feet_soles'],
            hdss_score: 3
          }
        ])
      });
    }
    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([])
    });
  });

  // Inject session into local storage
  await page.addInitScript(() => {
    const session = {
      access_token: "fake-jwt",
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: "fake-refresh",
      user: {
        id: "test-user-123",
        aud: "authenticated",
        role: "authenticated",
        email: "test@example.com",
        app_metadata: { provider: "email" },
        user_metadata: { full_name: "Alex" },
        created_at: new Date().toISOString()
      }
    };
    // Supabase JS v2 uses sb-<project_ref>-auth-token
    window.localStorage.setItem('sb-abcdefghijklmnopqrst-auth-token', JSON.stringify(session));
  });

  await page.goto('http://localhost:4173/insights');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'verification/insights_390px_direct.png', fullPage: true });
  await browser.close();
})();
