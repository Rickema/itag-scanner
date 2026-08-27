package com.example.itagscanner

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.CheckBox
import android.widget.ListView
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var startButton: Button
    private lateinit var stopButton: Button
    private lateinit var manageButton: Button
    private lateinit var includeClassicCheckBox: CheckBox
    private lateinit var rssiSeekBar: SeekBar
    private lateinit var rssiValueText: TextView
    private lateinit var deviceListView: ListView

    private lateinit var bluetoothAdapter: BluetoothAdapter
    private var scanner: BluetoothLeScanner? = null
    private var scanning = false

    private val handler = Handler(Looper.getMainLooper())
    private val deviceList = mutableListOf<DeviceItem>()
    private lateinit var adapter: DeviceAdapter

    private var minRssi = -75
    private var includeClassic = false
    private var classicReceiverRegistered = false

    // Receiver per il discovery classico
    private val classicReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == BluetoothDevice.ACTION_FOUND) {
                val device = intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
                val rssi = intent.getShortExtra(BluetoothDevice.EXTRA_RSSI, Short.MIN_VALUE).toInt()
                if (device != null && rssi >= minRssi) {
                    addClassicDevice(device, rssi)
                }
            }
        }
    }

    private val scanCallback = object : ScanCallback() {
        @SuppressLint("MissingPermission")
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            if (result.rssi < minRssi) return

            val device = result.device
            val name = device.name ?: "N/D"
            val address = device.address ?: "N/D"
            val rssi = result.rssi
            val uuids = result.scanRecord?.serviceUuids?.joinToString(", ") { it.uuid.toString() } ?: "N/D"
            val manufacturer = getManufacturerString(result)

            val item = DeviceItem(
                name = name,
                address = address,
                rssi = rssi,
                type = "BLE",
                uuids = uuids,
                manufacturer = manufacturer,
                scanResult = result
            )

            // Aggiungi solo se non presente (per MAC)
            if (deviceList.none { it.address == address }) {
                deviceList.add(item)
                handler.post { adapter.notifyDataSetChanged() }
            }
        }

        override fun onScanFailed(errorCode: Int) {
            handler.post {
                Toast.makeText(this@MainActivity, "Scansione BLE fallita: $errorCode", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        startButton = findViewById(R.id.startButton)
        stopButton = findViewById(R.id.stopButton)
        manageButton = findViewById(R.id.manageButton)
        includeClassicCheckBox = findViewById(R.id.includeClassicCheckBox)
        rssiSeekBar = findViewById(R.id.rssiSeekBar)
        rssiValueText = findViewById(R.id.rssiValueText)
        deviceListView = findViewById(R.id.deviceListView)

        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        scanner = bluetoothAdapter.bluetoothLeScanner

        adapter = DeviceAdapter(this, deviceList) { selected ->
            onDeviceSelected(selected)
        }
        deviceListView.adapter = adapter

        // Configura SeekBar
        rssiSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                minRssi = -100 + progress
                rssiValueText.text = "$minRssi dBm"
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })
        rssiValueText.text = "$minRssi dBm"

        includeClassicCheckBox.setOnCheckedChangeListener { _, isChecked ->
            includeClassic = isChecked
        }

        startButton.setOnClickListener {
            if (checkPermissions()) {
                startScanning()
            }
        }

        stopButton.setOnClickListener {
            stopScanning()
        }

        manageButton.setOnClickListener {
            startActivity(Intent(this, DeviceManagerActivity::class.java))
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

        if (includeClassic) {
            val filter = IntentFilter(BluetoothDevice.ACTION_FOUND)
            registerReceiver(classicReceiver, filter)
            classicReceiverRegistered = true
            bluetoothAdapter.startDiscovery()
        }
    }

    @SuppressLint("MissingPermission")
    private fun stopScanning() {
        if (scanning) {
            scanner?.stopScan(scanCallback)
            scanning = false
        }
        if (includeClassic && classicReceiverRegistered) {
            bluetoothAdapter.cancelDiscovery()
            unregisterReceiver(classicReceiver)
            classicReceiverRegistered = false
        }
        updateStatus(false)
    }

    private fun addClassicDevice(device: BluetoothDevice, rssi: Int) {
        if (deviceList.any { it.address == device.address }) return
        val name = device.name ?: "N/D"
        val item = DeviceItem(
            name = name,
            address = device.address,
            rssi = rssi,
            type = "Classic",
            uuids = "N/D",
            manufacturer = "N/D",
            bluetoothDevice = device
        )
        deviceList.add(item)
        handler.post { adapter.notifyDataSetChanged() }
    }

    private fun updateStatus(running: Boolean) {
        statusText.text = if (running) "Scansione attiva" else "Scansione ferma"
    }

    private fun getManufacturerString(result: ScanResult): String {
        val data = result.scanRecord?.manufacturerSpecificData
        if (data == null || data.size() == 0) return "N/D"
        val sb = StringBuilder()
        for (i in 0 until data.size()) {
            val companyId = data.keyAt(i)
            val companyName = when (companyId) {
                0x004C -> "Apple"
                0x0075 -> "Samsung"
                0x0006 -> "Microsoft"
                0x000D -> "Texas Instruments"
                0x000F -> "Broadcom"
                0x001D -> "Google"
                0x0059 -> "Nordic Semiconductor"
                0x0131 -> "Tile"
                0x0157 -> "Amazon"
                else -> "0x${companyId.toString(16).uppercase()}"
            }
            sb.append("$companyName ($companyId)")
            if (i < data.size() - 1) sb.append("; ")
        }
        return sb.toString()
    }

    private fun onDeviceSelected(item: DeviceItem) {
        stopScanning()

        val prefs = getSharedPreferences("itag_prefs", MODE_PRIVATE)
        prefs.edit().apply {
            putString("target_mac", item.address)
            putString("target_name", item.name)
            putString("target_uuid", item.uuids)
            putBoolean("target_set", true)
        }.apply()

        Toast.makeText(this, "Selezionato: ${item.name} (${item.address})", Toast.LENGTH_LONG).show()

        val intent = Intent(this, ScannerService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        statusText.text = "Tracking di ${item.name} attivo"
    }

    override fun onDestroy() {
        stopScanning()
        super.onDestroy()
    }
}