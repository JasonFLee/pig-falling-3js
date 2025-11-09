import pyautogui
import time
import subprocess

# Open the website
subprocess.run(['open', 'http://localhost:5173/'])

# Wait for page to load and intro to finish
time.sleep(3)

# Click to start descent
pyautogui.click(960, 540)

# Take screenshot immediately after clicking
time.sleep(0.5)
screenshot1 = pyautogui.screenshot()
screenshot1.save('/tmp/descent_0.5s.png')
print("Screenshot 1 saved: 0.5s after click")

# Take screenshot at 1.5 seconds
time.sleep(1)
screenshot2 = pyautogui.screenshot()
screenshot2.save('/tmp/descent_1.5s.png')
print("Screenshot 2 saved: 1.5s after click")

# Take screenshot at 3 seconds
time.sleep(1.5)
screenshot3 = pyautogui.screenshot()
screenshot3.save('/tmp/descent_3s.png')
print("Screenshot 3 saved: 3s after click")

# Take screenshot at 5 seconds
time.sleep(2)
screenshot4 = pyautogui.screenshot()
screenshot4.save('/tmp/descent_5s.png')
print("Screenshot 4 saved: 5s after click")

print("\nAll screenshots saved. Check them to see when floating texts appear.")
