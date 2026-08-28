package com.example.itagscanner

import android.bluetooth.BluetoothDevice

data class DeviceItem(
    val name: String?,
    var customName: String? = null,
    val address: String,
    val rssi: Int,
    val type: String, // "BLE" oppure "Classic"
    val category: String,
    val uuids: String,
    val manufacturer: String,
    val appearance: String,
    val modelId: String? = null,
    val classificationType: String = "BLE",
    val classificationBrand: String = "Sconosciuto",
    val classificationConfidence: Int = 50,
    val bluetoothDevice: BluetoothDevice? = null
)
