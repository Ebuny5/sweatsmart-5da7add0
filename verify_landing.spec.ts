import { test, expect } from '@playwright/test';

test('landing page renders without crashing', async ({ page }) => {
  // Increase timeout for slow dev server
  test.setTimeout(60000);

  const port = process.env.PORT || 8080;
  await page.goto(`http://localhost:${port}`);

  // Wait for the landing page title
  await expect(page.locator('h1')).toContainText('Take control of your hyper-hidrosis');

  console.log('✅ Landing page content verified');

  // Check if ErrorBoundary is NOT visible
  const errorBoundary = page.locator('text=Something went wrong');
  const isErrorVisible = await errorBoundary.isVisible();
  if (isErrorVisible) {
    throw new Error('ErrorBoundary is visible! App crashed.');
  }

  console.log('✅ No ErrorBoundary detected');
});
