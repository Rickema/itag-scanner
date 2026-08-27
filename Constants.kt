package com.example.itagscanner

object Constants {
    // Service UUID per FFE0 (16-bit)
    val SERVICE_UUID_FFE0: String = "0000ffe0-0000-1000-8000-00805f9b34fb"
    // Nome del dispositivo iTAG (opzionale)
    val DEVICE_NAME = "iTAG"
    // Soglia RSSI: -75 dBm significa "abbastanza vicino"
    const val RSSI_THRESHOLD = -75
    // Tempo di presenza prima di dichiarare "vicino" (ms)
    const val NEAR_DEBOUNCE_MS = 5000L
    // Tempo di assenza prima di dichiarare "lontano" (ms)
    const val FAR_DEBOUNCE_MS = 15000L
    // Azioni broadcast
    const val ACTION_NEAR = "com.example.itagscanner.ITAG_NEAR"
    const val ACTION_FAR = "com.example.itagscanner.ITAG_FAR"
}
