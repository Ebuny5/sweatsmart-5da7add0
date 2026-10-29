import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  // Inject user profile and episode mock data into localStorage or mock supabase auth
  await page.goto('http://localhost:4173');

  // Let's set localStorage for mock session / user if needed or mock network responses
  await page.evaluate(() => {
    const mockUser = {
      id: 'test-user-123',
      email: 'test@example.com'
    };
    const mockSession = {
      access_token: 'fake-token',
      token_type: 'bearer',
      user: mockUser
    };
    // set sb token if supabase uses localStorage
    for (let key in localStorage) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.setItem(key, JSON.stringify(mockSession));
      }
    }
  });

  // Intercept Supabase RPCs / SELECTs
  await page.route('**/rest/v1/episodes*', async route => {
    const json = [
      {
        id: 'ep1',
        user_id: 'test-user-123',
        date: new Date(Date.now() - 3600000).toISOString(),
        severity: 3,
        primary_area: 'palms',
        secondary_areas: ['feet_soles'],
        triggers: ['stress', 'heat'],
        notes: 'Felt very hot in meeting',
        dry_day: false,
        created_at: new Date(Date.now() - 3600000).toISOString()
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
      },
      {
        id: 'ep3',
        user_id: 'test-user-123',
        date: new Date(Date.now() - 172800000).toISOString(),
        severity: 1,
        primary_area: 'palms',
        secondary_areas: [],
        triggers: [],
        notes: 'Dry day!',
        dry_day: true,
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ];
    await route.fulfill({ json });
  });

  await page.route('**/rest/v1/profiles*', async route => {
    const json = [
      {
        id: 'test-user-123',
        display_name: 'Alex',
        is_profile_complete: true,
        diagnosis_type: 'Primary Focal Hyperhidrosis',
        primary_area: 'palms',
        secondary_areas: ['feet_soles'],
        hdss_score: 3
      }
    ];
    await route.fulfill({ json });
  });

  await page.route('**/auth/v1/user*', async route => {
    await route.fulfill({
      json: {
        id: 'test-user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Alex' }
      }
    });
  });

  await page.goto('http://localhost:4173/insights');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'verification/insights_390px_authenticated.png', fullPage: true });
  await browser.close();
  console.log('Captured authenticated screenshot!');
})();
