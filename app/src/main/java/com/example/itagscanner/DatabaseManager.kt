package com.example.itagscanner

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

    // Variabile per diagnosticare errori di download o parsing
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
                lastError = "HTTP ${conn.responseCode} per $urlStr"
                null
            }
        } catch (e: Exception) {
            lastError = "Errore download: ${e.message}"
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
                lastError = "Errore parse company: ${e.message}"
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
                                val fullUuid = "0000${uuidHex.lowercase()}-0000-1000-8000-00805f9b34fb"
                                serviceUuidMap[fullUuid] = name
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                lastError = "Errore parse service: ${e.message}"
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
                lastError = "Errore parse appearance: ${e.message}"
            }
        }
    }

    fun getDebugInfo(): String {
        val lines = mutableListOf<String>()
        lines.add("Directory: ${dbDir.absolutePath}")
        lines.add("Company file: esiste=${companyFile.exists()}, dimensione=${companyFile.length()} bytes")
        lines.add("Service file: esiste=${serviceFile.exists()}, dimensione=${serviceFile.length()} bytes")
        lines.add("Appearance file: esiste=${appearanceFile.exists()}, dimensione=${appearanceFile.length()} bytes")
        lines.add("Company IDs caricati: ${companyIdMap.size}")
        lines.add("Service UUIDs caricati: ${serviceUuidMap.size}")
        lines.add("Appearance caricati: ${appearanceMap.size}")
        if (lastError.isNotEmpty()) {
            lines.add("Ultimo errore: $lastError")
        }
        return lines.joinToString("\n")
    }

    fun getCompanyName(companyId: Int): String? = companyIdMap[companyId]
    fun getServiceName(uuid: String): String? = serviceUuidMap[uuid.uppercase().removePrefix("0X")] ?: serviceUuidMap[uuid.lowercase()]
    fun getAppearanceName(appearanceValue: Int): Pair<String, String>? = appearanceMap[appearanceValue]
}
