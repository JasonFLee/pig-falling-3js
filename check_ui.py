import pyautogui
import time
import subprocess

# Open browser
subprocess.run(['open', 'http://localhost:5173/'])

# Wait for intro to finish (2s intro + 0.5s fade)
time.sleep(3)

# Take screenshot right after intro
screenshot1 = pyautogui.screenshot()
screenshot1.save('/tmp/test_ui.png')
print("Screenshot saved: /tmp/test_ui.png")
print("\nCheck if you can see:")
print("- 👆 pointing up emoji in center")
print("- Left side: info boxes (should start fading in during descent)")
print("- Right side: blue buttons (should start fading in during descent)")
