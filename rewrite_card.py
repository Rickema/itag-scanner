import re

with open('app/src/main/res/layout/activity_device_manager.xml', 'r') as f:
    content = f.read()

# Extract from tabDeviceContent to the end of the first MaterialCardView
pattern = r'(<LinearLayout\s+android:id="@+id/tabDeviceContent".*?orientation="vertical">).*?(<com\.google\.android\.material\.card\.MaterialCardView.*?<!-- Archivio Target Memorizzati)'

replacement = r'''\1
                <com.google.android.material.card.MaterialCardView
                    android:id="@+id/activeTargetCard"
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
                        android:orientation="vertical"
                        android:padding="20dp">
                        
                        <!-- Header with name and Rinomina button -->
                        <LinearLayout
                            android:layout_width="match_parent"
                            android:layout_height="wrap_content"
                            android:orientation="horizontal"
                            android:gravity="center_vertical"
                            android:layout_marginBottom="12dp">
                            <TextView
                                android:id="@+id/tvTargetNameLarge"
                                android:layout_width="0dp"
                                android:layout_weight="1"
                                android:layout_height="wrap_content"
                                android:text="Nessun target"
                                android:textSize="20sp"
                                android:textStyle="bold"
                                android:textColor="#111827" />
                            <TextView
                                android:id="@+id/btnRenameTarget"
                                android:layout_width="wrap_content"
                                android:layout_height="wrap_content"
                                android:layout_marginStart="12dp"
                                android:text="Rinomina"
                                android:textSize="13sp"
                                android:textStyle="bold"
                                android:textColor="#4338CA"
                                android:background="@drawable/bg_badge_indigo_react"
                                android:paddingHorizontal="10dp"
                                android:paddingVertical="6dp" />
                        </LinearLayout>
                        
                        <!-- Technology Badge -->
                        <TextView
                            android:id="@+id/tvTargetTechBadge"
                            android:layout_width="wrap_content"
                            android:layout_height="wrap_content"
                            android:text="● Target Sconosciuto"
                            android:textSize="13sp"
                            android:textStyle="bold"
                            android:textColor="#2563EB"
                            android:layout_marginBottom="24dp" />

                        <!-- Details Card -->
                        <LinearLayout
                            android:layout_width="match_parent"
                            android:layout_height="wrap_content"
                            android:orientation="vertical"
                            android:background="@drawable/bg_box_white_border"
                            android:padding="16dp"
                            android:layout_marginBottom="16dp">
                            <LinearLayout
                                android:layout_width="match_parent"
                                android:layout_height="wrap_content"
                                android:orientation="horizontal"
                                android:layout_marginBottom="8dp">
                                <TextView
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:text="Indirizzo MAC:"
                                    android:textSize="13sp"
                                    android:textColor="#6B7280" />
                                <View android:layout_width="0dp" android:layout_height="0dp" android:layout_weight="1" />
                                <TextView
                                    android:id="@+id/tvTargetMacDetails"
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:text="--"
                                    android:textSize="13sp"
                                    android:fontFamily="monospace"
                                    android:textColor="#111827" />
                                <TextView
                                    android:id="@+id/btnCopyMac"
                                    android:layout_width="wrap_content"
                                    android:layout_height="wrap_content"
                                    android:layout_marginStart="8dp"
                                    android:text="Copia"
                                    android:textSize="12sp"
                                    android:textColor="#2563EB" />
                            </LinearLayout>
                            <TextView
                                android:layout_width="match_parent"
                                android:layout_height="wrap_content"
                                android:text="Servizi UUID:"
                                android:textSize="13sp"
                                android:textColor="#6B7280" />
                            <TextView
                                android:id="@+id/tvTargetUuids"
                                android:layout_width="match_parent"
                                android:layout_height="wrap_content"
                                android:text="--"
                                android:textSize="13sp"
                                android:fontFamily="monospace"
                                android:textColor="#4B5563"
                                android:layout_marginTop="4dp" />
                        </LinearLayout>
                        
                        <!-- Info Card -->
                        <LinearLayout
                            android:layout_width="match_parent"
                            android:layout_height="wrap_content"
                            android:orientation="vertical"
                            android:background="@drawable/bg_box_blue_border"
                            android:padding="16dp"
                            android:layout_marginBottom="16dp">
                            <TextView
                                android:id="@+id/tvTargetInfoTitle"
                                android:layout_width="match_parent"
                                android:layout_height="wrap_content"
                                android:text="Scansione mirata con antenna dedicata:"
                                app:drawableStartCompat="@drawable/ic_info"
                                app:drawableTint="#1E3A8A"
                                android:drawablePadding="6dp"
                                android:textSize="13sp"
                                android:textStyle="bold"
                                android:textColor="#1D4ED8"
                                android:layout_marginBottom="8dp" />
                            <TextView
                                android:id="@+id/tvTargetInfoDesc"
                                android:layout_width="match_parent"
                                android:layout_height="wrap_content"
                                android:text="Poiché il target è un dispositivo BLE, durante il monitoraggio viene attivata ESCLUSIVAMENTE la scansione Bluetooth Low Energy, azzerando le interferenze e il consumo del Bluetooth Classico."
                                android:textSize="13sp"
                                android:textColor="#1E3A8A" />
                        </LinearLayout>

                        <!-- Background State -->
                        <LinearLayout
                            android:layout_width="match_parent"
                            android:layout_height="wrap_content"
                            android:orientation="vertical"
                            android:background="@drawable/bg_box_white_border"
                            android:padding="16dp"
                            android:layout_marginBottom="24dp">
                            <TextView
                                android:layout_width="match_parent"
                                android:layout_height="wrap_content"
                                android:text="STATO CICLO IN BACKGROUND:"
                                android:textSize="12sp"
                                android:textAllCaps="true"
                                android:textColor="#6B7280"
                                android:layout_marginBottom="8dp" />
                            <TextView
                                android:id="@+id/tvTargetCycleState"
                                android:layout_width="match_parent"
                                android:layout_height="wrap_content"
                                android:text="● Attesa target"
                                android:textSize="14sp"
                                android:textStyle="bold"
                                android:textColor="#111827"
                                android:layout_marginBottom="4dp" />
                            <TextView
                                android:id="@+id/tvTargetLastPacket"
                                android:layout_width="match_parent"
                                android:layout_height="wrap_content"
                                android:text="Ultimo pacchetto: --"
                                android:textSize="13sp"
                                android:fontFamily="monospace"
                                android:textColor="#6B7280" />
                        </LinearLayout>
                        
                        <!-- Actions Row -->
                        <LinearLayout
                            android:id="@+id/targetActionsRow"
                            android:layout_width="match_parent"
                            android:layout_height="wrap_content"
                            android:orientation="horizontal"
                            android:visibility="gone">
                            <com.google.android.material.textview.MaterialTextView
                                android:id="@+id/btnToastDetails"
                                android:layout_width="0dp"
                                android:layout_height="wrap_content"
                                android:layout_weight="1"
                                android:text="Dettagli Toast"
                                app:drawableStartCompat="@drawable/ic_info"
                                app:drawableTint="#2563EB"
                                android:drawablePadding="6dp"
                                android:textSize="13sp"
                                android:textStyle="bold"
                                android:textColor="#2563EB"
                                android:gravity="center"
                                android:background="@drawable/bg_btn_outline_blue"
                                android:paddingVertical="12dp"
                                android:layout_marginEnd="8dp" />
                            <com.google.android.material.textview.MaterialTextView
                                android:id="@+id/btnRemoveTarget"
                                android:layout_width="0dp"
                                android:layout_height="wrap_content"
                                android:layout_weight="1"
                                android:text="Rimuovi Target"
                                app:drawableStartCompat="@drawable/ic_trash_small"
                                app:drawableTint="#DC2626"
                                android:drawablePadding="6dp"
                                android:textSize="13sp"
                                android:textStyle="bold"
                                android:textColor="#DC2626"
                                android:gravity="center"
                                android:background="@drawable/bg_btn_red_react"
                                android:paddingVertical="12dp"
                                android:layout_marginStart="8dp" />
                        </LinearLayout>
                    </LinearLayout>
                </com.google.android.material.card.MaterialCardView>

                \2'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('app/src/main/res/layout/activity_device_manager.xml', 'w') as f:
    f.write(content)
