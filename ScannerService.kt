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

    override fun onCreate() {
        super.onCreate()
        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        scanner = bluetoothAdapter.bluetoothLeScanner

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
            .setContentText("Scansione BLE attiva")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun startScanning() {
        if (scanning) return
        scanning = true

        val filters = listOf(
            ScanFilter.Builder()
                .setServiceUuid(ParcelUuid(UUID.fromString(Constants.SERVICE_UUID_FFE0)))
                .build()
        )

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_BALANCED)
            .build()

        scanner?.startScan(filters, settings, scanCallback)
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
            val name = device.name
            val rssi = result.rssi
            val services = result.scanRecord?.serviceUuids

            // Verifica: UUID presente e/o nome corrispondente
            val uuidMatch = services?.any { it.uuid.toString().equals(Constants.SERVICE_UUID_FFE0, true) } ?: false
            val nameMatch = name?.equals(Constants.DEVICE_NAME, true) ?: false

            if (uuidMatch || nameMatch) {
                // Aggiorna timestamp
                lastSeenTimestamp = System.currentTimeMillis()
                checkProximity(rssi)
            }
        }

        override fun onScanFailed(errorCode: Int) {
            // Puoi loggare o gestire errori
        }
    }

    private fun checkProximity(rssi: Int) {
        val nearCondition = rssi >= Constants.RSSI_THRESHOLD

        if (nearCondition && !isNear) {
            // Pianifica l'invio di NEAR dopo il debounce
            if (nearCheckRunnable == null) {
                nearCheckRunnable = Runnable {
                    // Controlla se è ancora presente e vicino
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
            // Se si allontana, pianifica FAR dopo il debounce
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
        intent.setPackage(packageName) // solo per la nostra app? Meglio non limitare
        sendBroadcast(intent)
    }
}
