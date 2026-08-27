package com.example.itagscanner

data class DeviceItem(
    val name: String,
    val address: String,
    val rssi: Int,
    val type: String,          // "BLE" o "Classic"
    val category: String,      // es. "Audio", "Wearable", "Phone", "Computer", "Tracker", "N/D"
    val uuids: String,         // UUID o service names
    val manufacturer: String,  // produttore
    val scanResult: android.bluetooth.le.ScanResult? = null,
    val bluetoothDevice: android.bluetooth.BluetoothDevice? = null
)