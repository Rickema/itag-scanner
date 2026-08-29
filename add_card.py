import re

with open('app/src/main/res/layout/activity_device_manager.xml', 'r') as f:
    content = f.read()

card_xml = """
                <!-- Card 3: Modalità Risparmio -->
                <com.google.android.material.card.MaterialCardView
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:layout_marginBottom="24dp"
                    app:cardCornerRadius="16dp"
                    app:cardElevation="2dp"
                    app:strokeWidth="1dp"
                    app:strokeColor="#E5E7EB"
                    app:cardBackgroundColor="#FFFFFF">
                    <LinearLayout
                        android:layout_width="match_parent"
                        android:layout_height="wrap_content"
                        android:orientation="horizontal"
                        android:gravity="center_vertical"
                        android:padding="20dp">
                        
                        <LinearLayout
                            android:layout_width="0dp"
                            android:layout_height="wrap_content"
                            android:layout_weight="1"
                            android:orientation="vertical">
                            <TextView
                                android:layout_width="match_parent"
                                android:layout_height="wrap_content"
                                android:text="Modalità Risparmio"
                                android:textSize="16sp"
                                android:textStyle="bold"
                                android:textColor="#111827" />
                            <TextView
                                android:layout_width="match_parent"
                                android:layout_height="wrap_content"
                                android:text="Allunga automaticamente la pausa (+50%) quando il target è stabilmente fermo."
                                android:textSize="12sp"
                                android:textColor="#6B7280"
                                android:layout_marginTop="2dp" />
                        </LinearLayout>
                        
                        <com.google.android.material.switchmaterial.SwitchMaterial
                            android:id="@+id/switchEcoReact"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:layout_marginStart="16dp"
                            android:checked="true" />
                    </LinearLayout>
                </com.google.android.material.card.MaterialCardView>
"""

content = content.replace('<com.google.android.material.button.MaterialButton\n                    android:id="@+id/restartServiceButtonReact"', card_xml + '\n                <com.google.android.material.button.MaterialButton\n                    android:id="@+id/restartServiceButtonReact"')

with open('app/src/main/res/layout/activity_device_manager.xml', 'w') as f:
    f.write(content)
