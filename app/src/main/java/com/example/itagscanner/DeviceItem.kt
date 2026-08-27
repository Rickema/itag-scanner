package com.example.itagscanner

data class DeviceItem(
    val name: String,
    val address: String,
    val rssi: Int,
    val type: String, // "BLE" o "Classic"
    val uuids: String, // UUID separati da virgola, se disponibili
    val manufacturer: String, // stringa descrittiva del produttore
    val scanResult: android.bluetooth.le.ScanResult? = null,
    val bluetoothDevice: android.bluetooth.BluetoothDevice? = null
)