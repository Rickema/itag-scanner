package com.example.itagscanner

import android.Manifest
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
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ListView
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.material.switchmaterial.SwitchMaterial

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var statusIndicatorDot: View
    private lateinit var statusCountBadge: TextView
    private lateinit var listCountBadge: TextView
    private lateinit var startButton: Button
    private lateinit var stopButton: Button
    private lateinit var manageCard: View
    private lateinit var targetActiveDot: View
    private lateinit var includeClassicSwitch: SwitchMaterial
    private lateinit var rssiSeekBar: SeekBar
    private lateinit var rssiBadgeText: TextView
    private lateinit var btnRssiFar: TextView
    private lateinit var btnRssiItag: TextView
    private lateinit var btnRssiNear: TextView
    private lateinit var deviceListView: ListView
    private lateinit var dbLogHeader: View
    private lateinit var dbLogArrow: TextView
    private lateinit var debugText: TextView

    private lateinit var adapter: DeviceListAdapter
    private val rawDeviceList = mutableListOf<DeviceItem>()
    private val displayDeviceList = mutableListOf<DeviceItem>()
    private lateinit var dbManager: DatabaseManager

    private var bluetoothAdapter: BluetoothAdapter? = null
    private var isScanning = false
    private var minRssiThreshold = -75 // Valore predefinito ottimale (-75 dBm come nella preview)

    // Handler per sincronizzazione fluida della lista senza salti né sfarfallii
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingUpdate = false
    private val updateRunnable = Runnable {
        syncDisplayList()
        pendingUpdate = false
    }

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

        deviceListView = findViewById(R.id.deviceListView)

        // Gonfia l'header con tutte le card dei controlli esattamente conformi alla preview
        val headerView = layoutInflater.inflate(R.layout.header_main_controls, deviceListView, false)
        deviceListView.addHeaderView(headerView, null, false)

        // Associa tutti i componenti dell'header
        statusText = headerView.findViewById(R.id.statusText)
        statusIndicatorDot = headerView.findViewById(R.id.statusIndicatorDot)
        statusCountBadge = headerView.findViewById(R.id.statusCountBadge)
        listCountBadge = headerView.findViewById(R.id.listCountBadge)
        startButton = headerView.findViewById(R.id.startButton)
        stopButton = headerView.findViewById(R.id.stopButton)
        manageCard = headerView.findViewById(R.id.manageCard)
        targetActiveDot = headerView.findViewById(R.id.targetActiveDot)
        includeClassicSwitch = headerView.findViewById(R.id.includeClassicSwitch)
        rssiSeekBar = headerView.findViewById(R.id.rssiSeekBar)
        rssiBadgeText = headerView.findViewById(R.id.rssiBadgeText)
        btnRssiFar = headerView.findViewById(R.id.btnRssiFar)
        btnRssiItag = headerView.findViewById(R.id.btnRssiItag)
        btnRssiNear = headerView.findViewById(R.id.btnRssiNear)
        dbLogHeader = headerView.findViewById(R.id.databaseLogHeader)
        dbLogArrow = headerView.findViewById(R.id.dbLogArrow)
        debugText = headerView.findViewById(R.id.debugText)

        val btManager = getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = btManager?.adapter

        dbManager = DatabaseManager(this)

        adapter = DeviceListAdapter(
            context = this,
            items = displayDeviceList,
            targetMacProvider = {
                getSharedPreferences("itag_prefs", Context.MODE_PRIVATE).getString("target_mac", null)
            },
            onSelectClick = { device -> selectTarget(device) },
            onRenameClick = { device -> showRenameDialog(device) }
        )
        deviceListView.adapter = adapter

        // Espansione / Riduzione Log Database
        dbLogHeader.setOnClickListener {
            if (debugText.visibility == View.VISIBLE) {
                debugText.visibility = View.GONE
                dbLogArrow.text = "▼"
            } else {
                debugText.visibility = View.VISIBLE
                dbLogArrow.text = "▲"
            }
        }

        // Configurazione SeekBar RSSI (0..50 mappato su -100..-50 dBm)
        rssiSeekBar.progress = 25 // Corrisponde a -75 dBm
        rssiSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                val dbm = -100 + progress
                minRssiThreshold = dbm
                rssiBadgeText.text = "$dbm dBm"
                updatePresetChipHighlights(dbm)
                scheduleUiUpdate()
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        // 3 Preset Chips Rapidi (Lontano -100, iTAG -75, Vicino -50)
        btnRssiFar.setOnClickListener {
            rssiSeekBar.progress = 0
        }
        btnRssiItag.setOnClickListener {
            rssiSeekBar.progress = 25
        }
        btnRssiNear.setOnClickListener {
            rssiSeekBar.progress = 50
        }

        manageCard.setOnClickListener {
            startActivity(Intent(this, DeviceManagerActivity::class.java))
        }

        startButton.setOnClickListener {
            checkPermissionsAndStartScan()
        }

        stopButton.setOnClickListener {
            stopScan()
        }

        registerReceiver(classicReceiver, IntentFilter(BluetoothDevice.ACTION_FOUND))

        // Inizializza database SIG integrato
        dbManager.ensureDatabases {
            runOnUiThread {
                debugText.text = dbManager.getDebugInfo()
            }
        }

        updateTargetStatus()
        updatePresetChipHighlights(minRssiThreshold)
    }

    override fun onResume() {
        super.onResume()
        updateTargetStatus()
        adapter.notifyDataSetChanged()
    }

    private fun updateTargetStatus() {
        val targetMac = getSharedPreferences("itag_prefs", Context.MODE_PRIVATE).getString("target_mac", null)
        val hasTarget = !targetMac.isNullOrEmpty()
        targetActiveDot.visibility = if (hasTarget) View.VISIBLE else View.GONE
    }

    private fun updatePresetChipHighlights(threshold: Int) {
        val isFar = threshold <= -90
        val isItag = threshold in -85..-65
        val isNear = threshold >= -60

        btnRssiFar.setBackgroundResource(if (isFar) R.drawable.bg_chip_selected else R.drawable.bg_chip_normal)
        btnRssiFar.setTextColor(ContextCompat.getColor(this, if (isFar) R.color.primary_indigo else R.color.text_secondary))

        btnRssiItag.setBackgroundResource(if (isItag) R.drawable.bg_chip_selected else R.drawable.bg_chip_normal)
        btnRssiItag.setTextColor(ContextCompat.getColor(this, if (isItag) R.color.primary_indigo else R.color.text_secondary))

        btnRssiNear.setBackgroundResource(if (isNear) R.drawable.bg_chip_selected else R.drawable.bg_chip_normal)
        btnRssiNear.setTextColor(ContextCompat.getColor(this, if (isNear) R.color.primary_indigo else R.color.text_secondary))
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
        statusText.text = "Scansione ricerca attiva..."
        statusIndicatorDot.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#10B981"))
        rawDeviceList.clear()
        syncDisplayList()

        try {
            // 1. Scansione BLE principale
            bluetoothAdapter?.bluetoothLeScanner?.startScan(bleScanCallback)

            // 2. Se abilitato, avvia anche Discovery Classica
            if (includeClassicSwitch.isChecked) {
                bluetoothAdapter?.startDiscovery()
            }
        } catch (e: SecurityException) {
            Toast.makeText(this, "Permessi insufficienti: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun stopScan() {
        isScanning = false
        statusText.text = "Scansione ferma"
        statusIndicatorDot.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#94A3B8"))
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
        val rawName = try { device.name } catch (e: SecurityException) { null } ?: scanRecord?.deviceName
        val cleanName = if (rawName.isNullOrBlank() || rawName.equals("BLE Device", ignoreCase = true) || rawName.equals("Unknown", ignoreCase = true)) null else rawName.trim()
        val customName = getSavedCustomName(mac)

        // Produttore dal database SIG
        val manufacturerData = scanRecord?.manufacturerSpecificData
        var companyId: Int? = null
        var manufacturerBytes: ByteArray? = null
        var manufacturerName = "N/D"
        if (manufacturerData != null && manufacturerData.size() > 0) {
            companyId = manufacturerData.keyAt(0)
            manufacturerBytes = manufacturerData.valueAt(0)
            manufacturerName = dbManager.getCompanyName(companyId) ?: "ID: 0x${companyId.toString(16).uppercase()}"
        }

        // Servizi e traduzione UUID standard
        val serviceUuids = scanRecord?.serviceUuids
        val uuidNames = if (!serviceUuids.isNullOrEmpty()) {
            serviceUuids.joinToString(", ") { dbManager.getServiceDescription(it.uuid.toString()) }
        } else {
            "Nessun servizio standard rilevato"
        }

        // Motore di Fingerprinting avanzato
        val classification = dbManager.classifyDevice(
            name = cleanName,
            manufacturerId = companyId,
            manufacturerDataBytes = manufacturerBytes,
            serviceUuids = serviceUuids,
            scanRecordBytes = scanRecord?.bytes,
            bluetoothClass = null,
            isBle = true
        )

        val item = DeviceItem(
            name = cleanName,
            customName = customName,
            address = mac,
            rssi = result.rssi,
            type = "BLE",
            category = classification.category,
            uuids = uuidNames,
            manufacturer = if (classification.brand != "N/D" && classification.brand != "Sconosciuto") classification.brand else manufacturerName,
            appearance = "BLE Standard",
            classificationType = classification.category,
            classificationBrand = classification.brand,
            classificationConfidence = classification.confidence,
            iconEmoji = classification.iconEmoji,
            bluetoothDevice = device
        )

        upsertDevice(item)
    }

    private fun handleClassicDevice(device: BluetoothDevice, rssi: Int) {
        val mac = device.address ?: return
        val rawName = try { device.name } catch (e: SecurityException) { null }
        val cleanName = if (rawName.isNullOrBlank() || rawName.equals("Dispositivo Classico", ignoreCase = true) || rawName.equals("Unknown", ignoreCase = true)) null else rawName.trim()
        val customName = getSavedCustomName(mac)

        val btClass = try { device.bluetoothClass } catch (e: SecurityException) { null }
        val classification = dbManager.classifyDevice(
            name = cleanName,
            manufacturerId = null,
            manufacturerDataBytes = null,
            serviceUuids = null,
            scanRecordBytes = null,
            bluetoothClass = btClass,
            isBle = false
        )

        val item = DeviceItem(
            name = cleanName,
            customName = customName,
            address = mac,
            rssi = rssi,
            type = "Classic",
            category = classification.category,
            uuids = "Profilo BR/EDR Discovery",
            manufacturer = if (classification.brand != "N/D") classification.brand else "Standard Bluetooth",
            appearance = "BR/EDR",
            classificationType = classification.category,
            classificationBrand = classification.brand,
            classificationConfidence = classification.confidence,
            iconEmoji = classification.iconEmoji,
            bluetoothDevice = device
        )

        upsertDevice(item)
    }

    /**
     * Risolve il problema dello scambio/salto continuo dei dispositivi:
     * - I dispositivi già trovati rimangono ESATTAMENTE nella loro posizione (indice fisso).
     * - I nuovi dispositivi vengono accodati IN FONDO alla lista.
     * - Gli aggiornamenti UI sono debouncati/aggregati per evitare microscatti.
     */
    private fun upsertDevice(item: DeviceItem) {
        runOnUiThread {
            val index = rawDeviceList.indexOfFirst { it.address.equals(item.address, ignoreCase = true) }
            if (index >= 0) {
                // Aggiornamento in-place alla stessa identica posizione
                val existing = rawDeviceList[index]
                val updatedName = item.name ?: existing.name
                val updatedCustomName = item.customName ?: existing.customName
                rawDeviceList[index] = item.copy(
                    name = updatedName,
                    customName = updatedCustomName
                )
            } else {
                // Nuovo dispositivo: aggiunto in coda alla lista
                rawDeviceList.add(item)
            }
            scheduleUiUpdate()
        }
    }

    private fun scheduleUiUpdate() {
        if (!pendingUpdate) {
            pendingUpdate = true
            mainHandler.postDelayed(updateRunnable, 250)
        }
    }

    private fun syncDisplayList() {
        val filtered = rawDeviceList.filter { it.rssi >= minRssiThreshold }
        displayDeviceList.clear()
        displayDeviceList.addAll(filtered)
        adapter.notifyDataSetChanged()

        statusCountBadge.text = "${rawDeviceList.size} rilevati"
        listCountBadge.text = "${displayDeviceList.size}"
    }

    private fun selectTarget(device: DeviceItem) {
        val displayName = device.customName ?: device.name ?: "Sconosciuto"
        getSharedPreferences("itag_prefs", Context.MODE_PRIVATE).edit()
            .putString("target_mac", device.address)
            .putString("target_name", displayName)
            .putString("target_technology", device.type)
            .apply()

        Toast.makeText(this, "Target impostato: $displayName [${device.address}]", Toast.LENGTH_SHORT).show()

        updateTargetStatus()
        adapter.notifyDataSetChanged()

        // Avvia o notifica il servizio di tracking in background
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
                syncDisplayList()
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
        mainHandler.removeCallbacks(updateRunnable)
        try {
            unregisterReceiver(classicReceiver)
        } catch (e: Exception) {
            // Ignora
        }
    }
}
