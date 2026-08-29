import re

with open('app/src/main/res/layout/activity_device_manager.xml', 'r') as f:
    content = f.read()

old = 'android:text="ⓘ Scansione mirata con antenna dedicata:"'
new = 'android:text="Scansione mirata con antenna dedicata:"\n                                app:drawableStartCompat="@drawable/ic_info"\n                                app:drawableTint="#1E3A8A"\n                                android:drawablePadding="6dp"'

content = content.replace(old, new)
content = re.sub(r'<TextView\s+android:id="@+id/tvTargetInfoTitle".*?/>', lambda m: m.group(0).replace('<TextView', '<com.google.android.material.textview.MaterialTextView'), content, flags=re.DOTALL)


with open('app/src/main/res/layout/activity_device_manager.xml', 'w') as f:
    f.write(content)
