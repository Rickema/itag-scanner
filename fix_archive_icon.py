import re

with open('app/src/main/res/layout/activity_device_manager.xml', 'r') as f:
    content = f.read()

old_xml = """                            <TextView
                                android:layout_width="0dp"
                                android:layout_height="wrap_content"
                                android:layout_weight="1"
                                android:text="🗄️ Archivio Target Memorizzati"
                                android:textStyle="bold"
                                android:textSize="16sp"
                                android:textColor="#111827" />"""

new_xml = """                            <LinearLayout
                                android:layout_width="0dp"
                                android:layout_height="wrap_content"
                                android:layout_weight="1"
                                android:orientation="horizontal"
                                android:gravity="center_vertical">
                                <ImageView
                                    android:layout_width="20dp"
                                    android:layout_height="20dp"
                                    android:src="@drawable/ic_archive"
                                    app:tint="#3F51B5"
                                    android:layout_marginEnd="6dp" />
                                <TextView
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:text="Archivio Target Memorizzati"
                                    android:textStyle="bold"
                                    android:textSize="16sp"
                                    android:textColor="#111827" />
                            </LinearLayout>"""

content = content.replace(old_xml, new_xml)

with open('app/src/main/res/layout/activity_device_manager.xml', 'w') as f:
    f.write(content)
