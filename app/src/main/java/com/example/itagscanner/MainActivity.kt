package com.example.itagscanner

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var startButton: Button
    private lateinit var stopButton: Button
    private lateinit var scanInfoText: TextView

    private val updateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.example.itagscanner.SCAN_UPDATE") {
                val name = intent.getStringExtra("name") ?: "N/D"
                val address = intent.getStringExtra("address") ?: "N/D"
                val rssi = intent.getIntExtra("rssi", 0)
                val isNear = intent.getBooleanExtra("isNear", false)
                val timestamp = intent.getLongExtra("timestamp", 0L)

                val currentTime = System.currentTimeMillis()
                val ageSeconds = ((currentTime - timestamp) / 1000).toInt()

                val nearText = if (isNear) "SÌ" else "NO"
                scanInfoText.text = """
                    Nome: $name
                    MAC: $address
                    RSSI: $rssi dBm
                    Vicino: $nearText
                    Ultimo avvistamento: $ageSeconds sec fa
                """.trimIndent()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusText = findViewById(R.id.statusText)
        startButton = findViewById(R.id.startButton)
        stopButton = findViewById(R.id.stopButton)
        scanInfoText = findViewById(R.id.scanInfoText)

        startButton.setOnClickListener {
            if (checkPermissions()) {
                startService()
            }
        }

        stopButton.setOnClickListener {
            stopService()
        }

        updateStatus(false)
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter("com.example.itagscanner.SCAN_UPDATE")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(updateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(updateReceiver, filter)
        }
    }

    override fun onPause() {
        super.onPause()
        unregisterReceiver(updateReceiver)
    }

    private fun checkPermissions(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val permissions = mutableListOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            )
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(this, permissions.toTypedArray(), 100)
                return false
            }
        } else {
            val permission = Manifest.permission.ACCESS_FINE_LOCATION
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(permission), 100)
                return false
            }
        }
        return true
    }

    private fun startService() {
        val intent = Intent(this, ScannerService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        updateStatus(true)
    }

    private fun stopService() {
        val intent = Intent(this, ScannerService::class.java)
        stopService(intent)
        updateStatus(false)
        scanInfoText.text = "Nessun dato"
    }

    private fun updateStatus(running: Boolean) {
        statusText.text = if (running) "Scansione attiva" else "Scansione ferma"
    }
}