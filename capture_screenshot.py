#!/usr/bin/env python3
"""
Screenshot capture script for Three.js portfolio website.
Captures the running web application after the intro screen fades.
"""

import time
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
    playwright_available = True
except ImportError:
    playwright_available = False
    print("Playwright not available, will try selenium...")

def capture_with_playwright():
    """Capture screenshot using Playwright."""
    print("Using Playwright for screenshot capture...")

    with sync_playwright() as p:
        # Launch browser in headed mode so we can see what's happening
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080}
        )
        page = context.new_page()

        print("Opening http://localhost:5173/...")
        page.goto('http://localhost:5173/', wait_until='networkidle')

        print("Waiting for intro screen to fade (3 seconds)...")
        time.sleep(3)

        print("Waiting for scene to render and particles to appear (3 more seconds)...")
        time.sleep(3)

        # Generate timestamp for filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        screenshot_path = f'/Users/jasonlee/codingProjects/new3js/screenshots/scene_{timestamp}.png'

        print(f"Capturing screenshot to {screenshot_path}...")
        page.screenshot(path=screenshot_path, full_page=False)

        print("Screenshot captured successfully!")
        browser.close()

        return screenshot_path

def capture_with_selenium():
    """Capture screenshot using Selenium as fallback."""
    print("Using Selenium for screenshot capture...")

    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service

    # Set up Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--window-size=1920,1080')
    # Uncomment the next line if you want headless mode
    # chrome_options.add_argument('--headless')

    driver = webdriver.Chrome(options=chrome_options)

    try:
        print("Opening http://localhost:5173/...")
        driver.get('http://localhost:5173/')

        print("Waiting for intro screen to fade (3 seconds)...")
        time.sleep(3)

        print("Waiting for scene to render and particles to appear (3 more seconds)...")
        time.sleep(3)

        # Generate timestamp for filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        screenshot_path = f'/Users/jasonlee/codingProjects/new3js/screenshots/scene_{timestamp}.png'

        print(f"Capturing screenshot to {screenshot_path}...")
        driver.save_screenshot(screenshot_path)

        print("Screenshot captured successfully!")
        return screenshot_path

    finally:
        driver.quit()

def main():
    """Main function to capture screenshot."""
    print("=" * 60)
    print("Three.js Portfolio Website Screenshot Capture")
    print("=" * 60)

    # Check if screenshots directory exists
    screenshots_dir = Path('/Users/jasonlee/codingProjects/new3js/screenshots')
    if not screenshots_dir.exists():
        print(f"Creating screenshots directory: {screenshots_dir}")
        screenshots_dir.mkdir(parents=True, exist_ok=True)

    # Try Playwright first, fall back to Selenium
    screenshot_path = None

    if playwright_available:
        try:
            screenshot_path = capture_with_playwright()
        except Exception as e:
            print(f"Playwright failed: {e}")
            print("Falling back to Selenium...")
            try:
                screenshot_path = capture_with_selenium()
            except Exception as e2:
                print(f"Selenium also failed: {e2}")
    else:
        try:
            screenshot_path = capture_with_selenium()
        except Exception as e:
            print(f"Selenium failed: {e}")

    if screenshot_path:
        print("\n" + "=" * 60)
        print("SUCCESS!")
        print("=" * 60)
        print(f"Screenshot saved to: {screenshot_path}")
        print("\nWhat to check in the screenshot:")
        print("- Is the pig visible with balloons?")
        print("- Are there atmospheric particles floating around?")
        print("- Are the UI overlays visible on the sides?")
        print("- Is the scene rendering properly (not black)?")
        return screenshot_path
    else:
        print("\nERROR: Failed to capture screenshot")
        print("Please ensure:")
        print("1. The web server is running at http://localhost:5173/")
        print("2. Playwright or Selenium is installed")
        print("3. Chrome/Chromium browser is available")
        return None

if __name__ == '__main__':
    result = main()
    if result:
        exit(0)
    else:
        exit(1)
