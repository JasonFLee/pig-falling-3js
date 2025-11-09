import pyautogui
import time
import subprocess

# Open browser
subprocess.run(['open', 'http://localhost:5173/'])

# Wait for intro (2s) + intro fade (0.5s) + small buffer
print("Waiting for intro to complete...")
time.sleep(3)

# Screenshot 1: Initial view with click indicator
screenshot1 = pyautogui.screenshot()
screenshot1.save('/tmp/s1_initial.png')
print("✓ Screenshot 1: Initial with 👆 indicator")

# Click to start descent
print("Clicking to start...")
pyautogui.click(960, 540)
time.sleep(1)

# Screenshot 2: Early descent (should show Netflix ~15-30%)
screenshot2 = pyautogui.screenshot()
screenshot2.save('/tmp/s2_netflix.png')
print("✓ Screenshot 2: Early descent - Netflix should be visible")

# Wait more to see Amazon (35-50%)
time.sleep(2)
screenshot3 = pyautogui.screenshot()
screenshot3.save('/tmp/s3_amazon.png')
print("✓ Screenshot 3: Amazon should be visible")

# Wait more to see Dartmouth (55-70%)
time.sleep(2)
screenshot4 = pyautogui.screenshot()
screenshot4.save('/tmp/s4_dartmouth.png')
print("✓ Screenshot 4: Dartmouth should be visible")

# Wait more to see Mines (75-90%)
time.sleep(2)
screenshot5 = pyautogui.screenshot()
screenshot5.save('/tmp/s5_mines.png')
print("✓ Screenshot 5: Mines should be visible")

print("\n✅ All screenshots saved!")
print("\nCheck each screenshot:")
print("  s1_initial.png - Should show 👆 pointing up")
print("  s2_netflix.png - Netflix info on left, Projects button on right")
print("  s3_amazon.png - Amazon info on left, Projects button on right")
print("  s4_dartmouth.png - Dartmouth info on left, LinkedIn button on right")
print("  s5_mines.png - Mines info on left, Documentary button on right")
