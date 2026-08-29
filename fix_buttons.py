import re

with open('app/src/main/res/layout/activity_device_manager.xml', 'r') as f:
    content = f.read()

content = content.replace('text="ⓘ Dettagli Toast"', 'text="Dettagli Toast"\n                                app:drawableStartCompat="@drawable/ic_info"\n                                app:drawableTint="#2563EB"\n                                android:drawablePadding="6dp"')
content = content.replace('text="🗑 Rimuovi Target"', 'text="Rimuovi Target"\n                                app:drawableStartCompat="@drawable/ic_trash_small"\n                                app:drawableTint="#DC2626"\n                                android:drawablePadding="6dp"')
content = content.replace('<TextView\n                                android:id="@+id/btnToastDetails"', '<com.google.android.material.textview.MaterialTextView\n                                android:id="@+id/btnToastDetails"')
content = content.replace('android:layout_marginEnd="8dp" />', 'android:layout_marginEnd="8dp" />').replace('</TextView>', '</com.google.android.material.textview.MaterialTextView>')
content = content.replace('<TextView\n                                android:id="@+id/btnRemoveTarget"', '<com.google.android.material.textview.MaterialTextView\n                                android:id="@+id/btnRemoveTarget"')

# Need to ensure proper closing tags are replaced for the buttons, but wait they are self closing.
content = re.sub(r'<TextView\s+android:id="@+id/btnToastDetails".*?/>', lambda m: m.group(0).replace('<TextView', '<com.google.android.material.textview.MaterialTextView'), content, flags=re.DOTALL)
content = re.sub(r'<TextView\s+android:id="@+id/btnRemoveTarget".*?/>', lambda m: m.group(0).replace('<TextView', '<com.google.android.material.textview.MaterialTextView'), content, flags=re.DOTALL)


with open('app/src/main/res/layout/activity_device_manager.xml', 'w') as f:
    f.write(content)
