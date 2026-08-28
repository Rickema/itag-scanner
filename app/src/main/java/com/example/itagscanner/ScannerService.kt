package com.example.itagscanner

import android.app.Service
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Handler
import android.os.IBinder
import android.os.Looper

/**
 * Servizio in background per il monitoraggio ciclico del dispositivo target.
 * SEPARAZIONE SCANSIONI:
 * Se il target è BLE -> attiva ESCLUSIVAMENTE la scansione BLE (BluetoothLeScanner).
 * Se il target è Classic -> attiva ESCLUSIVAMENTE la scansione BR/EDR (startDiscovery).
 * Supporta durata di scansione e intervallo di pausa personalizzabili dall'utente.
 */
class ScannerService : Service() {

    companion object {
        const val ACTION_NEAR = "com.example.itagscanner.ACTION_NEAR"
        const val ACTION_FAR = "com.example.itagscanner.ACTION_FAR"
        const val PREFS_NAME = "itag_prefs"
        const val RSSI_THRESHOLD = -75
        const val NEAR_DEBOUNCE_MS = 5000L
        const val FAR_DEBOUNCE_MS = 15000L
    }

    private var targetMac: String? = null
    private var targetName: String? = null
    private var targetTechnology: String = "BLE" // "BLE" oppure "CLASSIC"

    private var scanDurationSec: Int = 5 // durata scansione attiva (sec)
    private var scanIntervalSec: Int = 20 // pausa tra scansioni (sec)

    private var isNear = false
    private var lastSeenTimestamp: Long = 0L

    private val handler = Handler(Looper.getMainLooper())
    private var bluetoothAdapter: BluetoothAdapter? = null

    private val bleScanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result?.device?.let { device ->
                if (device.address.equals(targetMac, ignoreCase = true)) {
                    onTargetPacketReceived(result.rssi)
                }
            }
        }
    }

    private val classicReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (android.bluetooth.BluetoothDevice.ACTION_FOUND == intent?.action) {
                val device = intent.getParcelableExtra<android.bluetooth.BluetoothDevice>(android.bluetooth.BluetoothDevice.EXTRA_DEVICE)
                val rssi = intent.getShortExtra(android.bluetooth.BluetoothDevice.EXTRA_RSSI, Short.MIN_VALUE).toInt()
                if (device?.address.equals(targetMac, ignoreCase = true)) {
                    onTargetPacketReceived(rssi)
                }
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        val btManager = getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = btManager?.adapter
        loadSettings()
        registerReceiver(classicReceiver, IntentFilter(android.bluetooth.BluetoothDevice.ACTION_FOUND))
        startCyclicTracking()
    }

    private fun loadSettings() {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        targetMac = prefs.getString("target_mac", null)
        targetName = prefs.getString("target_name", null)
        targetTechnology = prefs.getString("target_technology", "BLE") ?: "BLE"
        scanDurationSec = prefs.getInt("scan_duration_sec", 5)
        scanIntervalSec = prefs.getInt("scan_interval_sec", 20)
    }

    private fun startCyclicTracking() {
        handler.post(object : Runnable {
            override fun run() {
                loadSettings()
                startTargetSpecificScan()

                // Ferma la scansione attiva dopo scanDurationSec secondi
                handler.postDelayed({
                    stopTargetSpecificScan()
                    checkAbsence()

                    // Riprogramma il prossimo ciclo dopo scanIntervalSec secondi
                    handler.postDelayed(this, scanIntervalSec * 1000L)
                }, scanDurationSec * 1000L)
            }
        })
    }

    private fun startTargetSpecificScan() {
        if (targetMac.isNullOrEmpty()) return
        if (targetTechnology.equals("BLE", ignoreCase = true)) {
            // SOLO Scansione BLE
            try {
                bluetoothAdapter?.bluetoothLeScanner?.startScan(bleScanCallback)
            } catch (e: SecurityException) {
                // permessi
            }
        } else {
            // SOLO Scansione Classica
            try {
                bluetoothAdapter?.startDiscovery()
            } catch (e: SecurityException) {
                // permessi
            }
        }
    }

    private fun stopTargetSpecificScan() {
        try {
            if (targetTechnology.equals("BLE", ignoreCase = true)) {
                bluetoothAdapter?.bluetoothLeScanner?.stopScan(bleScanCallback)
            } else {
                bluetoothAdapter?.cancelDiscovery()
            }
        } catch (e: SecurityException) {
            // permessi
        }
    }

    private fun onTargetPacketReceived(rssi: Int) {
        lastSeenTimestamp = System.currentTimeMillis()
        if (rssi >= RSSI_THRESHOLD && !isNear) {
            isNear = true
            broadcastIntent(ACTION_NEAR, rssi)
        }
    }

    private fun checkAbsence() {
        if (isNear && (System.currentTimeMillis() - lastSeenTimestamp) >= FAR_DEBOUNCE_MS) {
            isNear = false
            broadcastIntent(ACTION_FAR, -99)
        }
    }

    private fun broadcastIntent(action: String, rssi: Int) {
        val intent = Intent(action).apply {
            putExtra("extra_mac", targetMac)
            putExtra("extra_name", targetName)
            putExtra("extra_rssi", rssi)
            putExtra("extra_technology", targetTechnology)
            putExtra("extra_timestamp", System.currentTimeMillis())
        }
        sendBroadcast(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopTargetSpecificScan()
        try {
            unregisterReceiver(classicReceiver)
        } catch (e: Exception) {
            // gia de-registrato
        }
        handler.removeCallbacksAndMessages(null)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
