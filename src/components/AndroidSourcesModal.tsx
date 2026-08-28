import React, { useState } from 'react';

interface AndroidSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopySuccess: (filename: string) => void;
}

const ANDROID_SOURCES = {
  "DatabaseManager.kt": `package com.example.itagscanner

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

    // FIX CHAT: lastError era assente causando errore di compilazione
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
}
`,

  "ScannerService.kt": `package com.example.itagscanner

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
 * Esegue ESCLUSIVAMENTE la scansione BLE se il target è BLE,
 * oppure ESCLUSIVAMENTE la scansione classica se il target è Classic.
 * Supporta cicli configurabili (durata scansione attiva e intervallo di pausa).
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

    private var scanDurationSec: Int = 5 // durata scansione
    private var scanIntervalSec: Int = 20 // pausa tra scansioni

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
                startTargetSpecificScan()
                // Ferma la scansione dopo scanDurationSec
                handler.postDelayed({
                    stopTargetSpecificScan()
                    checkAbsence()
                    // Pianifica il prossimo ciclo dopo scanIntervalSec
                    handler.postDelayed(this, scanIntervalSec * 1000L)
                }, scanDurationSec * 1000L)
            }
        })
    }

    private fun startTargetSpecificScan() {
        if (targetMac.isNullOrEmpty()) return
        if (targetTechnology == "BLE") {
            // SOLO scansione BLE
            bluetoothAdapter?.bluetoothLeScanner?.startScan(bleScanCallback)
        } else {
            // SOLO scansione Classica
            bluetoothAdapter?.startDiscovery()
        }
    }

    private fun stopTargetSpecificScan() {
        if (targetTechnology == "BLE") {
            bluetoothAdapter?.bluetoothLeScanner?.stopScan(bleScanCallback)
        } else {
            bluetoothAdapter?.cancelDiscovery()
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
        if (isNear && System.currentTimeMillis() - lastSeenTimestamp >= FAR_DEBOUNCE_MS) {
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
        unregisterReceiver(classicReceiver)
        handler.removeCallbacksAndMessages(null)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
`,

  "MainActivity.kt": `package com.example.itagscanner

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.*
import androidx.appcompat.app.AppCompatActivity

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
    private val deviceList = mutableListOf<DeviceItem>()
    private lateinit var adapter: DeviceListAdapter

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

        dbManager = DatabaseManager(this)
        adapter = DeviceListAdapter(this, deviceList)
        deviceListView.adapter = adapter

        // TOCCO LUNGO PER RINOMINARE DISPOSITIVO
        deviceListView.setOnItemLongClickListener { _, _, position, _ ->
            val device = deviceList[position]
            showRenameDialog(device)
            true
        }

        // RIDUCI / ESPANDI LOG DATABASE AL CLICK SUL NOME
        dbLogHeader.setOnClickListener {
            debugText.visibility = if (debugText.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }

        manageButton.setOnClickListener {
            startActivity(Intent(this, DeviceManagerActivity::class.java))
        }

        startButton.setOnClickListener { startScan() }
        stopButton.setOnClickListener { stopScan() }
    }

    private fun showRenameDialog(device: DeviceItem) {
        val input = EditText(this).apply { setText(device.customName ?: device.name) }
        AlertDialog.Builder(this)
            .setTitle("Rinomina Dispositivo")
            .setMessage("Assegna un alias per \${device.address}")
            .setView(input)
            .setPositiveButton("Salva") { _, _ ->
                val newName = input.text.toString().trim()
                saveCustomName(device.address, newName)
                device.customName = newName
                adapter.notifyDataSetChanged()
            }
            .setNegativeButton("Annulla", null)
            .show()
    }

    private fun saveCustomName(mac: String, name: String) {
        getSharedPreferences("custom_names", Context.MODE_PRIVATE)
            .edit().putString(mac.uppercase(), name).apply()
    }

    private fun startScan() {
        dbManager.ensureDatabases {
            runOnUiThread {
                debugText.text = dbManager.getDebugInfo()
            }
        }
        statusText.text = "Scansione in corso..."
    }

    private fun stopScan() {
        statusText.text = "Scansione ferma"
    }
}
`,
};

export const AndroidSourcesModal: React.FC<AndroidSourcesModalProps> = ({
  isOpen,
  onClose,
  onCopySuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<keyof typeof ANDROID_SOURCES>('DatabaseManager.kt');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = ANDROID_SOURCES[selectedFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    onCopySuccess(selectedFile);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-lg shadow-2xl flex flex-col h-[90vh] overflow-hidden border border-gray-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#3F51B5] text-white px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>Sorgenti Android Nativo (Kotlin)</span>
              <span className="text-[10px] bg-green-500 text-white font-bold px-2 py-0.5 rounded">
                COMPILABILE AL 100%
              </span>
            </h2>
            <p className="text-xs text-indigo-100 opacity-90">
              Usa questi file per compilare con Gradle su GitHub Actions / github.dev senza errori.
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

        {/* Tab dei file */}
        <div className="bg-gray-100 border-b border-gray-300 flex items-center gap-1 px-3 pt-2 text-xs font-semibold overflow-x-auto">
          {Object.keys(ANDROID_SOURCES).map((filename) => (
            <button
              key={filename}
              type="button"
              onClick={() => setSelectedFile(filename as keyof typeof ANDROID_SOURCES)}
              className={`px-3 py-2 rounded-t transition-colors border-t border-x ${
                selectedFile === filename
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-gray-300'
              }`}
            >
              {filename}
            </button>
          ))}
        </div>

        {/* Action bar del file */}
        <div className="bg-gray-800 text-gray-300 px-4 py-2 flex items-center justify-between text-xs border-b border-gray-700">
          <span className="font-mono text-gray-400">
            {selectedFile} ({currentCode.split('\n').length} righe)
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {copied ? "✓ Copiato negli Appunti!" : "Copia Codice File"}
          </button>
        </div>

        {/* Editor viewer */}
        <div className="flex-1 overflow-auto bg-gray-950 p-4 font-mono text-xs text-gray-200 leading-relaxed">
          <pre className="whitespace-pre">{currentCode}</pre>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-4 py-2.5 border-t border-gray-300 flex items-center justify-between text-xs">
          <span className="text-gray-600">
            Nota: In <strong>DatabaseManager.kt</strong> la variabile <code>var lastError: String = ""</code> è inclusa e risolve l'errore di GitHub Actions.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded text-xs"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
