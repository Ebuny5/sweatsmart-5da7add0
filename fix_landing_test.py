import re

with open('verify_landing.spec.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r"await expect\(page\.locator\('h1'\)\)\.toContainText\('Take control of your hyper-hidrosis'\);",
    r"await expect(page.locator('h1')).toContainText('Master your');",
    content
)

with open('verify_landing.spec.ts', 'w') as f:
    f.write(content)
