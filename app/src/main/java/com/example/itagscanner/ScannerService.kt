package com.example.itagscanner

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.ParcelUuid
import androidx.core.app.NotificationCompat
import java.util.UUID

class ScannerService : Service() {

    private lateinit var bluetoothAdapter: BluetoothAdapter
    private var scanner: BluetoothLeScanner? = null
    private var scanning = false
    private val handler = Handler(Looper.getMainLooper())

    // Stato attuale
    private var isNear = false
    private var lastSeenTimestamp = 0L
    private var nearCheckRunnable: Runnable? = null
    private var farCheckRunnable: Runnable? = null

    // Dati target (dal prefs)
    private var targetMac: String? = null
    private var targetName: String? = null
    private var targetUuid: String? = null

    override fun onCreate() {
        super.onCreate()
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        scanner = bluetoothAdapter.bluetoothLeScanner

        // Leggi i dati dal prefs
        val prefs = getSharedPreferences("itag_prefs", MODE_PRIVATE)
        targetMac = prefs.getString("target_mac", null)
        targetName = prefs.getString("target_name", null)
        targetUuid = prefs.getString("target_uuid", null)

        startForeground(1, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startScanning()
        return START_STICKY
    }

    override fun onDestroy() {
        stopScanning()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotification(): Notification {
        val channelId = "itag_scanner"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "iTAG Scanner",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("iTAG Scanner")
            .setContentText("Tracking attivo")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun startScanning() {
        if (scanning) return
        scanning = true

        // Crea un filtro (opzionale). Per semplicità, scansioniamo tutti e filtriamo manualmente.
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_BALANCED)
            .build()

        scanner?.startScan(null, settings, scanCallback)
    }

    private fun stopScanning() {
        if (scanning) {
            scanner?.stopScan(scanCallback)
            scanning = false
        }
        handler.removeCallbacksAndMessages(null)
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device
            val name = device.name ?: ""
            val address = device.address
            val services = result.scanRecord?.serviceUuids?.map { it.uuid.toString() }

            // Controlla se il dispositivo corrisponde al target
            val matchesMac = !targetMac.isNullOrEmpty() && address == targetMac
            val matchesName = !targetName.isNullOrEmpty() && name.equals(targetName, true)
            val matchesUuid = !targetUuid.isNullOrEmpty() && services?.any { uuid ->
                uuid.equals(targetUuid, true) || targetUuid!!.split(",").any { it == uuid }
            } ?: false

            if (matchesMac || matchesName || matchesUuid) {
                lastSeenTimestamp = System.currentTimeMillis()

                // Invia aggiornamento all'Activity (se aperta)
                val updateIntent = Intent("com.example.itagscanner.SCAN_UPDATE").apply {
                    putExtra("name", name.ifEmpty { "Sconosciuto" })
                    putExtra("address", address)
                    putExtra("rssi", result.rssi)
                    putExtra("isNear", isNear)
                    putExtra("timestamp", lastSeenTimestamp)
                }
                sendBroadcast(updateIntent)

                checkProximity(result.rssi)
            }
        }

        override fun onScanFailed(errorCode: Int) {
            // Non gestito
        }
    }

    private fun checkProximity(rssi: Int) {
        val nearCondition = rssi >= Constants.RSSI_THRESHOLD

        if (nearCondition && !isNear) {
            if (nearCheckRunnable == null) {
                nearCheckRunnable = Runnable {
                    if (System.currentTimeMillis() - lastSeenTimestamp <= Constants.NEAR_DEBOUNCE_MS &&
                        lastSeenTimestamp > 0 &&
                        isNear.not()
                    ) {
                        isNear = true
                        sendBroadcast(Constants.ACTION_NEAR)
                    }
                    nearCheckRunnable = null
                }
                handler.postDelayed(nearCheckRunnable!!, Constants.NEAR_DEBOUNCE_MS)
            }
        } else if (!nearCondition && isNear) {
            if (farCheckRunnable == null) {
                farCheckRunnable = Runnable {
                    if (System.currentTimeMillis() - lastSeenTimestamp >= Constants.FAR_DEBOUNCE_MS) {
                        isNear = false
                        sendBroadcast(Constants.ACTION_FAR)
                    }
                    farCheckRunnable = null
                }
                handler.postDelayed(farCheckRunnable!!, Constants.FAR_DEBOUNCE_MS)
            }
        }
    }

    private fun sendBroadcast(action: String) {
        val intent = Intent(action)
        intent.setPackage(packageName)
        sendBroadcast(intent)
    }
}