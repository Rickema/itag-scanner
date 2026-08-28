package com.example.itagscanner

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.yaml.snakeyaml.Yaml
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

class DatabaseManager(private val context: Context) {

    companion object {
        private const val TAG = "DatabaseManager"
        private const val COMPANY_IDS_URL = "https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/company_identifiers/company_identifiers.yaml"
        private const val SERVICE_UUIDS_URL = "https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/service_uuids.yaml"
        private const val APPEARANCE_VALUES_URL = "https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/core/appearance_values.yaml"
        private const val CACHE_DIR = "db"
        private const val COMPANY_IDS_FILE = "company_ids.yaml"
        private const val SERVICE_UUIDS_FILE = "service_uuids.yaml"
        private const val APPEARANCE_VALUES_FILE = "appearance_values.yaml"
        private const val LAST_UPDATE_KEY = "last_db_update"
        private const val UPDATE_INTERVAL_MS = 30L * 24 * 60 * 60 * 1000 // 30 giorni
    }

    // Mappe in memoria
    var companyIdMap: Map<Int, String> = emptyMap()
        private set
    var serviceUuidMap: Map<String, String> = emptyMap()
        private set
    var appearanceMap: Map<Int, Pair<String, String>> = emptyMap()
        private set

    // Variabile per debug
    var lastError: String = ""
        private set

    /**
     * Verifica se i database devono essere aggiornati
     */
    private fun shouldUpdate(): Boolean {
        val prefs = context.getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
        val lastUpdate = prefs.getLong(LAST_UPDATE_KEY, 0)
        return System.currentTimeMillis() - lastUpdate > UPDATE_INTERVAL_MS
    }

    /**
     * Scarica un file da un URL e lo salva in destFile.
     * Restituisce true se il download è riuscito.
     */
    private suspend fun downloadFile(urlString: String, destFile: File): Boolean = withContext(Dispatchers.IO) {
        try {
            val url = URL(urlString)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            connection.instanceFollowRedirects = true
            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val input = connection.inputStream
                destFile.outputStream().use { output ->
                    input.copyTo(output)
                }
                connection.disconnect()
                true
            } else {
                Log.e(TAG, "Download fallito per $urlString: HTTP $responseCode")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Errore download $urlString: ${e.message}")
            false
        }
    }

    /**
     * Assicura che i file dei database esistano localmente.
     * Se non esistono o se è scaduto l'intervallo di aggiornamento, tenta il download.
     * Se il download fallisce, utilizza eventuali file già presenti.
     */
    suspend fun ensureDatabases() {
        lastError = ""
        val cacheDir = File(context.filesDir, CACHE_DIR)
        if (!cacheDir.exists()) cacheDir.mkdirs()

        val companyFile = File(cacheDir, COMPANY_IDS_FILE)
        val serviceFile = File(cacheDir, SERVICE_UUIDS_FILE)
        val appearanceFile = File(cacheDir, APPEARANCE_VALUES_FILE)

        if (shouldUpdate() || !companyFile.exists() || !serviceFile.exists() || !appearanceFile.exists()) {
            var downloaded = false
            try {
                if (!companyFile.exists() || shouldUpdate()) {
                    if (downloadFile(COMPANY_IDS_URL, companyFile)) downloaded = true
                    else lastError += "Download company fallito; "
                }
                if (!serviceFile.exists() || shouldUpdate()) {
                    if (downloadFile(SERVICE_UUIDS_URL, serviceFile)) downloaded = true
                    else lastError += "Download service fallito; "
                }
                if (!appearanceFile.exists() || shouldUpdate()) {
                    if (downloadFile(APPEARANCE_VALUES_URL, appearanceFile)) downloaded = true
                    else lastError += "Download appearance fallito; "
                }
            } catch (e: Exception) {
                lastError += "Eccezione: ${e.message}"
            }
            if (downloaded) {
                val prefs = context.getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
                prefs.edit().putLong(LAST_UPDATE_KEY, System.currentTimeMillis()).apply()
            }
        }

        // Carica i file in memoria (se presenti)
        loadMapsFromFiles(cacheDir)
    }

    /**
     * Legge i file YAML dalla cache e popola le mappe in memoria.
     */
    private fun loadMapsFromFiles(cacheDir: File) {
        // Company IDs
        val companyFile = File(cacheDir, COMPANY_IDS_FILE)
        if (companyFile.exists()) {
            try {
                val yaml = Yaml()
                val data = yaml.load<Map<String, Any>>(companyFile.inputStream())
                val list = data["company_identifiers"] as? List<Map<String, Any>> ?: emptyList()
                val map = mutableMapOf<Int, String>()
                for (entry in list) {
                    val value = entry["value"]?.toString()?.removePrefix("0x")?.toInt(16)
                    val name = entry["name"]?.toString()?.trim('\'') ?: continue
                    if (value != null) {
                        map[value] = name
                    }
                }
                companyIdMap = map
            } catch (e: Exception) {
                Log.e(TAG, "Errore parsing company_identifiers: ${e.message}")
                lastError += "Parsing company error: ${e.message}; "
            }
        } else {
            lastError += "File company non trovato; "
        }

        // Service UUIDs
        val serviceFile = File(cacheDir, SERVICE_UUIDS_FILE)
        if (serviceFile.exists()) {
            try {
                val yaml = Yaml()
                val data = yaml.load<Map<String, Any>>(serviceFile.inputStream())
                val list = data["uuids"] as? List<Map<String, Any>> ?: emptyList()
                val map = mutableMapOf<String, String>()
                for (entry in list) {
                    val uuidHex = entry["uuid"]?.toString()?.removePrefix("0x")?.uppercase() ?: continue
                    val name = entry["name"]?.toString() ?: continue
                    map[uuidHex] = name
                    if (uuidHex.length <= 4) {
                        val fullUuid = "0000${uuidHex.lowercase()}-0000-1000-8000-00805f9b34fb"
                        map[fullUuid] = name
                    }
                }
                serviceUuidMap = map
            } catch (e: Exception) {
                Log.e(TAG, "Errore parsing service_uuids: ${e.message}")
                lastError += "Parsing service error: ${e.message}; "
            }
        } else {
            lastError += "File service non trovato; "
        }

        // Appearance values
        val appearanceFile = File(cacheDir, APPEARANCE_VALUES_FILE)
        if (appearanceFile.exists()) {
            try {
                val yaml = Yaml()
                val data = yaml.load<Map<String, Any>>(appearanceFile.inputStream())
                val list = data["appearance_values"] as? List<Map<String, Any>> ?: emptyList()
                val map = mutableMapOf<Int, Pair<String, String>>()
                for (entry in list) {
                    val categoryHex = entry["category"]?.toString()?.removePrefix("0x")?.toInt(16) ?: continue
                    val name = entry["name"]?.toString() ?: continue
                    val subcategory = entry["subcategory"] as? List<Map<String, Any>>
                    val subName = if (subcategory != null && subcategory.isNotEmpty()) {
                        subcategory[0]["name"]?.toString() ?: ""
                    } else ""
                    map[categoryHex] = Pair(name, subName)
                }
                appearanceMap = map
            } catch (e: Exception) {
                Log.e(TAG, "Errore parsing appearance_values: ${e.message}")
                lastError += "Parsing appearance error: ${e.message}; "
            }
        } else {
            lastError += "File appearance non trovato; "
        }
    }

    /**
     * Restituisce una stringa con informazioni di debug sullo stato dei database.
     */
    fun getDebugInfo(): String {
        val cacheDir = File(context.filesDir, CACHE_DIR)
        val companyFile = File(cacheDir, COMPANY_IDS_FILE)
        val serviceFile = File(cacheDir, SERVICE_UUIDS_FILE)
        val appearanceFile = File(cacheDir, APPEARANCE_VALUES_FILE)

        return buildString {
            appendLine("Directory: ${cacheDir.absolutePath}")
            appendLine("Company file: esiste=${companyFile.exists()}, dimensione=${if (companyFile.exists()) companyFile.length() else 0} bytes")
            appendLine("Service file: esiste=${serviceFile.exists()}, dimensione=${if (serviceFile.exists()) serviceFile.length() else 0} bytes")
            appendLine("Appearance file: esiste=${appearanceFile.exists()}, dimensione=${if (appearanceFile.exists()) appearanceFile.length() else 0} bytes")
            appendLine("Company IDs caricati: ${companyIdMap.size}")
            appendLine("Service UUIDs caricati: ${serviceUuidMap.size}")
            appendLine("Appearance caricati: ${appearanceMap.size}")
            if (lastError.isNotEmpty()) {
                appendLine("Ultimo errore: $lastError")
            }
        }
    }

    /**
     * Restituisce il nome del produttore per un Company ID.
     */
    fun getCompanyName(companyId: Int): String? = companyIdMap[companyId]

    /**
     * Restituisce il nome del servizio per un UUID (breve o completo).
     */
    fun getServiceName(uuid: String): String? {
        val key = uuid.uppercase().removePrefix("0x")
        return serviceUuidMap[key] ?: serviceUuidMap["0000${key.lowercase()}-0000-1000-8000-00805f9b34fb"]
    }

    /**
     * Restituisce la coppia (categoria, sottocategoria) per un valore Appearance.
     */
    fun getAppearanceName(appearanceValue: Int): Pair<String, String>? = appearanceMap[appearanceValue]
}