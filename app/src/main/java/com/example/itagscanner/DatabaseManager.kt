package com.example.itagscanner

import android.bluetooth.BluetoothClass
import android.content.Context
import android.os.ParcelUuid
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

data class ClassificationResult(
    val category: String,
    val brand: String,
    val confidence: Int
)

class DatabaseManager(private val context: Context) {

    val companyIdMap = mutableMapOf<Int, String>()
    val serviceUuidMap = mutableMapOf<String, String>()
    val appearanceMap = mutableMapOf<Int, Pair<String, String>>()

    var lastError: String = ""
    private var isInitialized = false

    private val executor = Executors.newSingleThreadExecutor()

    init {
        loadEmbeddedDatabase()
        loadCachedDatabase()
    }

    private fun loadEmbeddedDatabase() {
        // Registro Esteso Bluetooth SIG Produttori (Comprensivo globale)
        val defaultCompanies = mapOf(
            0x004C to "Apple, Inc.",
            0x0075 to "Samsung Electronics Co. Ltd.",
            0x0006 to "Microsoft Corporation",
            0x00E0 to "Google LLC",
            0x000D to "Texas Instruments",
            0x0059 to "Nordic Semiconductor ASA",
            0x012D to "Sony Corporation",
            0x027D to "Huawei Technologies Co., Ltd.",
            0x038F to "Xiaomi Inc.",
            0x009E to "Bose Corporation",
            0x0057 to "Harman International Industries (JBL)",
            0x0157 to "Anker Innovations (Soundcore)",
            0x0131 to "Tile, Inc.",
            0x0087 to "Garmin International, Inc.",
            0x02E5 to "Espressif Systems (ESP32)",
            0x07F6 to "Etekcity Corporation (Smart Home)",
            0x07D7 to "Tuya Global Inc.",
            0x0211 to "Telink Semiconductor",
            0x0380 to "Beken Corporation",
            0x001D to "Qualcomm Technologies",
            0x000A to "Qualcomm Atheros",
            0x005D to "Realtek Semiconductor Corp.",
            0x0046 to "MediaTek, Inc.",
            0x002B to "Silicon Laboratories",
            0x00D2 to "Dialog Semiconductor",
            0x01DA to "Logitech Europe S.A.",
            0x0167 to "Lenovo",
            0x08E1 to "Oppo Mobile",
            0x08A9 to "Vivo Mobile",
            0x077F to "OnePlus Technology",
            0x0A2B to "Realme Mobile",
            0x05EC to "Huami / Zepp / Amazfit",
            0x0499 to "Ruuvi Innovations",
            0x0024 to "Philips Electronics",
            0x0546 to "Sennheiser Electronic",
            0x0368 to "Skullcandy Inc.",
            0x083F to "Marshall Amplification",
            0x00C7 to "ASUSTek Computer Inc.",
            0x0100 to "Fossil Group, Inc.",
            0x0113 to "Beats Electronics (Apple)",
            0x019A to "Fitbit, Inc. (Google)",
            0x02FF to "Lenze Technology (iTAG Keyfinder)",
            0x0001 to "Nokia Mobile Phones",
            0x0002 to "Intel Corp.",
            0x0003 to "IBM Corp.",
            0x0004 to "Toshiba Corp.",
            0x000A to "Hewlett-Packard (HP)",
            0x001A to "Motorola Mobility LLC",
            0x002A to "Seiko Epson Corporation",
            0x0033 to "Parrot SA",
            0x0040 to "Belkin International, Inc.",
            0x0047 to "Broadcom Corporation",
            0x0056 to "Polar Electro Oy",
            0x0060 to "Plantronics (Poly)",
            0x006B to "TomTom International BV",
            0x0080 to "Suunto Oy",
            0x00B5 to "LG Electronics",
            0x00D0 to "Canon Inc.",
            0x00E2 to "Panasonic Corporation",
            0x00F0 to "Sharp Corporation",
            0x00FE to "Nintendo Co., Ltd.",
            0x0104 to "Pioneer Corporation",
            0x012B to "Jabra (GN Audio A/S)",
            0x013B to "Bang & Olufsen A/S",
            0x0141 to "Razer Inc.",
            0x0171 to "SteelSeries ApS",
            0x01AB to "YAMAHA Corporation",
            0x01F0 to "Kenwood Corporation",
            0x020B to "Alpine Electronics, Inc.",
            0x021E to "Texas Instruments Inc.",
            0x0245 to "Nut / Dyneing (Beacon)",
            0x02A3 to "Chipolo d.o.o.",
            0x031B to "Zebra Technologies",
            0x0399 to "Honeywell International",
            0x0426 to "Polaroid Corporation",
            0x04C0 to "Sonos, Inc.",
            0x0529 to "Insta360",
            0x061D to "GoPro, Inc.",
            0x06A1 to "DJI Technology Co., Ltd."
        )
        companyIdMap.putAll(defaultCompanies)

        // Servizi standard Bluetooth SIG & Profili Proprieta
        val defaultServices = mapOf(
            "1800" to "Generic Access",
            "1801" to "Generic Attribute",
            "1802" to "Immediate Alert (iTAG Anti-Loss)",
            "1803" to "Link Loss (iTAG Anti-Loss)",
            "1804" to "Tx Power Level",
            "1805" to "Current Time Service",
            "1808" to "Glucose Service",
            "1809" to "Health Thermometer",
            "180A" to "Device Information",
            "180D" to "Heart Rate (Frequenza Cardiaca)",
            "180E" to "Phone Alert Status",
            "180F" to "Battery Service (Livello Batteria)",
            "1810" to "Blood Pressure",
            "1811" to "Alert Notification",
            "1812" to "Human Interface Device (HID)",
            "1814" to "Running Speed & Cadence",
            "1816" to "Cycling Speed & Cadence",
            "181A" to "Environmental Sensing (Meteo/Sensori)",
            "181C" to "User Data Service",
            "1826" to "Fitness Machine",
            "110A" to "Audio Source (A2DP)",
            "110B" to "Audio Sink (Cuffie / Speaker)",
            "110C" to "A/V Remote Control (AVRCP)",
            "110E" to "AVRCP Target",
            "111E" to "Handsfree Profile (HFP)",
            "1124" to "HID Profile (Tastiera/Mouse)",
            "FE9F" to "Google Fast Pair Service",
            "FEAA" to "Google Eddystone Beacon",
            "FEED" to "Tile Tracker Service",
            "FD5A" to "Samsung SmartThings / SmartTag",
            "FD69" to "Samsung Galaxy Buds",
            "FD6F" to "Exposure Notification",
            "FFE0" to "iTAG / Anti-Lost Serial",
            "FFE1" to "iTAG Alert Button",
            "FE2C" to "Fast Pair Audio",
            "FCF1" to "Google Nearby",
            "FD22" to "Huawei Fast Connect"
        )
        for ((k, v) in defaultServices) {
            serviceUuidMap[k.lowercase()] = v
            serviceUuidMap["0000${k.lowercase()}-0000-1000-8000-00805f9b34fb"] = v
        }

        // Aspetti GAP (Appearance)
        val defaultAppearances = mapOf(
            0 to Pair("Sconosciuto", "Dispositivo generico"),
            64 to Pair("Smartphone", "Telefono generico"),
            128 to Pair("Computer", "PC Desktop/Laptop"),
            192 to Pair("Smartwatch", "Orologio generico"),
            193 to Pair("Smartwatch", "Orologio sportivo"),
            256 to Pair("Termometro", "Sensore temperatura"),
            512 to Pair("Tracker / Tag", "Beacon trova-oggetti"),
            513 to Pair("Tracker / iTAG", "Portachiavi anti-smarrimento"),
            576 to Pair("Scanner", "Lettore barcode"),
            832 to Pair("Sensore Cardio", "Fascia cardiaca"),
            960 to Pair("Periferica HID", "Input generico"),
            961 to Pair("Tastiera", "Tastiera wireless"),
            962 to Pair("Mouse", "Mouse / Puntamento"),
            963 to Pair("Joystick", "Leva da gioco"),
            964 to Pair("Gamepad", "Controller wireless"),
            2048 to Pair("Audio", "Ricevitore audio generico"),
            2049 to Pair("Altoparlante", "Speaker wireless"),
            2050 to Pair("Soundbar", "Cassa TV/Audio"),
            2064 to Pair("Cuffie", "Cuffie sovraurali"),
            2065 to Pair("Headset", "Cuffie con microfono"),
            2066 to Pair("Auricolari", "Auricolari TWS in-ear"),
            3264 to Pair("Bilancia", "Bilancia smart pesapersone")
        )
        appearanceMap.putAll(defaultAppearances)

        isInitialized = true
    }

    private fun loadCachedDatabase() {
        try {
            val prefs = context.getSharedPreferences("sig_database_cache", Context.MODE_PRIVATE)
            
            val compStr = prefs.getString("companies_json", null)
            if (compStr != null) {
                val jsonArray = JSONArray(compStr)
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val code = obj.optInt("code", -1)
                    val name = obj.optString("name", "")
                    if (code >= 0 && name.isNotEmpty()) {
                        companyIdMap[code] = name
                    }
                }
            }
            
            val appStr = prefs.getString("appearance_json", null)
            if (appStr != null) {
                val jsonArray = JSONArray(appStr)
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val code = obj.optInt("code", -1)
                    val name = obj.optString("name", "")
                    if (code >= 0 && name.isNotEmpty()) {
                        appearanceMap[code] = Pair(name, "")
                    }
                }
            }

            val uuidStr = prefs.getString("services_json", null)
            if (uuidStr != null) {
                val jsonArray = JSONArray(uuidStr)
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val uuid = obj.optString("uuid", "")
                    val name = obj.optString("name", "")
                    if (uuid.isNotEmpty() && name.isNotEmpty()) {
                        serviceUuidMap[uuid] = name
                    }
                }
            }
            
        } catch (e: Exception) {
            Log.e("DatabaseManager", "Errore caricamento cache SIG: ${e.message}")
        }
    }

    /**
     * Esegue il download reale dei database YAML di Bluetooth SIG dal repository Bitbucket
     */
    fun forceRefreshDatabases(onProgress: (String) -> Unit, onComplete: (Boolean) -> Unit) {
        executor.execute {
            try {
                val prefs = context.getSharedPreferences("sig_database_cache", Context.MODE_PRIVATE)
                
                onProgress("Avvio connessione a Bitbucket Bluetooth SIG...\n")
                
                onProgress("Scaricamento company_identifiers.yaml...\n")
                val compUrl = "https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/company_identifiers/company_identifiers.yaml"
                val compConnection = URL(compUrl).openConnection() as HttpURLConnection
                compConnection.connectTimeout = 5000
                compConnection.readTimeout = 10000
                val compStr = compConnection.inputStream.bufferedReader().use { it.readText() }
                
                val compRegex = Regex("- value:\\s*0x([0-9a-fA-F]+)\\s*name:\\s*['\"]?([^'\"\\n]+)['\"]?")
                val compJsonArray = JSONArray()
                var compCount = 0
                compRegex.findAll(compStr).forEach {
                    val hex = it.groupValues[1].toIntOrNull(16)
                    val name = it.groupValues[2].trim()
                    if (hex != null) {
                        companyIdMap[hex] = name
                        compCount++
                        val obj = JSONObject()
                        obj.put("code", hex)
                        obj.put("name", name)
                        compJsonArray.put(obj)
                    }
                }
                onProgress("Parsing $compCount identificatori azienda completato.\n")
                
                onProgress("Scaricamento appearance_values.yaml...\n")
                val appUrl = "https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/core/appearance_values.yaml"
                val appConnection = URL(appUrl).openConnection() as HttpURLConnection
                appConnection.connectTimeout = 5000
                appConnection.readTimeout = 10000
                val appStr = appConnection.inputStream.bufferedReader().use { it.readText() }
                
                val appRegex = Regex("- category:\\s*0x([0-9a-fA-F]+)\\s*name:\\s*['\"]?([^'\"\\n]+)['\"]?")
                var appCount = 0
                val appJsonArray = JSONArray()
                appRegex.findAll(appStr).forEach {
                    val hex = it.groupValues[1].toIntOrNull(16)
                    val name = it.groupValues[2].trim()
                    if (hex != null) {
                        appearanceMap[hex] = Pair(name, "")
                        appCount++
                        val obj = JSONObject()
                        obj.put("code", hex)
                        obj.put("name", name)
                        appJsonArray.put(obj)
                    }
                }
                onProgress("Parsing $appCount valori GAP completato.\n")
                
                onProgress("Scaricamento service_uuids.yaml...\n")
                val uuidUrl = "https://bitbucket.org/bluetooth-SIG/public/raw/main/assigned_numbers/uuids/service_uuids.yaml"
                val uuidConnection = URL(uuidUrl).openConnection() as HttpURLConnection
                uuidConnection.connectTimeout = 5000
                uuidConnection.readTimeout = 10000
                val uuidStr = uuidConnection.inputStream.bufferedReader().use { it.readText() }
                
                val uuidRegex = Regex("- uuid:\\s*0x([0-9a-fA-F]+)\\s*name:\\s*['\"]?([^'\"\\n]+)['\"]?")
                var uuidCount = 0
                val uuidJsonArray = JSONArray()
                uuidRegex.findAll(uuidStr).forEach {
                    val hexStr = it.groupValues[1].padStart(4, '0').lowercase()
                    val name = it.groupValues[2].trim()
                    serviceUuidMap[hexStr] = name
                    uuidCount++
                    val obj = JSONObject()
                    obj.put("uuid", hexStr)
                    obj.put("name", name)
                    uuidJsonArray.put(obj)
                }
                onProgress("Parsing $uuidCount UUID completato.\n")
                
                prefs.edit()
                    .putString("companies_json", compJsonArray.toString())
                    .putString("appearance_json", appJsonArray.toString())
                    .putString("services_json", uuidJsonArray.toString())
                    .putLong("last_update", System.currentTimeMillis())
                    .apply()
                    
                onProgress("Salvataggio in cache completato.\nDatabase SIG Offline Pronto.")
                onComplete(true)
            } catch (e: Exception) {
                onProgress("Errore durante l'aggiornamento: ${e.message}\n")
                onComplete(false)
            }
        }
    }

    fun ensureDatabases(callback: () -> Unit) {
        lastError = ""
        executor.execute {
            if (!isInitialized) {
                loadEmbeddedDatabase()
            }
            callback()
        }
    }

    fun getCompanyName(companyId: Int): String? {
        return companyIdMap[companyId]
    }

    fun getServiceDescription(uuidStr: String): String {
        val clean = uuidStr.trim().lowercase()
        serviceUuidMap[clean]?.let { return it }
        if (clean.length >= 8 && clean.startsWith("0000") && clean.contains("-1000-8000-00805f9b34fb")) {
            val shortPart = clean.substring(4, 8)
            serviceUuidMap[shortPart]?.let { return it }
        }
        if (clean.length == 4) {
            serviceUuidMap[clean]?.let { return it }
        }
        return uuidStr
    }

    fun getAppearanceName(appearanceCode: Int): Pair<String, String>? {
        return appearanceMap[appearanceCode]
    }

    /**
     * Motore di Fingerprinting avanzato globale senza emoji
     */
    fun classifyDevice(
        name: String?,
        manufacturerId: Int?,
        manufacturerDataBytes: ByteArray?,
        serviceUuids: List<ParcelUuid>?,
        scanRecordBytes: ByteArray?,
        bluetoothClass: BluetoothClass?,
        isBle: Boolean,
        isBonded: Boolean = false
    ): ClassificationResult {
        val lowerName = (name ?: "").trim().lowercase()
        val mfgName = manufacturerId?.let { companyIdMap[it] }
        val uuidStrings = serviceUuids?.map { it.uuid.toString().lowercase() } ?: emptyList()

        var bondedSuffix = if (isBonded) " [Associato nel Telefono]" else ""
        var baseConfidence = if (isBonded) 99 else 85

        // 1. CLASSE DI DISPOSITIVO BLUETOOTH CLASSICO
        if (bluetoothClass != null) {
            val deviceClass = bluetoothClass.deviceClass
            val majorClass = bluetoothClass.majorDeviceClass

            when (majorClass) {
                BluetoothClass.Device.Major.AUDIO_VIDEO -> {
                    val sub = when (deviceClass) {
                        BluetoothClass.Device.AUDIO_VIDEO_LOUDSPEAKER -> "Speaker / Cassa Audio"
                        BluetoothClass.Device.AUDIO_VIDEO_HEADPHONES -> "Cuffie Over-Ear"
                        BluetoothClass.Device.AUDIO_VIDEO_WEARABLE_HEADSET -> "Auricolari TWS"
                        BluetoothClass.Device.AUDIO_VIDEO_HANDSFREE -> "Kit Vivavoce"
                        else -> "Audio / Speaker"
                    }
                    return ClassificationResult(
                        category = "$sub$bondedSuffix",
                        brand = mfgName ?: "Dispositivo Audio",
                        confidence = baseConfidence
                    )
                }
                BluetoothClass.Device.Major.PHONE -> {
                    return ClassificationResult(
                        category = "Smartphone / Cellulare$bondedSuffix",
                        brand = mfgName ?: "Smartphone",
                        confidence = baseConfidence
                    )
                }
                BluetoothClass.Device.Major.COMPUTER -> {
                    return ClassificationResult(
                        category = "Computer / PC / Notebook$bondedSuffix",
                        brand = mfgName ?: "Computer",
                        confidence = baseConfidence
                    )
                }
                BluetoothClass.Device.Major.PERIPHERAL -> {
                    val sub = if (deviceClass == BluetoothClass.Device.PERIPHERAL_POINTING) "Mouse" else "Tastiera / Periferica"
                    return ClassificationResult(
                        category = "Periferica ($sub)$bondedSuffix",
                        brand = mfgName ?: "Accessorio PC",
                        confidence = baseConfidence
                    )
                }
                BluetoothClass.Device.Major.WEARABLE -> {
                    return ClassificationResult(
                        category = "Smartwatch / Smartband$bondedSuffix",
                        brand = mfgName ?: "Wearable",
                        confidence = baseConfidence
                    )
                }
            }
        }

        // 2. TRACKER / ITAG / BEACON TROVA-OGGETTI
        val isItagAlertService = uuidStrings.any {
            it.contains("1802") || it.contains("1803") || it.contains("ffe0")
        }
        val isItagName = lowerName.contains("itag") || lowerName.contains("keyfinder") ||
                lowerName.contains("anti-lost") || lowerName.contains("nut") ||
                lowerName.contains("beacon") || lowerName.contains("tracker") ||
                lowerName.contains("cube")

        if (isItagAlertService || isItagName) {
            val brand = when {
                manufacturerId == 0x02FF -> "Lenze (iTAG Originale)"
                manufacturerId == 0x0211 -> "Telink (iTAG)"
                manufacturerId == 0x0380 -> "Beken (iTAG)"
                mfgName != null -> mfgName
                else -> "Tracker / iTAG"
            }
            return ClassificationResult(
                category = "Tracker / Portachiavi (iTAG)$bondedSuffix",
                brand = brand,
                confidence = 98
            )
        }

        // Apple AirTag / Dov'è
        if (manufacturerId == 0x004C) {
            if (lowerName.contains("airtag") || (manufacturerDataBytes != null && manufacturerDataBytes.size >= 2 && manufacturerDataBytes[0].toInt() == 0x12)) {
                return ClassificationResult(
                    category = "Tracker (Apple AirTag / Dov'è)$bondedSuffix",
                    brand = "Apple, Inc.",
                    confidence = 98
                )
            }
            if (lowerName.contains("airpods") || lowerName.contains("beats")) {
                return ClassificationResult(
                    category = "Auricolari Apple (AirPods)$bondedSuffix",
                    brand = "Apple, Inc.",
                    confidence = 98
                )
            }
            if (lowerName.contains("iphone") || lowerName.contains("ipad")) {
                return ClassificationResult(
                    category = "Smartphone / Tablet (Apple)$bondedSuffix",
                    brand = "Apple, Inc.",
                    confidence = 95
                )
            }
            if (lowerName.contains("macbook") || lowerName.contains("imac")) {
                return ClassificationResult(
                    category = "Computer (Mac)$bondedSuffix",
                    brand = "Apple, Inc.",
                    confidence = 95
                )
            }
        }

        // Samsung SmartTag / Galaxy Buds / Smartphone
        if (manufacturerId == 0x0075 || lowerName.contains("galaxy") || lowerName.contains("samsung")) {
            if (lowerName.contains("smarttag") || uuidStrings.any { it.contains("fd5a") }) {
                return ClassificationResult(
                    category = "Tracker (Samsung SmartTag)$bondedSuffix",
                    brand = "Samsung Electronics",
                    confidence = 98
                )
            }
            if (lowerName.contains("buds") || uuidStrings.any { it.contains("fd69") }) {
                return ClassificationResult(
                    category = "Auricolari (Samsung Galaxy Buds)$bondedSuffix",
                    brand = "Samsung Electronics",
                    confidence = 98
                )
            }
            if (lowerName.contains("watch")) {
                return ClassificationResult(
                    category = "Smartwatch (Galaxy Watch)$bondedSuffix",
                    brand = "Samsung Electronics",
                    confidence = 95
                )
            }
            if (lowerName.contains("galaxy") || lowerName.contains("s2") || lowerName.contains("a5") || lowerName.contains("tab")) {
                return ClassificationResult(
                    category = "Smartphone (Samsung Galaxy)$bondedSuffix",
                    brand = "Samsung Electronics",
                    confidence = 92
                )
            }
        }

        // Tile Tracker
        if (manufacturerId == 0x0131 || lowerName.contains("tile") || uuidStrings.any { it.contains("feed") }) {
            return ClassificationResult(
                category = "Tracker (Tile)$bondedSuffix",
                brand = "Tile, Inc.",
                confidence = 98
            )
        }

        // 3. AURICOLARI / CUFFIE / SPEAKER / AUDIO TWS
        val isAudioService = uuidStrings.any {
            it.contains("110b") || it.contains("110a") || it.contains("110c") ||
                    it.contains("111e") || it.contains("fe9f") || it.contains("fe2c")
        }
        val isAudioName = lowerName.contains("buds") || lowerName.contains("headphones") ||
                lowerName.contains("earphones") || lowerName.contains("headset") ||
                lowerName.contains("soundcore") || lowerName.contains("jbl") ||
                lowerName.contains("wh-") || lowerName.contains("wf-") ||
                lowerName.contains("speaker") || lowerName.contains("cuffie") ||
                lowerName.contains("auricolari") || lowerName.contains("tws") ||
                lowerName.contains("soundbar") || lowerName.contains("audio")

        if (isAudioService || isAudioName) {
            return ClassificationResult(
                category = "Auricolari / Cuffie / Speaker (Audio Wireless)$bondedSuffix",
                brand = mfgName ?: "Audio Wireless",
                confidence = 92
            )
        }

        // 4. SMARTWATCH / FITNESS BAND
        val isFitnessService = uuidStrings.any {
            it.contains("180d") || it.contains("1814") || it.contains("1816") || it.contains("1826")
        }
        val isWatchName = lowerName.contains("watch") || lowerName.contains("band") ||
                lowerName.contains("garmin") || lowerName.contains("amazfit") ||
                lowerName.contains("fitbit") || lowerName.contains("polar") ||
                lowerName.contains("suunto")

        if (isFitnessService || isWatchName) {
            return ClassificationResult(
                category = "Smartwatch / Smartband (Fitness)$bondedSuffix",
                brand = mfgName ?: "Wearable",
                confidence = 92
            )
        }

        // 5. SMARTPHONE / TABLET
        val isPhoneName = lowerName.contains("redmi") || lowerName.contains("xiaomi") ||
                lowerName.contains("pixel") || lowerName.contains("oneplus") ||
                lowerName.contains("huawei") || lowerName.contains("honor") ||
                lowerName.contains("poco") || lowerName.contains("motorola") ||
                lowerName.contains("oppo") || lowerName.contains("vivo")

        if (isPhoneName) {
            return ClassificationResult(
                category = "Smartphone / Tablet$bondedSuffix",
                brand = mfgName ?: "Smartphone",
                confidence = 90
            )
        }

        // 6. COMPUTER / NOTEBOOK
        val isComputerName = lowerName.startsWith("desktop-") || lowerName.startsWith("laptop-") ||
                lowerName.contains("thinkpad") || lowerName.contains("notebook") ||
                lowerName.contains("surface")

        if (manufacturerId == 0x0006 || isComputerName) {
            return ClassificationResult(
                category = "Computer / PC / Notebook$bondedSuffix",
                brand = mfgName ?: "Microsoft / PC",
                confidence = 92
            )
        }

        // 7. SMART HOME & DISPOSITIVI IOT
        if (manufacturerId == 0x07F6 || lowerName.startsWith("caf-") || lowerName.contains("etekcity")) {
            return ClassificationResult(
                category = "Smart Home / Bilancia (Etekcity)$bondedSuffix",
                brand = "Etekcity Corporation",
                confidence = 92
            )
        }

        if (manufacturerId == 0x02E5 || lowerName.contains("esp32") || lowerName.contains("sonoff")) {
            return ClassificationResult(
                category = "Dispositivo IoT / Microcontroller (ESP32)$bondedSuffix",
                brand = "Espressif Systems",
                confidence = 95
            )
        }

        if (uuidStrings.any { it.contains("181a") }) {
            return ClassificationResult(
                category = "Sensore Smart Home (Meteo / Ambiente)$bondedSuffix",
                brand = mfgName ?: "Sensore Ambientale",
                confidence = 88
            )
        }

        // 8. PERIFERICHE HID
        if (uuidStrings.any { it.contains("1812") } || lowerName.contains("mouse") || lowerName.contains("keyboard") || lowerName.contains("gamepad")) {
            return ClassificationResult(
                category = "Periferica (Tastiera/Mouse/Gamepad)$bondedSuffix",
                brand = mfgName ?: "Accessorio",
                confidence = 90
            )
        }

        // 9. FALLBACK CON PRODUTTORE NOTO
        if (mfgName != null && mfgName != "N/D") {
            return ClassificationResult(
                category = "Dispositivo $mfgName$bondedSuffix",
                brand = mfgName,
                confidence = if (isBonded) 99 else 70
            )
        }

        // 10. DISPOSITIVO SCONOSCIUTO
        return ClassificationResult(
            category = if (isBonded) "Dispositivo Associato$bondedSuffix" else "Dispositivo Sconosciuto",
            brand = "N/D",
            confidence = if (isBonded) 95 else 30
        )
    }

    fun getDebugInfo(): String {
        val prefs = context.getSharedPreferences("sig_database_cache", Context.MODE_PRIVATE)
        val lastUpdate = prefs.getLong("last_update", 0L)
        val dateStr = if (lastUpdate > 0L) {
            val format = java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", java.util.Locale.getDefault())
            format.format(java.util.Date(lastUpdate))
        } else {
            "Mai aggiornato"
        }
        
        return "Database SIG Offline Integrato: ${companyIdMap.size} Produttori, ${serviceUuidMap.size / 2} Servizi UUID, ${appearanceMap.size} Aspetti GAP.\n" +
               "Ultimo aggiornamento da server: $dateStr\n" +
               "Stato Fingerprinting: PRONTO E ATTIVO."
    }
}
