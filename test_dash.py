from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})

        # Set dummy local storage / auth if needed
        page.goto("http://localhost:8080/analytics")
        page.wait_for_timeout(3000)

        page.screenshot(path="/home/jules/verification/screenshots/calendar_dash.png", full_page=True)
        browser.close()

run()
