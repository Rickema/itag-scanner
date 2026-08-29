with open('app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt', 'r') as f:
    content = f.read()

# Replace setBackgroundColor with setBackgroundTintList
content = content.replace('actionButton.setBackgroundColor(android.graphics.Color.parseColor("#FEF3C7"))', 'actionButton.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#FEF3C7"))')
content = content.replace('actionButton.setBackgroundColor(android.graphics.Color.parseColor("#4F46E5"))', 'actionButton.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#4F46E5"))')

with open('app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt', 'w') as f:
    f.write(content)
