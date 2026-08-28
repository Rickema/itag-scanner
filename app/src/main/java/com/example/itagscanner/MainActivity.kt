package com.example.itagscanner

import android.Manifest
import android.app.AlertDialog
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.*
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
    private lateinit var dbLogHeader: View
    private lateinit var debugText: TextView

    private lateinit var dbManager: DatabaseManager
    private val rawDeviceList = mutableListOf<DeviceItem>()
    private val displayDeviceList = mutableListOf<DeviceItem>()
    private lateinit var adapter: DeviceListAdapter

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var isScanning = false
    private var minRssiThreshold = -100

    private val bleScanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result?.let { handleBleResult(it) }
        }
    }

    private val classicReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (BluetoothDevice.ACTION_FOUND == intent?.action) {
                val device = intent.getParcelableExtra<BluetoothDevice>(BluetoothDevice.EXTRA_DEVICE)
                val rssi = intent.getShortExtra(BluetoothDevice.EXTRA_RSSI, Short.MIN_VALUE).toInt()
                device?.let { handleClassicDevice(it, rssi) }
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
        dbLogHeader = findViewById(R.id.databaseLogHeader)
        debugText = findViewById(R.id.debugText)

        val btManager = getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = btManager?.adapter

        dbManager = DatabaseManager(this)
        adapter = DeviceListAdapter(
            this,
            displayDeviceList,
            onSelectClick = { device -> selectTarget(device) },
            onRenameClick = { device -> showRenameDialog(device) }
        )
        deviceListView.adapter = adapter

        // Gestione espansione/riduzione log database al click sull'intestazione
        dbLogHeader.setOnClickListener {
            debugText.visibility = if (debugText.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }

        // Filtro soglia RSSI
        rssiSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                // Mappa 0..100 su -100..0 dBm
                minRssiThreshold = -100 + progress
                rssiValueText.text = "Soglia minima RSSI: $minRssiThreshold dBm"
                applyRssiFilter()
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        manageButton.setOnClickListener {
            startActivity(Intent(this, DeviceManagerActivity::class.java))
        }

        startButton.setOnClickListener {
            checkPermissionsAndStartScan()
        }

        stopButton.setOnClickListener {
            stopScan()
        }

        registerReceiver(classicReceiver, IntentFilter(BluetoothDevice.ACTION_FOUND))

        // Inizializza e aggiorna database Bluetooth SIG in background
        dbManager.ensureDatabases {
            runOnUiThread {
                debugText.text = dbManager.getDebugInfo()
            }
        }
    }

    private fun checkPermissionsAndStartScan() {
        val needed = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.BLUETOOTH_SCAN)
            }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.BLUETOOTH_CONNECT)
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.ACCESS_FINE_LOCATION)
            }
        }

        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), 101)
        } else {
            startScan()
        }
    }

    private fun startScan() {
        if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
            Toast.makeText(this, "Attiva il Bluetooth prima di avviare la scansione", Toast.LENGTH_SHORT).show()
            return
        }

        isScanning = true
        statusText.text = "Scansione principale in corso..."
        rawDeviceList.clear()
        applyRssiFilter()

        try {
            // 1. Scansione BLE principale
            bluetoothAdapter?.bluetoothLeScanner?.startScan(bleScanCallback)

            // 2. Se abilitato, avvia anche Discovery Classica
            if (includeClassicCheckBox.isChecked) {
                bluetoothAdapter?.startDiscovery()
            }
        } catch (e: SecurityException) {
            Toast.makeText(this, "Permessi insufficienti: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun stopScan() {
        isScanning = false
        statusText.text = "Scansione ferma"
        try {
            bluetoothAdapter?.bluetoothLeScanner?.stopScan(bleScanCallback)
            bluetoothAdapter?.cancelDiscovery()
        } catch (e: SecurityException) {
            // Ignora
        }
    }

    private fun handleBleResult(result: ScanResult) {
        val device = result.device ?: return
        val mac = device.address ?: return

        val scanRecord = result.scanRecord
        val deviceName = try { device.name } catch (e: SecurityException) { null } ?: scanRecord?.deviceName ?: "BLE Device"
        val customName = getSavedCustomName(mac)

        // Ricerca produttore dal database SIG
        val manufacturerData = scanRecord?.manufacturerSpecificData
        var manufacturerName = "N/D"
        if (manufacturerData != null && manufacturerData.size() > 0) {
            val companyId = manufacturerData.keyAt(0)
            manufacturerName = dbManager.getCompanyName(companyId) ?: "ID: 0x${companyId.toString(16).uppercase()}"
        }

        val item = DeviceItem(
            name = deviceName,
            customName = customName,
            address = mac,
            rssi = result.rssi,
            type = "BLE",
            category = "BLE Peripheral",
            uuids = scanRecord?.serviceUuids?.joinToString(", ") ?: "N/D",
            manufacturer = manufacturerName,
            appearance = "BLE Standard",
            classificationType = "BLE Device",
            classificationBrand = manufacturerName,
            classificationConfidence = 95,
            bluetoothDevice = device
        )

        upsertDevice(item)
    }

    private fun handleClassicDevice(device: BluetoothDevice, rssi: Int) {
        val mac = device.address ?: return
        val name = try { device.name } catch (e: SecurityException) { null } ?: "Dispositivo Classico"
        val customName = getSavedCustomName(mac)

        val item = DeviceItem(
            name = name,
            customName = customName,
            address = mac,
            rssi = rssi,
            type = "Classic",
            category = "Bluetooth Classico",
            uuids = "BR/EDR Discovery",
            manufacturer = "Standard Bluetooth",
            appearance = "BR/EDR",
            classificationType = "Bluetooth Classico",
            classificationBrand = "Sconosciuto",
            classificationConfidence = 85,
            bluetoothDevice = device
        )

        upsertDevice(item)
    }

    private fun upsertDevice(item: DeviceItem) {
        runOnUiThread {
            val index = rawDeviceList.indexOfFirst { it.address.equals(item.address, ignoreCase = true) }
            if (index >= 0) {
                rawDeviceList[index] = item
            } else {
                rawDeviceList.add(item)
            }
            applyRssiFilter()
        }
    }

    private fun applyRssiFilter() {
        displayDeviceList.clear()
        displayDeviceList.addAll(rawDeviceList.filter { it.rssi >= minRssiThreshold })
        adapter.notifyDataSetChanged()
    }

    private fun selectTarget(device: DeviceItem) {
        val displayName = device.customName ?: device.name ?: device.address
        getSharedPreferences("itag_prefs", Context.MODE_PRIVATE).edit()
            .putString("target_mac", device.address)
            .putString("target_name", displayName)
            .putString("target_technology", device.type) // "BLE" oppure "Classic"
            .apply()

        Toast.makeText(this, "Target impostato: $displayName [${device.type}]", Toast.LENGTH_SHORT).show()

        // Avvia il servizio di tracking nativo in background
        val serviceIntent = Intent(this, ScannerService::class.java)
        startService(serviceIntent)
    }

    private fun showRenameDialog(device: DeviceItem) {
        val input = EditText(this).apply {
            setText(device.customName ?: device.name ?: "")
            hint = "Inserisci alias per ${device.address}"
        }
        AlertDialog.Builder(this)
            .setTitle("Rinomina Dispositivo")
            .setMessage("MAC: ${device.address}\nTecnologia: ${device.type}")
            .setView(input)
            .setPositiveButton("Salva") { _, _ ->
                val newName = input.text.toString().trim()
                saveCustomName(device.address, newName)
                device.customName = newName
                adapter.notifyDataSetChanged()
                Toast.makeText(this, "Nome salvato!", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Annulla", null)
            .show()
    }

    private fun saveCustomName(mac: String, name: String) {
        getSharedPreferences("custom_names", Context.MODE_PRIVATE)
            .edit().putString(mac.uppercase(), name).apply()
    }

    private fun getSavedCustomName(mac: String): String? {
        return getSharedPreferences("custom_names", Context.MODE_PRIVATE)
            .getString(mac.uppercase(), null)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopScan()
        try {
            unregisterReceiver(classicReceiver)
        } catch (e: Exception) {
            // ignora
        }
    }
}
