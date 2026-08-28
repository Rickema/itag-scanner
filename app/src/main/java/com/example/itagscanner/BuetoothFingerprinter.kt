package com.example.itagscanner

import android.bluetooth.le.ScanResult
import android.os.ParcelUuid

class BluetoothFingerprinter(private val db: DatabaseManager) {

    // Definizione dei Company ID conosciuti (mappati in db.companyIdMap)
    companion object {
        const val APPLE_ID = 0x004C
        const val SAMSUNG_ID = 0x0075
        const val GOOGLE_ID = 0x001D
        const val MICROSOFT_ID = 0x0006
        const val TILE_ID = 0x0131
        const val NORDIC_ID = 0x0059
        const val AMAZON_ID = 0x0157
    }

    data class Classification(
        val type: String,      // es. "Tracker", "Auricolari", "Smartwatch"
        val brand: String,     // es. "Apple", "Samsung", "Sconosciuto"
        val model: String,     // eventuale modello (es. "Fast Pair device")
        val confidence: Int    // 0..100
    )

    fun classify(result: ScanResult): Classification {
        var score = 0
        var type = "Sconosciuto"
        var brand = "Sconosciuto"
        var model = "N/D"

        val scanRecord = result.scanRecord ?: return Classification(type, brand, model, 0)

        // 1. Estrai Manufacturer ID e nome produttore
        val manufacturerData = scanRecord.manufacturerSpecificData
        var companyId: Int? = null
        if (manufacturerData != null && manufacturerData.size() > 0) {
            companyId = manufacturerData.keyAt(0)
            brand = db.getCompanyName(companyId) ?: "0x${companyId.toString(16).uppercase()}"
            score += 20
        }

        // 2. Estrai Service UUIDs
        val serviceUuids = scanRecord.serviceUuids?.map { it.uuid } ?: emptyList()
        val serviceNames = serviceUuids.map { uuid ->
            db.getServiceName(uuid.toString()) ?: uuid.toString()
        }

        // 3. Estrai Appearance
        val appearanceValue = extractAppearance(scanRecord)
        val appearanceName = if (appearanceValue != null) {
            db.getAppearanceName(appearanceValue)?.first ?: "N/D"
        } else "N/D"

        // 4. Regole di classificazione
        // 4a. Tracker generici: UUID FFE0 o manufacturer sconosciuto ma con UUID simile
        if (serviceUuids.any { it.toString().equals("0000ffe0-0000-1000-8000-00805f9b34fb", true) }) {
            type = "Tracker"
            score += 30
        }

        // 4b. Dispositivi audio: appearance o UUID audio
        val audioUuids = listOf(
            "0000110b-0000-1000-8000-00805f9b34fb", // A2DP
            "0000110e-0000-1000-8000-00805f9b34fb", // AVRCP
            "0000111e-0000-1000-8000-00805f9b34fb"  // HFP
        )
        if (appearanceValue != null && appearanceValue in 0x0080..0x00FF) {
            type = "Audio"
            score += 40
        } else if (serviceUuids.any { audioUuids.contains(it.toString()) }) {
            type = "Audio"
            score += 40
        }

        // 4c. Apple specifico
        if (companyId == APPLE_ID) {
            brand = "Apple"
            score += 10
            if (serviceUuids.any { it.toString().equals("0000fe2c-0000-1000-8000-00805f9b34fb", true) }) {
                type = "Fast Pair device"
                model = parseFastPairModelId(scanRecord)
                score += 50
            }
        }

        // 4d. Samsung specifico
        if (companyId == SAMSUNG_ID) {
            brand = "Samsung"
            score += 10
            if (serviceUuids.any { it.toString().startsWith("0000fd") }) {
                type = "SmartTag/Find"
                score += 40
            }
        }

        // 4e. Tile tracker
        if (companyId == TILE_ID) {
            brand = "Tile"
            type = "Tracker"
            score += 50
        }

        // 4f. Se appearance è nota, usala
        if (appearanceName != "N/D" && type == "Sconosciuto") {
            type = appearanceName
            score += 20
        }

        // Limita score a 100
        val finalScore = score.coerceAtMost(100)
        return Classification(type, brand, model, finalScore)
    }

    private fun extractAppearance(scanRecord: android.bluetooth.le.ScanRecord): Int? {
        val bytes = scanRecord.bytes
        var i = 0
        while (i < bytes.size) {
            val length = bytes[i].toInt() and 0xFF
            if (length == 0) break
            val type = bytes[i + 1].toInt() and 0xFF
            if (type == 0x19) { // GAP Appearance
                if (length >= 3) {
                    return (bytes[i + 2].toInt() and 0xFF) or
                           ((bytes[i + 3].toInt() and 0xFF) shl 8)
                }
            }
            i += length + 1
        }
        return null
    }

    private fun parseFastPairModelId(scanRecord: android.bluetooth.le.ScanRecord): String {
        val serviceData = scanRecord.serviceData
        val fastPairUuid = ParcelUuid.fromString("0000FE2C-0000-1000-8000-00805F9B34FB")
        val data = serviceData[fastPairUuid] ?: return "N/D"
        if (data.size < 3) return "N/D"
        return String.format("%02X:%02X:%02X", data[0], data[1], data[2])
    }
}