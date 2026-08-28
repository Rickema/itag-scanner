package com.example.itagscanner

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothClass
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
import android.os.ParcelUuid
import android.widget.Button
import android.widget.CheckBox
import android.widget.ListView
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

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

    private lateinit var dbManager: DatabaseManager
    private lateinit var fingerprinter: BluetoothFingerprinter

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

            // Esegui il fingerprinting
            val classification = fingerprinter.classify(result)

            val uuids = result.scanRecord?.serviceUuids?.joinToString(", ") { uuidToName(it.uuid.toString()) } ?: "N/D"
            val manufacturer = getManufacturerString(result)
            val appearance = parseAppearance(result)
            val modelId = parseFastPairModelId(result)

            val item = DeviceItem(
                name = name,
                address = address,
                rssi = rssi,
                type = "BLE",
                category = classification.type,
                uuids = uuids,
                manufacturer = manufacturer,
                appearance = appearance,
                modelId = modelId,
                classificationType = classification.type,
                classificationBrand = classification.brand,
                classificationConfidence = classification.confidence,
                scanResult = result
            )

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

        dbManager = DatabaseManager(this)
        fingerprinter = BluetoothFingerprinter(dbManager)

        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter
        scanner = bluetoothAdapter.bluetoothLeScanner

        adapter = DeviceAdapter(this, deviceList) { selected ->
            onDeviceSelected(selected)
        }
        deviceListView.adapter = adapter

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
                lifecycleScope.launch {
                    val success = try {
                        dbManager.ensureDatabases()
                        true
                    } catch (e: Exception) {
                        false
                    }
                    if (success) {
                        val info = dbManager.getDatabaseInfo()
                        Toast.makeText(this@MainActivity, "Database caricati:\n$info", Toast.LENGTH_LONG).show()
                        startScanning()
                    } else {
                        Toast.makeText(this@MainActivity, "Errore download DB, uso cache", Toast.LENGTH_LONG).show()
                        startScanning()
                    }
                }
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
            .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
            .build()

        scanner?.startScan(null, settings, scanCallback)

        if (includeClassic) {
            val filter = IntentFilter(BluetoothDevice.ACTION_FOUND)
            registerReceiver(classicReceiver, filter)
            classicReceiverRegistered = true
            val started = bluetoothAdapter.startDiscovery()
            if (!started) {
                Toast.makeText(this, "Discovery classica non partita", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Discovery classica avviata", Toast.LENGTH_SHORT).show()
            }
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
        val category = getBluetoothClassCategory(device.bluetoothClass)
        val item = DeviceItem(
            name = name,
            address = device.address,
            rssi = rssi,
            type = "Classic",
            category = category,
            uuids = "N/D",
            manufacturer = "N/D",
            appearance = "N/D",
            modelId = "N/D",
            bluetoothDevice = device
        )
        deviceList.add(item)
        handler.post { adapter.notifyDataSetChanged() }
    }

    private fun getBluetoothClassCategory(bluetoothClass: BluetoothClass?): String {
        if (bluetoothClass == null) return "N/D"
        return when (bluetoothClass.majorDeviceClass) {
            BluetoothClass.Device.Major.AUDIO_VIDEO -> "Audio/Video"
            BluetoothClass.Device.Major.COMPUTER -> "Computer"
            BluetoothClass.Device.Major.HEALTH -> "Health"
            BluetoothClass.Device.Major.IMAGING -> "Imaging"
            BluetoothClass.Device.Major.MISC -> "Misc"
            BluetoothClass.Device.Major.NETWORKING -> "Network"
            BluetoothClass.Device.Major.PERIPHERAL -> "Peripheral"
            BluetoothClass.Device.Major.PHONE -> "Phone"
            BluetoothClass.Device.Major.TOY -> "Toy"
            BluetoothClass.Device.Major.WEARABLE -> "Wearable"
            else -> "Altro"
        }
    }

    private fun getManufacturerString(result: ScanResult): String {
        val data = result.scanRecord?.manufacturerSpecificData
        if (data == null || data.size() == 0) return "N/D"
        val sb = StringBuilder()
        for (i in 0 until data.size()) {
            val companyId = data.keyAt(i)
            val companyName = dbManager.getCompanyName(companyId) ?: "0x${companyId.toString(16).uppercase()}"
            sb.append("$companyName ($companyId)")
            if (i < data.size() - 1) sb.append("; ")
        }
        return sb.toString()
    }

    private fun uuidToName(uuid: String): String {
        return dbManager.getServiceName(uuid) ?: uuid
    }

    private fun parseAppearance(result: ScanResult): String {
        val scanRecord = result.scanRecord ?: return "N/D"
        val bytes = scanRecord.bytes
        var i = 0
        while (i < bytes.size) {
            val length = bytes[i].toInt() and 0xFF
            if (length == 0) break
            val type = bytes[i + 1].toInt() and 0xFF
            if (type == 0x19) { // GAP Appearance
                if (length >= 3) {
                    val appearanceValue = ((bytes[i + 2].toInt() and 0xFF) or
                                          ((bytes[i + 3].toInt() and 0xFF) shl 8))
                    return dbManager.getAppearanceName(appearanceValue)?.first ?: "N/D"
                }
            }
            i += length + 1
        }
        return "N/D"
    }

    private fun parseFastPairModelId(result: ScanResult): String {
        val scanRecord = result.scanRecord ?: return "N/D"
        val serviceData = scanRecord.serviceData
        if (serviceData == null || serviceData.isEmpty()) return "N/D"
        val fastPairUuid = ParcelUuid.fromString("0000FE2C-0000-1000-8000-00805F9B34FB")
        val data = serviceData[fastPairUuid] ?: return "N/D"
        if (data.size < 3) return "N/D"
        return String.format("%02X:%02X:%02X", data[0], data[1], data[2])
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

    private fun updateStatus(running: Boolean) {
        statusText.text = if (running) "Scansione attiva" else "Scansione ferma"
    }

    override fun onDestroy() {
        stopScanning()
        super.onDestroy()
    }
}