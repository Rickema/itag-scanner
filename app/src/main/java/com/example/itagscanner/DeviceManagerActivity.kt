package com.example.itagscanner

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class DeviceManagerActivity : AppCompatActivity() {

    private lateinit var targetNameText: TextView
    private lateinit var targetMacText: TextView
    private lateinit var targetTechText: TextView
    private lateinit var durationSeekBar: SeekBar
    private lateinit var durationLabel: TextView
    private lateinit var intervalSeekBar: SeekBar
    private lateinit var intervalLabel: TextView
    private lateinit var unpairButton: Button
    private lateinit var restartServiceButton: Button
    private lateinit var testNearButton: Button
    private lateinit var testFarButton: Button

    private var scanDurationSec = 5
    private var scanIntervalSec = 20

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_device_manager)

        targetNameText = findViewById(R.id.targetNameText)
        targetMacText = findViewById(R.id.targetMacText)
        targetTechText = findViewById(R.id.targetTechText)
        durationSeekBar = findViewById(R.id.durationSeekBar)
        durationLabel = findViewById(R.id.durationLabel)
        intervalSeekBar = findViewById(R.id.intervalSeekBar)
        intervalLabel = findViewById(R.id.intervalLabel)
        unpairButton = findViewById(R.id.unpairButton)
        restartServiceButton = findViewById(R.id.restartServiceButton)
        testNearButton = findViewById(R.id.testNearButton)
        testFarButton = findViewById(R.id.testFarButton)

        loadTargetData()

        durationSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                scanDurationSec = Math.max(2, progress)
                durationLabel.text = "Durata scansione attiva: $scanDurationSec secondi"
                saveCycleSettings()
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        intervalSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                scanIntervalSec = Math.max(5, progress)
                intervalLabel.text = "Intervallo di pausa: $scanIntervalSec secondi"
                saveCycleSettings()
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        unpairButton.setOnClickListener {
            getSharedPreferences("itag_prefs", Context.MODE_PRIVATE).edit()
                .remove("target_mac")
                .remove("target_name")
                .remove("target_technology")
                .apply()

            stopService(Intent(this, ScannerService::class.java))
            Toast.makeText(this, "Target dissociato", Toast.LENGTH_SHORT).show()
            loadTargetData()
        }

        restartServiceButton.setOnClickListener {
            val serviceIntent = Intent(this, ScannerService::class.java)
            stopService(serviceIntent)
            startService(serviceIntent)
            Toast.makeText(this, "Servizio di tracking riavviato con i nuovi parametri!", Toast.LENGTH_SHORT).show()
        }

        testNearButton.setOnClickListener {
            sendBroadcast(Intent(ScannerService.ACTION_NEAR).apply {
                putExtra("extra_mac", targetMacText.text.toString())
                putExtra("extra_name", targetNameText.text.toString())
                putExtra("extra_rssi", -65)
                putExtra("extra_technology", targetTechText.text.toString())
            })
            Toast.makeText(this, "Broadcast ACTION_NEAR inviato!", Toast.LENGTH_SHORT).show()
        }

        testFarButton.setOnClickListener {
            sendBroadcast(Intent(ScannerService.ACTION_FAR).apply {
                putExtra("extra_mac", targetMacText.text.toString())
                putExtra("extra_name", targetNameText.text.toString())
                putExtra("extra_rssi", -99)
                putExtra("extra_technology", targetTechText.text.toString())
            })
            Toast.makeText(this, "Broadcast ACTION_FAR inviato!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadTargetData() {
        val prefs = getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
        val mac = prefs.getString("target_mac", null)
        val name = prefs.getString("target_name", null)
        val tech = prefs.getString("target_technology", "BLE")

        scanDurationSec = prefs.getInt("scan_duration_sec", 5)
        scanIntervalSec = prefs.getInt("scan_interval_sec", 20)

        durationSeekBar.progress = scanDurationSec
        durationLabel.text = "Durata scansione attiva: $scanDurationSec secondi"

        intervalSeekBar.progress = scanIntervalSec
        intervalLabel.text = "Intervallo di pausa: $scanIntervalSec secondi"

        if (mac != null) {
            targetNameText.text = name ?: "Dispositivo memorizzato"
            targetMacText.text = mac
            targetTechText.text = "Tecnologia di monitoraggio: $tech (Scansione $tech esclusiva)"
            unpairButton.isEnabled = true
            restartServiceButton.isEnabled = true
        } else {
            targetNameText.text = "Nessun target selezionato"
            targetMacText.text = "Nessun indirizzo MAC configurato"
            targetTechText.text = "Seleziona un dispositivo dalla schermata iniziale"
            unpairButton.isEnabled = false
            restartServiceButton.isEnabled = false
        }
    }

    private fun saveCycleSettings() {
        getSharedPreferences("itag_prefs", Context.MODE_PRIVATE).edit()
            .putInt("scan_duration_sec", scanDurationSec)
            .putInt("scan_interval_sec", scanIntervalSec)
            .apply()
    }
}
