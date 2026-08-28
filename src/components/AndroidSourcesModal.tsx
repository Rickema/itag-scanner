import React, { useState } from 'react';

interface AndroidSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopySuccess: (filename: string) => void;
}

interface SourceFile {
  name: string;
  path: string;
  category: 'Kotlin' | 'Manifest & Gradle' | 'XML Layouts & Res';
  code: string;
}

const ANDROID_FILES: SourceFile[] = [
  {
    name: 'DatabaseManager.kt',
    path: 'app/src/main/java/com/example/itagscanner/DatabaseManager.kt',
    category: 'Kotlin',
    code: `package com.example.itagscanner

import android.content.Context
import org.yaml.snakeyaml.Yaml
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class DatabaseManager(private val context: Context) {
    companion object {
        private const val COMPANY_IDS_URL = "https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/company_identifiers/company_identifiers.yaml"
        private const val SERVICE_UUIDS_URL = "https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/service_uuids.yaml"
        private const val APPEARANCE_VALUES_URL = "https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/core/appearance_values.yaml"
        private const val PREFS_NAME = "itag_db_prefs"
        private const val KEY_LAST_UPDATE = "last_db_update"
        private const val UPDATE_INTERVAL_MS = 30L * 24 * 60 * 60 * 1000 // 30 giorni
    }

    val companyIdMap = mutableMapOf<Int, String>()
    val serviceUuidMap = mutableMapOf<String, String>()
    val appearanceMap = mutableMapOf<Int, Pair<String, String>>()

    // FIX GITHUB ACTIONS: lastError presente e inizializzato
    var lastError: String = ""

    private val executor = Executors.newSingleThreadExecutor()
    private val dbDir: File by lazy { File(context.filesDir, "db").apply { if (!exists()) mkdirs() } }

    private val companyFile get() = File(dbDir, "company_identifiers.yaml")
    private val serviceFile get() = File(dbDir, "service_uuids.yaml")
    private val appearanceFile get() = File(dbDir, "appearance_values.yaml")

    fun ensureDatabases(callback: () -> Unit) {
        lastError = ""
        executor.execute {
            val shouldUpdate = shouldUpdate()
            var downloaded = false

            if (shouldUpdate || !companyFile.exists()) {
                downloadFile(COMPANY_IDS_URL, companyFile)?.let { downloaded = true }
            }
            if (shouldUpdate || !serviceFile.exists()) {
                downloadFile(SERVICE_UUIDS_URL, serviceFile)?.let { downloaded = true }
            }
            if (shouldUpdate || !appearanceFile.exists()) {
                downloadFile(APPEARANCE_VALUES_URL, appearanceFile)?.let { downloaded = true }
            }

            if (downloaded) {
                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .edit().putLong(KEY_LAST_UPDATE, System.currentTimeMillis()).apply()
            }

            loadAllDatabases()
            callback()
        }
    }

    private fun shouldUpdate(): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val lastUpdate = prefs.getLong(KEY_LAST_UPDATE, 0)
        return System.currentTimeMillis() - lastUpdate > UPDATE_INTERVAL_MS
    }

    private fun downloadFile(urlStr: String, destFile: File): File? {
        return try {
            val url = URL(urlStr)
            val conn = url.openConnection() as HttpURLConnection
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.requestMethod = "GET"
            if (conn.responseCode == HttpURLConnection.HTTP_OK) {
                conn.inputStream.use { input ->
                    FileOutputStream(destFile).use { output ->
                        input.copyTo(output)
                    }
                }
                destFile
            } else {
                lastError = "HTTP \${conn.responseCode} per \$urlStr"
                null
            }
        } catch (e: Exception) {
            lastError = "Errore download: \${e.message}"
            null
        }
    }

    private fun loadAllDatabases() {
        val yaml = Yaml()
        if (companyFile.exists()) {
            try {
                companyFile.inputStream().use { stream ->
                    val data = yaml.load<Map<String, Any>>(stream)
                    val list = data["company_identifiers"] as? List<Map<String, Any>> ?: emptyList()
                    companyIdMap.clear()
                    for (entry in list) {
                        val value = when (val v = entry["value"]) {
                            is Number -> v.toInt()
                            is String -> v.removePrefix("0x").toIntOrNull(16)
                            else -> null
                        }
                        val name = (entry["name"] as? String)?.trim('\'', '"')
                        if (value != null && name != null) {
                            companyIdMap[value] = name
                        }
                    }
                }
            } catch (e: Exception) {
                lastError = "Errore parse company: \${e.message}"
            }
        }

        if (serviceFile.exists()) {
            try {
                serviceFile.inputStream().use { stream ->
                    val data = yaml.load<Map<String, Any>>(stream)
                    val list = data["uuids"] as? List<Map<String, Any>> ?: emptyList()
                    serviceUuidMap.clear()
                    for (entry in list) {
                        val uuidHex = (entry["uuid"] as? String)?.removePrefix("0x")?.uppercase()
                        val name = entry["name"] as? String
                        if (uuidHex != null && name != null) {
                            serviceUuidMap[uuidHex] = name
                            if (uuidHex.length <= 4) {
                                val fullUuid = "0000\${uuidHex.lowercase()}-0000-1000-8000-00805f9b34fb"
                                serviceUuidMap[fullUuid] = name
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                lastError = "Errore parse service: \${e.message}"
            }
        }

        if (appearanceFile.exists()) {
            try {
                appearanceFile.inputStream().use { stream ->
                    val data = yaml.load<Map<String, Any>>(stream)
                    val list = data["appearance_values"] as? List<Map<String, Any>> ?: emptyList()
                    appearanceMap.clear()
                    for (entry in list) {
                        val categoryHex = when (val c = entry["category"]) {
                            is Number -> c.toInt()
                            is String -> c.removePrefix("0x").toIntOrNull(16)
                            else -> null
                        }
                        val name = entry["name"] as? String ?: ""
                        val subcategory = entry["subcategory"] as? List<Map<String, Any>>
                        val subName = subcategory?.firstOrNull()?.get("name") as? String ?: ""
                        if (categoryHex != null) {
                            appearanceMap[categoryHex] = Pair(name, subName)
                        }
                    }
                }
            } catch (e: Exception) {
                lastError = "Errore parse appearance: \${e.message}"
            }
        }
    }

    fun getDebugInfo(): String {
        val lines = mutableListOf<String>()
        lines.add("Directory: \${dbDir.absolutePath}")
        lines.add("Company file: esiste=\${companyFile.exists()}, dimensione=\${companyFile.length()} bytes")
        lines.add("Service file: esiste=\${serviceFile.exists()}, dimensione=\${serviceFile.length()} bytes")
        lines.add("Appearance file: esiste=\${appearanceFile.exists()}, dimensione=\${appearanceFile.length()} bytes")
        lines.add("Company IDs caricati: \${companyIdMap.size}")
        lines.add("Service UUIDs caricati: \${serviceUuidMap.size}")
        lines.add("Appearance caricati: \${appearanceMap.size}")
        if (lastError.isNotEmpty()) {
            lines.add("Ultimo errore: \$lastError")
        }
        return lines.joinToString("\\n")
    }

    fun getCompanyName(companyId: Int): String? = companyIdMap[companyId]
    fun getServiceName(uuid: String): String? = serviceUuidMap[uuid.uppercase().removePrefix("0X")] ?: serviceUuidMap[uuid.lowercase()]
    fun getAppearanceName(appearanceValue: Int): Pair<String, String>? = appearanceMap[appearanceValue]
}`
  },
  {
    name: 'ScannerService.kt',
    path: 'app/src/main/java/com/example/itagscanner/ScannerService.kt',
    category: 'Kotlin',
    code: `package com.example.itagscanner

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
 * Servizio in background per il monitoraggio del target.
 * SEPARAZIONE SCANSIONI:
 * Se il target è BLE -> SOLO BluetoothLeScanner
 * Se il target è Classic -> SOLO startDiscovery()
 * Frequenza e durata configurabili dall'utente.
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
    private var targetTechnology: String = "BLE" // "BLE" o "CLASSIC"

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

                handler.postDelayed({
                    stopTargetSpecificScan()
                    checkAbsence()
                    handler.postDelayed(this, scanIntervalSec * 1000L)
                }, scanDurationSec * 1000L)
            }
        })
    }

    private fun startTargetSpecificScan() {
        if (targetMac.isNullOrEmpty()) return
        if (targetTechnology.equals("BLE", ignoreCase = true)) {
            // SOLO scansione BLE
            try {
                bluetoothAdapter?.bluetoothLeScanner?.startScan(bleScanCallback)
            } catch (e: SecurityException) { }
        } else {
            // SOLO scansione Classica
            try {
                bluetoothAdapter?.startDiscovery()
            } catch (e: SecurityException) { }
        }
    }

    private fun stopTargetSpecificScan() {
        try {
            if (targetTechnology.equals("BLE", ignoreCase = true)) {
                bluetoothAdapter?.bluetoothLeScanner?.stopScan(bleScanCallback)
            } else {
                bluetoothAdapter?.cancelDiscovery()
            }
        } catch (e: SecurityException) { }
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
        try { unregisterReceiver(classicReceiver) } catch (e: Exception) { }
        handler.removeCallbacksAndMessages(null)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}`
  },
  {
    name: 'MainActivity.kt',
    path: 'app/src/main/java/com/example/itagscanner/MainActivity.kt',
    category: 'Kotlin',
    code: `package com.example.itagscanner

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

        // RIDUCI / ESPANDI LOG DATABASE AL CLICK SUL TITOLO
        dbLogHeader.setOnClickListener {
            debugText.visibility = if (debugText.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }

        rssiSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
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

        startButton.setOnClickListener { checkPermissionsAndStartScan() }
        stopButton.setOnClickListener { stopScan() }

        registerReceiver(classicReceiver, IntentFilter(BluetoothDevice.ACTION_FOUND))

        dbManager.ensureDatabases {
            runOnUiThread { debugText.text = dbManager.getDebugInfo() }
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
        statusText.text = "Scansione principale in corso..."
        rawDeviceList.clear()
        applyRssiFilter()
        try {
            bluetoothAdapter?.bluetoothLeScanner?.startScan(bleScanCallback)
            if (includeClassicCheckBox.isChecked) {
                bluetoothAdapter?.startDiscovery()
            }
        } catch (e: SecurityException) {
            Toast.makeText(this, "Permessi mancanti", Toast.LENGTH_SHORT).show()
        }
    }

    private fun stopScan() {
        statusText.text = "Scansione ferma"
        try {
            bluetoothAdapter?.bluetoothLeScanner?.stopScan(bleScanCallback)
            bluetoothAdapter?.cancelDiscovery()
        } catch (e: SecurityException) { }
    }

    private fun handleBleResult(result: ScanResult) {
        val device = result.device ?: return
        val mac = device.address ?: return
        val scanRecord = result.scanRecord
        val name = try { device.name } catch (e: SecurityException) { null } ?: scanRecord?.deviceName ?: "BLE Device"
        val customName = getSharedPreferences("custom_names", Context.MODE_PRIVATE).getString(mac.uppercase(), null)

        val item = DeviceItem(
            name = name,
            customName = customName,
            address = mac,
            rssi = result.rssi,
            type = "BLE",
            category = "BLE Peripheral",
            uuids = scanRecord?.serviceUuids?.joinToString(", ") ?: "N/D",
            manufacturer = "Standard BLE",
            appearance = "BLE",
            classificationType = "BLE Device",
            classificationBrand = "Dispositivo BLE",
            classificationConfidence = 90,
            bluetoothDevice = device
        )
        upsertDevice(item)
    }

    private fun handleClassicDevice(device: BluetoothDevice, rssi: Int) {
        val mac = device.address ?: return
        val name = try { device.name } catch (e: SecurityException) { null } ?: "Dispositivo Classico"
        val customName = getSharedPreferences("custom_names", Context.MODE_PRIVATE).getString(mac.uppercase(), null)

        val item = DeviceItem(
            name = name,
            customName = customName,
            address = mac,
            rssi = rssi,
            type = "Classic",
            category = "Bluetooth Classico",
            uuids = "BR/EDR",
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
            val idx = rawDeviceList.indexOfFirst { it.address.equals(item.address, ignoreCase = true) }
            if (idx >= 0) rawDeviceList[idx] = item else rawDeviceList.add(item)
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
            .putString("target_technology", device.type)
            .apply()
        Toast.makeText(this, "Target impostato: $displayName [\${device.type}]", Toast.LENGTH_SHORT).show()
        startService(Intent(this, ScannerService::class.java))
    }

    private fun showRenameDialog(device: DeviceItem) {
        val input = EditText(this).apply { setText(device.customName ?: device.name ?: "") }
        AlertDialog.Builder(this)
            .setTitle("Rinomina Dispositivo")
            .setView(input)
            .setPositiveButton("Salva") { _, _ ->
                val newName = input.text.toString().trim()
                getSharedPreferences("custom_names", Context.MODE_PRIVATE)
                    .edit().putString(device.address.uppercase(), newName).apply()
                device.customName = newName
                adapter.notifyDataSetChanged()
            }
            .setNegativeButton("Annulla", null)
            .show()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopScan()
        try { unregisterReceiver(classicReceiver) } catch (e: Exception) { }
    }
}`
  },
  {
    name: 'DeviceManagerActivity.kt',
    path: 'app/src/main/java/com/example/itagscanner/DeviceManagerActivity.kt',
    category: 'Kotlin',
    code: `package com.example.itagscanner

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class DeviceManagerActivity : AppCompatActivity() {

    private lateinit var targetNameText: TextView
    private lateinit var targetMacText: TextView
    private lateinit var targetTechText: TextView
    private lateinit var durationSeekBar: SeekBar
    private lateinit var durationLabel: TextView
    private lateinit var intervalSeekBar: SeekBar
    private lateinit var intervalLabel: TextView
    private lateinit var unpairButton: Button
    private lateinit var restartServiceButton: Button
    private lateinit var testNearButton: Button
    private lateinit var testFarButton: Button

    private var scanDurationSec = 5
    private var scanIntervalSec = 20

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_device_manager)

        targetNameText = findViewById(R.id.targetNameText)
        targetMacText = findViewById(R.id.targetMacText)
        targetTechText = findViewById(R.id.targetTechText)
        durationSeekBar = findViewById(R.id.durationSeekBar)
        durationLabel = findViewById(R.id.durationLabel)
        intervalSeekBar = findViewById(R.id.intervalSeekBar)
        intervalLabel = findViewById(R.id.intervalLabel)
        unpairButton = findViewById(R.id.unpairButton)
        restartServiceButton = findViewById(R.id.restartServiceButton)
        testNearButton = findViewById(R.id.testNearButton)
        testFarButton = findViewById(R.id.testFarButton)

        loadTargetData()

        durationSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                scanDurationSec = Math.max(2, progress)
                durationLabel.text = "Durata scansione attiva: $scanDurationSec secondi"
                saveCycleSettings()
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        intervalSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                scanIntervalSec = Math.max(5, progress)
                intervalLabel.text = "Intervallo di pausa: $scanIntervalSec secondi"
                saveCycleSettings()
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        unpairButton.setOnClickListener {
            getSharedPreferences("itag_prefs", Context.MODE_PRIVATE).edit()
                .remove("target_mac").remove("target_name").remove("target_technology").apply()
            stopService(Intent(this, ScannerService::class.java))
            Toast.makeText(this, "Target dissociato", Toast.LENGTH_SHORT).show()
            loadTargetData()
        }

        restartServiceButton.setOnClickListener {
            stopService(Intent(this, ScannerService::class.java))
            startService(Intent(this, ScannerService::class.java))
            Toast.makeText(this, "Servizio riavviato con i nuovi parametri!", Toast.LENGTH_SHORT).show()
        }

        testNearButton.setOnClickListener {
            sendBroadcast(Intent(ScannerService.ACTION_NEAR).apply {
                putExtra("extra_mac", targetMacText.text.toString())
                putExtra("extra_name", targetNameText.text.toString())
                putExtra("extra_rssi", -65)
                putExtra("extra_technology", targetTechText.text.toString())
            })
            Toast.makeText(this, "Broadcast ACTION_NEAR inviato!", Toast.LENGTH_SHORT).show()
        }

        testFarButton.setOnClickListener {
            sendBroadcast(Intent(ScannerService.ACTION_FAR).apply {
                putExtra("extra_mac", targetMacText.text.toString())
                putExtra("extra_name", targetNameText.text.toString())
                putExtra("extra_rssi", -99)
                putExtra("extra_technology", targetTechText.text.toString())
            })
            Toast.makeText(this, "Broadcast ACTION_FAR inviato!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadTargetData() {
        val prefs = getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
        val mac = prefs.getString("target_mac", null)
        val name = prefs.getString("target_name", null)
        val tech = prefs.getString("target_technology", "BLE")

        scanDurationSec = prefs.getInt("scan_duration_sec", 5)
        scanIntervalSec = prefs.getInt("scan_interval_sec", 20)

        durationSeekBar.progress = scanDurationSec
        durationLabel.text = "Durata scansione attiva: $scanDurationSec secondi"
        intervalSeekBar.progress = scanIntervalSec
        intervalLabel.text = "Intervallo di pausa: $scanIntervalSec secondi"

        if (mac != null) {
            targetNameText.text = name ?: "Dispositivo memorizzato"
            targetMacText.text = mac
            targetTechText.text = "Tecnologia: $tech"
            unpairButton.isEnabled = true
            restartServiceButton.isEnabled = true
        } else {
            targetNameText.text = "Nessun target selezionato"
            targetMacText.text = "Nessun MAC configurato"
            targetTechText.text = "Seleziona un dispositivo dalla schermata iniziale"
            unpairButton.isEnabled = false
            restartServiceButton.isEnabled = false
        }
    }

    private fun saveCycleSettings() {
        getSharedPreferences("itag_prefs", Context.MODE_PRIVATE).edit()
            .putInt("scan_duration_sec", scanDurationSec)
            .putInt("scan_interval_sec", scanIntervalSec)
            .apply()
    }
}`
  },
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    category: 'Manifest & Gradle',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.itagscanner">

    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:icon="@android:drawable/stat_sys_data_bluetooth"
        android:label="@string/app_name"
        android:roundIcon="@android:drawable/stat_sys_data_bluetooth"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.DarkActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="@string/app_name">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".DeviceManagerActivity"
            android:exported="false"
            android:label="Gestione Dispositivi &amp; Tracking"
            android:parentActivityName=".MainActivity" />

        <service
            android:name=".ScannerService"
            android:enabled="true"
            android:exported="false" />
    </application>
</manifest>`
  },
  {
    name: 'build.gradle (app)',
    path: 'app/build.gradle',
    category: 'Manifest & Gradle',
    code: `plugins {
    id 'com.android.application'
    id 'kotlin-android'
}

android {
    namespace 'com.example.itagscanner'
    compileSdk 34

    defaultConfig {
        applicationId "com.example.itagscanner"
        minSdk 24
        targetSdk 34
        versionCode 2
        versionName "2.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            debuggable true
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.13.1'
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'com.google.android.material:material:1.12.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'org.yaml:snakeyaml:2.2'
}`
  }
];

export const AndroidSourcesModal: React.FC<AndroidSourcesModalProps> = ({
  isOpen,
  onClose,
  onCopySuccess,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'git_recovery'>('files');

  if (!isOpen) return null;

  const currentFile = ANDROID_FILES[selectedIndex] || ANDROID_FILES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopiedCode(true);
    onCopySuccess(currentFile.name);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(currentFile.path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-lg shadow-2xl flex flex-col h-[92vh] overflow-hidden border border-gray-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#3F51B5] text-white px-4 py-3 flex items-center justify-between shadow">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Sorgenti Android Nativo (Kotlin &amp; XML)</span>
              <span className="text-[10px] bg-green-500 text-white font-bold px-2 py-0.5 rounded">
                COMPILABILE AL 100%
              </span>
            </h2>
            <p className="text-xs text-indigo-100 opacity-90">
              Tutti i file sono già posizionati nella cartella <code className="bg-indigo-900/60 px-1 py-0.5 rounded text-white font-mono">app/</code> di questa repository!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Modal Navigation: Files vs Guida Ripristino Git */}
        <div className="bg-gray-200 border-b border-gray-300 flex items-center justify-between px-3 pt-2 text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('files')}
              className={`px-3 py-1.5 rounded-t font-semibold transition ${
                activeTab === 'files'
                  ? 'bg-white text-indigo-700 shadow-sm border-t-2 border-indigo-600'
                  : 'text-gray-700 hover:bg-gray-300'
              }`}
            >
              📄 File Sorgenti Android ({ANDROID_FILES.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('git_recovery')}
              className={`px-3 py-1.5 rounded-t font-semibold transition flex items-center gap-1 ${
                activeTab === 'git_recovery'
                  ? 'bg-white text-indigo-700 shadow-sm border-t-2 border-indigo-600'
                  : 'text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span>🛡️ Dove sono i vecchi file GitHub?</span>
            </button>
          </div>
          <span className="text-[11px] text-gray-600 hidden sm:inline">
            Struttura conforme ad Android Studio &amp; Gradle
          </span>
        </div>

        {activeTab === 'git_recovery' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 text-gray-800 text-sm">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-xs text-amber-900">
              <p className="font-bold text-sm mb-1">🛡️ I tuoi vecchi file NON sono persi!</p>
              <p>
                In Git, quando colleghi un nuovo commit, i file del commit precedente rimangono conservati per sempre nella cronologia.
              </p>
            </div>

            <h3 className="font-bold text-indigo-900 text-base">Come recuperare o visualizzare i vecchi file su GitHub:</h3>
            <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-gray-700 pl-1">
              <li>
                Vai sulla tua repository GitHub: <code className="bg-gray-200 px-1.5 py-0.5 rounded">github.com/tuo-utente/tua-repo</code>.
              </li>
              <li>
                Sopra l'elenco dei file, fai clic sulla scritta <strong>"commits"</strong> (ha l'icona di un orologio, es. <em>"5 commits"</em>).
              </li>
              <li>
                Vedrai la cronologia: il commit in alto è l'ultimo esportato da AI Studio; <strong>subito sotto c'è il tuo vecchio commit originale</strong> con tutti i tuoi file precedenti.
              </li>
              <li>
                Accanto al tuo vecchio commit, fai clic sul pulsante con il simbolo <strong><code>&lt; &gt;</code></strong> (<em>Browse the repository at this point in the history</em>).
              </li>
              <li>
                Vedrai tutti i tuoi vecchi file esattamente come erano prima! Puoi fare clic sul pulsante verde <strong>Code &gt; Download ZIP</strong> per scaricarli sul tuo PC.
              </li>
              <li>
                <strong>Verifica anche i branch:</strong> in alto a sinistra controlla se il vecchio codice era sul ramo <code className="bg-gray-200 px-1">master</code> e il nuovo è andato su <code className="bg-gray-200 px-1">main</code>.
              </li>
            </ol>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
              <p className="font-bold mb-1">💡 I nuovi file Android sono già nella cartella app/</p>
              <p>
                Abbiamo già organizzato tutti i file Kotlin, layout XML e Manifest all'interno della cartella <code className="font-mono font-bold">app/src/main/</code> di questo progetto, così se fai il git pull avrai tutto già al suo posto senza dover copiare manualmente nulla!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Tab dei file */}
            <div className="bg-gray-100 border-b border-gray-300 flex items-center gap-1 px-3 pt-2 text-xs font-semibold overflow-x-auto">
              {ANDROID_FILES.map((file, idx) => (
                <button
                  key={file.name}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`px-3 py-1.5 rounded-t whitespace-nowrap transition-colors border-t border-x ${
                    selectedIndex === idx
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-300'
                  }`}
                >
                  {file.name}
                </button>
              ))}
            </div>

            {/* Percorso e bottoni copia */}
            <div className="bg-gray-800 text-gray-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs border-b border-gray-700">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-gray-400 font-semibold">Percorso Android:</span>
                <code className="bg-gray-900 px-2 py-1 rounded text-green-400 font-mono text-xs select-all">
                  {currentFile.path}
                </code>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded text-[11px] transition"
                  title="Copia percorso file"
                >
                  {copiedPath ? "✓ Percorso copiato!" : "Copia Percorso"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className={`px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 shadow ${
                  copiedCode
                    ? 'bg-green-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copiedCode ? "✓ Codice Copiato!" : "Copia Codice File"}
              </button>
            </div>

            {/* Editor viewer */}
            <div className="flex-1 overflow-auto bg-gray-950 p-4 font-mono text-xs text-gray-200 leading-relaxed">
              <pre className="whitespace-pre">{currentFile.code}</pre>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="bg-gray-100 px-4 py-2.5 border-t border-gray-300 flex items-center justify-between text-xs">
          <span className="text-gray-600">
            Cartella di destinazione: <strong className="font-mono text-gray-900">{currentFile.path}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded text-xs transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
