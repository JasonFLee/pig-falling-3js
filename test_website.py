import pyautogui
import time
import subprocess

# Open fresh browser
subprocess.run(['open', 'http://localhost:5173/'])

# Wait for intro screen
time.sleep(1)
screenshot1 = pyautogui.screenshot()
screenshot1.save('/tmp/step1_intro.png')
print("Step 1: Intro screen captured")

# Wait for intro to fade and see pig with click indicator
time.sleep(2.5)
screenshot2 = pyautogui.screenshot()
screenshot2.save('/tmp/step2_click_indicator.png')
print("Step 2: Click indicator visible")

# Click to start descent
pyautogui.click(960, 540)
time.sleep(0.5)

# See overlays appear
screenshot3 = pyautogui.screenshot()
screenshot3.save('/tmp/step3_overlays_visible.png')
print("Step 3: Info and button overlays should be visible")

# Wait a bit more to see descent
time.sleep(2)
screenshot4 = pyautogui.screenshot()
screenshot4.save('/tmp/step4_during_descent.png')
print("Step 4: During descent with overlays")

print("\n✅ All screenshots saved!")
print("Check if:")
print("- Intro shows 'Jason Lee - Welcome to my website :)'")
print("- Click indicator points to pig")
print("- Info overlay (left) shows career/education")
print("- Button overlay (right) shows 3 clickable buttons")
print("- Everything is clearly visible")
