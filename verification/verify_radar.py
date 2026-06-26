from playwright.sync_api import sync_playwright
import time

def run_verification(page):
    # Navigate to the dedicated verification page
    page.goto("http://localhost:8080/verify-radar")

    # Wait for the chart to render
    page.wait_for_selector(".recharts-responsive-container")
    time.sleep(2)  # Give extra time for animations

    # Take screenshot
    page.screenshot(path="/home/jules/verification/screenshots/radar_chart_verify.png")
    print("Screenshot saved to /home/jules/verification/screenshots/radar_chart_verify.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_verification(page)
        finally:
            context.close()
            browser.close()
