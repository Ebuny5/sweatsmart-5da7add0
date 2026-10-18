const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  const mockEpisodes = [
    {
      id: 'ep-1',
      user_id: 'test-user',
      created_at: '2026-07-28T10:00:00Z',
      date: '2026-07-28',
      time: '10:00',
      severity: 3,
      severityLevel: 3,
      body_areas: ['face', 'palms', 'feet'],
      bodyAreas: ['face', 'palms', 'feet'],
      triggers: [{ id: 'heat', label: 'Heat / Temperature' }],
      is_dry_day: false,
      notes: 'Out in the afternoon sun'
    },
    {
      id: 'ep-2',
      user_id: 'test-user',
      created_at: '2026-07-29T14:30:00Z',
      date: '2026-07-29',
      time: '14:30',
      severity: 4,
      severityLevel: 4,
      body_areas: ['palms', 'feet'],
      bodyAreas: ['palms', 'feet'],
      triggers: [{ id: 'stress', label: 'Stress / Anxiety' }],
      is_dry_day: false,
      notes: 'Work meeting presentation'
    }
  ];

  const mockProfile = {
    id: 'test-user',
    display_name: 'Alex Warrior',
    diagnosis_type: 'Primary Focal',
    biological_sex: 'Female',
    age: 28,
    is_profile_complete: true
  };

  const authSession = {
    access_token: 'fake-jwt-token',
    token_type: 'bearer',
    expires_in: 36000,
    refresh_token: 'fake-refresh-token',
    user: {
      id: 'test-user',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'alex@example.com',
      app_metadata: { provider: 'email' },
      user_metadata: { display_name: 'Alex Warrior' },
      created_at: '2026-01-01T00:00:00Z'
    }
  };

  await page.route('**/rest/v1/episodes*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockEpisodes) }));
  await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockProfile]) }));
  await page.route('**/auth/v1/user*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authSession.user) }));

  await page.addInitScript(({ authSession, mockProfile }) => {
    window.localStorage.setItem('sb-ujbcolxawpzfjkjviwqw-auth-token', JSON.stringify(authSession));
    window.localStorage.setItem('sb-legjisflxarazydqnztr-auth-token', JSON.stringify(authSession));
    window.localStorage.setItem('onboarded_test-user', '1');
    window.localStorage.setItem('permissions_test-user', '1');
  }, { authSession, mockProfile });

  console.log('Navigating to Insights page...');
  await page.goto('http://localhost:5173/insights', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Scroll to "Affected areas"
  const affectedHeading = page.locator('text=Affected areas').first();
  if (await affectedHeading.isVisible()) {
    await affectedHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  // Screenshot of Affected areas section
  await page.screenshot({ path: path.join(__dirname, 'insights_affected_areas_grid_390px.png') });

  // Click on the first area card to open care box/sheet
  const shapeButton = page.locator('button:has-text("Tap for care tips")').first();
  if (await shapeButton.isVisible()) {
    await shapeButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(__dirname, 'insights_area_care_box_open_390px.png') });
  }

  console.log('New area screenshots captured successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
