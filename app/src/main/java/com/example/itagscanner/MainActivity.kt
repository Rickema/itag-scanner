package com.example.itagscanner

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.ListView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var startButton: Button
    private lateinit var stopButton: Button
    private lateinit var deviceListView: ListView

    private lateinit var bluetoothAdapter: BluetoothAdapter
    private var scanner: BluetoothLeScanner? = null
    private var scanning = false

    private val handler = Handler(Looper.getMainLooper())
    private val deviceList = mutableListOf<ScanResult>()
    private lateinit var adapter: DeviceAdapter

    // Callback per la scansione
    private val scanCallback = object : ScanCallback() {
        @SuppressLint("MissingPermission")
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            // Aggiungi o aggiorna il dispositivo nella lista
            val index = deviceList.indexOfFirst { it.device.address == result.device.address }
            if (index >= 0) {
                deviceList[index] = result
            } else {
                deviceList.add(result)
            }
            // Ordina per RSSI decrescente (più forte prima)
            deviceList.sortByDescending { it.rssi }
            // Aggiorna la UI sul main thread
            handler.post {
                adapter.notifyDataSetChanged()
            }
        }

        override fun onScanFailed(errorCode: Int) {
            handler.post {
                Toast.makeText(this@MainActivity, "Scansione fallita: $errorCode", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        startButton = findViewById(R.id.startButton)
        stopButton = findViewById(R.id.stopButton)
        deviceListView = findViewById(R.id.deviceListView)

        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        scanner = bluetoothAdapter.bluetoothLeScanner

        adapter = DeviceAdapter(this, deviceList) { selected ->
            // Quando l'utente preme "Seleziona"
            onDeviceSelected(selected)
        }
        deviceListView.adapter = adapter

        startButton.setOnClickListener {
            if (checkPermissions()) {
                startScanning()
            }
        }

        stopButton.setOnClickListener {
            stopScanning()
        }

        updateStatus(false)
    }

    private fun checkPermissions(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val permissions = mutableListOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            )
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(this, permissions.toTypedArray(), 100)
                return false
            }
        } else {
            val permission = Manifest.permission.ACCESS_FINE_LOCATION
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(permission), 100)
                return false
            }
        }
        return true
    }

    @SuppressLint("MissingPermission")
    private fun startScanning() {
        if (scanning) return
        scanning = true
        deviceList.clear()
        adapter.notifyDataSetChanged()
        updateStatus(true)

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        scanner?.startScan(null, settings, scanCallback)
    }

    @SuppressLint("MissingPermission")
    private fun stopScanning() {
        if (scanning) {
            scanner?.stopScan(scanCallback)
            scanning = false
        }
        updateStatus(false)
    }

    private fun updateStatus(running: Boolean) {
        statusText.text = if (running) "Scansione BLE attiva" else "Scansione ferma"
    }

    private fun onDeviceSelected(result: ScanResult) {
        // Ferma la scansione di discovery
        stopScanning()

        val device = result.device
        val name = device.name ?: "Sconosciuto"
        val address = device.address
        val services = result.scanRecord?.serviceUuids?.map { it.uuid.toString() }

        // Salva i dati in SharedPreferences per il servizio
        val prefs = getSharedPreferences("itag_prefs", MODE_PRIVATE)
        prefs.edit().apply {
            putString("target_mac", address)
            putString("target_name", name)
            putString("target_uuid", services?.joinToString(",") ?: "")
            putBoolean("target_set", true)
        }.apply()

        Toast.makeText(this, "Selezionato: $name ($address)", Toast.LENGTH_LONG).show()

        // Avvia il servizio di tracking in background
        val intent = Intent(this, ScannerService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        statusText.text = "Tracking di $name attivo"
    }

    override fun onDestroy() {
        stopScanning()
        super.onDestroy()
    }
}