import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  // Set local storage session before navigation
  await page.addInitScript(() => {
    const mockAuth = {
      access_token: 'test-token',
      refresh_token: 'test-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'test-user-123',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'test@example.com'
      }
    };
    window.localStorage.setItem('sb-test-auth-token', JSON.stringify(mockAuth));
    // search for any sb key in localstorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      console.log('LS key:', k);
    }
  });

  // Intercept all Supabase calls
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
            notes: 'Felt very hot',
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

  await page.route('**/auth/v1/user', async route => {
    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'test-user-123',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'test@example.com',
        user_metadata: { full_name: 'Alex' }
      })
    });
  });

  await page.goto('http://localhost:4173/insights');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'verification/insights_390px_full_app.png', fullPage: true });
  await browser.close();
})();
