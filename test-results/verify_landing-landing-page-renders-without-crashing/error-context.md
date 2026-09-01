# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verify_landing.spec.ts >> landing page renders without crashing
- Location: verify_landing.spec.ts:3:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Take control of your hyper-hidrosis"
Received string:    "Master yourhyperhidrosis"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')
    13 × locator resolved to <h1 data-lov-name="h1" class="hero-title" data-component-name="h1" data-component-line="1421" data-component-file="Index.tsx" data-lov-id="src/pages/Index.tsx:1421:12" data-component-path="src/pages/Index.tsx" data-component-content="%7B%22className%22%3A%22hero-title%22%7D">…</h1>
       - unexpected value "Master yourhyperhidrosis"

```

```yaml
- heading "Master your hyperhidrosis" [level=1]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('landing page renders without crashing', async ({ page }) => {
  4  |   // Increase timeout for slow dev server
  5  |   test.setTimeout(60000);
  6  |
  7  |   const port = process.env.PORT || 8080;
  8  |   await page.goto(`http://localhost:${port}`);
  9  |
  10 |   // Wait for the landing page title
> 11 |   await expect(page.locator('h1')).toContainText('Take control of your hyper-hidrosis');
     |                                    ^ Error: expect(locator).toContainText(expected) failed
  12 |
  13 |   console.log('✅ Landing page content verified');
  14 |
  15 |   // Check if ErrorBoundary is NOT visible
  16 |   const errorBoundary = page.locator('text=Something went wrong');
  17 |   const isErrorVisible = await errorBoundary.isVisible();
  18 |   if (isErrorVisible) {
  19 |     throw new Error('ErrorBoundary is visible! App crashed.');
  20 |   }
  21 |
  22 |   console.log('✅ No ErrorBoundary detected');
  23 | });
  24 |
```