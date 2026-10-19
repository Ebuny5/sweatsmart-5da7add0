from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 390, "height": 844})
        page.goto("http://localhost:8080/log-episode")
        page.wait_for_timeout(2000)
        page.screenshot(path="/home/jules/verification/screenshots/log_episode_390px.png", full_page=True)
        browser.close()

run()
