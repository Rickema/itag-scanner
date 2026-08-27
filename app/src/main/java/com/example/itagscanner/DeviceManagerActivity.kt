package com.example.itagscanner

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.ListView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class DeviceManagerActivity : AppCompatActivity() {

    private lateinit var savedDeviceListView: ListView
    private lateinit var backButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_device_manager)

        savedDeviceListView = findViewById(R.id.savedDeviceListView)
        backButton = findViewById(R.id.backButton)

        backButton.setOnClickListener {
            finish()
        }

        // Carica i dispositivi salvati (per ora solo uno, ma possiamo estendere)
        // Implementazione futura: SharedPreferences contiene solo un target alla volta.
        // Per mostrare più dispositivi, dovremmo salvare una lista. Per semplicità, mostriamo quello attuale.
        val prefs = getSharedPreferences("itag_prefs", MODE_PRIVATE)
        val name = prefs.getString("target_name", null)
        val mac = prefs.getString("target_mac", null)
        val uuid = prefs.getString("target_uuid", null)
        val isSet = prefs.getBoolean("target_set", false)

        if (isSet && mac != null) {
            val info = "Nome: ${name ?: "N/D"}\nMAC: $mac\nUUID: ${uuid ?: "N/D"}"
            Toast.makeText(this, info, Toast.LENGTH_LONG).show()
            // Qui potresti mostrare una lista con un solo elemento
        } else {
            Toast.makeText(this, "Nessun dispositivo salvato", Toast.LENGTH_SHORT).show()
        }
    }
}