package com.example.itagscanner

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Button
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.TextView
import com.google.android.material.switchmaterial.SwitchMaterial
import android.widget.Toast
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.card.MaterialCardView

class DeviceManagerActivity : AppCompatActivity() {

    private lateinit var tabDeviceContent: LinearLayout
    private lateinit var tabTrackingContent: LinearLayout
    private lateinit var tabMacrodroidContent: LinearLayout

    private lateinit var tabTargetCard: MaterialCardView
    private lateinit var tabTrackingCard: MaterialCardView
    private lateinit var tabMacrodroidCard: MaterialCardView
    private lateinit var tabTargetText: TextView
    private lateinit var tabTrackingText: TextView
    private lateinit var tabMacrodroidText: TextView
    private lateinit var backButton: ImageView

    private lateinit var activeTargetCard: MaterialCardView
    private lateinit var tvTargetNameLarge: TextView
    private lateinit var btnRenameTarget: TextView
    private lateinit var tvTargetTechBadge: TextView
    private lateinit var tvTargetMacDetails: TextView
    private lateinit var tvTargetUuids: TextView
    private lateinit var removeTargetBtnLarge: Button

    private lateinit var tvDurationValue: TextView
    private lateinit var seekDurationReact: SeekBar
    private lateinit var tvPauseValue: TextView
    private lateinit var seekPauseReact: SeekBar
    private lateinit var switchEcoReact: SwitchMaterial
    private lateinit var restartServiceButtonReact: Button

    private lateinit var btnTestNearReact: TextView
    private lateinit var btnTestFarReact: TextView

    private lateinit var archiveContainerReact: LinearLayout
    private lateinit var archiveCountBadgeReact: TextView

    private val PRESETS_DUR = intArrayOf(3, 5, 8, 10, 15)
    private lateinit var presetDurViews: Array<TextView>
    
    private val PRESETS_PAUSE = intArrayOf(10, 20, 30, 60, 120)
    private lateinit var presetPauseViews: Array<TextView>

    private var scanDurationSec = 5
    private var scanIntervalSec = 20

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_device_manager)

        backButton = findViewById(R.id.backButton)
        backButton.setOnClickListener { finish() }

        tabTargetCard = findViewById(R.id.tabTargetCard)
        tabTrackingCard = findViewById(R.id.tabTrackingCard)
        tabMacrodroidCard = findViewById(R.id.tabMacrodroidCard)
        tabTargetText = findViewById(R.id.tabTargetText)
        tabTrackingText = findViewById(R.id.tabTrackingText)
        tabMacrodroidText = findViewById(R.id.tabMacrodroidText)

        tabDeviceContent = findViewById(R.id.tabDeviceContent)
        tabTrackingContent = findViewById(R.id.tabTrackingContent)
        tabMacrodroidContent = findViewById(R.id.tabMacrodroidContent)

        tabTargetCard.setOnClickListener { selectTab("device") }
        tabTrackingCard.setOnClickListener { selectTab("tracking") }
        tabMacrodroidCard.setOnClickListener { selectTab("macrodroid") }

        activeTargetCard = findViewById(R.id.activeTargetCard)
        tvTargetNameLarge = findViewById(R.id.tvTargetNameLarge)
        btnRenameTarget = findViewById(R.id.btnRenameTarget)
        tvTargetTechBadge = findViewById(R.id.tvTargetTechBadge)
        tvTargetMacDetails = findViewById(R.id.tvTargetMacDetails)
        tvTargetUuids = findViewById(R.id.tvTargetUuids)
        removeTargetBtnLarge = findViewById(R.id.removeTargetBtnLarge)
        archiveContainerReact = findViewById(R.id.archiveContainerReact)
        archiveCountBadgeReact = findViewById(R.id.archiveCountBadgeReact)

        tvDurationValue = findViewById(R.id.tvDurationValue)
        seekDurationReact = findViewById(R.id.seekDurationReact)
        tvPauseValue = findViewById(R.id.tvPauseValue)
        seekPauseReact = findViewById(R.id.seekPauseReact)
        switchEcoReact = findViewById(R.id.switchEcoReact)
        restartServiceButtonReact = findViewById(R.id.restartServiceButtonReact)

        btnTestNearReact = findViewById(R.id.btnTestNearReact)
        btnTestFarReact = findViewById(R.id.btnTestFarReact)

        presetDurViews = arrayOf(
            findViewById(R.id.presetDur3s),
            findViewById(R.id.presetDur5s),
            findViewById(R.id.presetDur8s),
            findViewById(R.id.presetDur10s),
            findViewById(R.id.presetDur15s)
        )
        
        presetPauseViews = arrayOf(
            findViewById(R.id.presetPause10s),
            findViewById(R.id.presetPause20s),
            findViewById(R.id.presetPause30s),
            findViewById(R.id.presetPause60s),
            findViewById(R.id.presetPause120s)
        )

        setupSliders()

        switchEcoReact.setOnCheckedChangeListener { _, _ ->
            saveCycleSettings()
        }
        loadTargetData()
        loadArchive()
        selectTab("device")

        removeTargetBtnLarge.setOnClickListener {
            getSharedPreferences("itag_prefs", Context.MODE_PRIVATE).edit()
                .remove("target_mac")
                .remove("target_name")
                .remove("target_technology")
                .apply()
            stopService(Intent(this, ScannerService::class.java))
            Toast.makeText(this, "Target dissociato", Toast.LENGTH_SHORT).show()
            loadTargetData()
            loadArchive()
        }

        restartServiceButtonReact.setOnClickListener {
            val serviceIntent = Intent(this, ScannerService::class.java)
            stopService(serviceIntent)
            startService(serviceIntent)
            Toast.makeText(this, "Tracking riavviato con i nuovi parametri!", Toast.LENGTH_SHORT).show()
        }

        btnTestNearReact.setOnClickListener {
            val prefs = getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
            val mac = prefs.getString("target_mac", "00:00:00:00:00:00")
            val name = prefs.getString("target_name", "Test")
            val tech = prefs.getString("target_technology", "BLE")
            sendBroadcast(Intent(ScannerService.ACTION_NEAR).apply {
                putExtra("extra_mac", mac)
                putExtra("extra_name", name)
                putExtra("extra_rssi", -65)
                putExtra("extra_technology", tech)
            })
            Toast.makeText(this, "Test ACTION_NEAR inviato!", Toast.LENGTH_SHORT).show()
        }

        btnTestFarReact.setOnClickListener {
            val prefs = getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
            val mac = prefs.getString("target_mac", "00:00:00:00:00:00")
            val name = prefs.getString("target_name", "Test")
            val tech = prefs.getString("target_technology", "BLE")
            sendBroadcast(Intent(ScannerService.ACTION_FAR).apply {
                putExtra("extra_mac", mac)
                putExtra("extra_name", name)
                putExtra("extra_rssi", -99)
                putExtra("extra_technology", tech)
            })
            Toast.makeText(this, "Test ACTION_FAR inviato!", Toast.LENGTH_SHORT).show()
        }
    }

    private fun selectTab(tab: String) {
        val colorSelected = android.graphics.Color.parseColor("#FFFFFF")
        val colorUnselected = android.graphics.Color.parseColor("#00000000") // Transparent
        val textSelected = android.graphics.Color.parseColor("#111827")
        val textUnselected = android.graphics.Color.parseColor("#4B5563")

        tabTargetCard.setCardBackgroundColor(colorUnselected)
        tabTargetCard.cardElevation = 0f
        tabTargetText.setTextColor(textUnselected)
        
        tabTrackingCard.setCardBackgroundColor(colorUnselected)
        tabTrackingCard.cardElevation = 0f
        tabTrackingText.setTextColor(textUnselected)
        
        tabMacrodroidCard.setCardBackgroundColor(colorUnselected)
        tabMacrodroidCard.cardElevation = 0f
        tabMacrodroidText.setTextColor(textUnselected)

        tabDeviceContent.visibility = View.GONE
        tabTrackingContent.visibility = View.GONE
        tabMacrodroidContent.visibility = View.GONE

        when (tab) {
            "device" -> {
                tabTargetCard.setCardBackgroundColor(colorSelected)
                tabTargetCard.cardElevation = 2f
                tabTargetText.setTextColor(textSelected)
                tabDeviceContent.visibility = View.VISIBLE
            }
            "tracking" -> {
                tabTrackingCard.setCardBackgroundColor(colorSelected)
                tabTrackingCard.cardElevation = 2f
                tabTrackingText.setTextColor(textSelected)
                tabTrackingContent.visibility = View.VISIBLE
            }
            "macrodroid" -> {
                tabMacrodroidCard.setCardBackgroundColor(colorSelected)
                tabMacrodroidCard.cardElevation = 2f
                tabMacrodroidText.setTextColor(textSelected)
                tabMacrodroidContent.visibility = View.VISIBLE
            }
        }
    }

    private fun setupSliders() {
        seekDurationReact.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                scanDurationSec = 2 + progress
                tvDurationValue.text = "$scanDurationSec secondi"
                updatePresetsDur(scanDurationSec)
                saveCycleSettings()
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        seekPauseReact.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                scanIntervalSec = 5 + progress
                tvPauseValue.text = "Pausa: ${scanIntervalSec}s"
                updatePresetsPause(scanIntervalSec)
                saveCycleSettings()
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        for (i in PRESETS_DUR.indices) {
            presetDurViews[i].setOnClickListener {
                seekDurationReact.progress = PRESETS_DUR[i] - 2
            }
        }
        for (i in PRESETS_PAUSE.indices) {
            presetPauseViews[i].setOnClickListener {
                seekPauseReact.progress = PRESETS_PAUSE[i] - 5
            }
        }
    }

    private fun updatePresetsDur(value: Int) {
        for (i in PRESETS_DUR.indices) {
            if (PRESETS_DUR[i] == value) {
                presetDurViews[i].setBackgroundResource(R.drawable.bg_chip_selected_react)
                presetDurViews[i].setTextColor(android.graphics.Color.WHITE)
            } else {
                presetDurViews[i].setBackgroundResource(R.drawable.bg_chip_unselected_react)
                presetDurViews[i].setTextColor(android.graphics.Color.parseColor("#374151"))
            }
        }
    }

    private fun updatePresetsPause(value: Int) {
        for (i in PRESETS_PAUSE.indices) {
            if (PRESETS_PAUSE[i] == value) {
                presetPauseViews[i].setBackgroundResource(R.drawable.bg_chip_selected_react)
                presetPauseViews[i].setTextColor(android.graphics.Color.WHITE)
            } else {
                presetPauseViews[i].setBackgroundResource(R.drawable.bg_chip_unselected_react)
                presetPauseViews[i].setTextColor(android.graphics.Color.parseColor("#374151"))
            }
        }
    }

    private fun loadTargetData() {
        val prefs = getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
        val mac = prefs.getString("target_mac", null)
        val name = prefs.getString("target_name", null)
        val tech = prefs.getString("target_technology", "BLE")

        scanDurationSec = prefs.getInt("scan_duration_sec", 5)
        scanIntervalSec = prefs.getInt("scan_interval_sec", 20)

        seekDurationReact.progress = scanDurationSec - 2
        seekPauseReact.progress = scanIntervalSec - 5
        switchEcoReact.isChecked = prefs.getBoolean("eco_mode", true)

        if (mac != null) {
            tvTargetNameLarge.text = name ?: "Dispositivo"
            tvTargetMacDetails.text = mac
            tvTargetTechBadge.text = "● Target $tech"
            
            val archive = TargetArchiveManager.getArchive(this)
            val matched = archive.find { it.address == mac }
            if (matched != null && matched.uuids.isNotEmpty()) {
                tvTargetUuids.text = matched.uuids.joinToString(", ")
            } else {
                tvTargetUuids.text = "Nessun servizio rilevato"
            }
            
            removeTargetBtnLarge.visibility = View.VISIBLE
            btnRenameTarget.visibility = View.VISIBLE
        } else {
            tvTargetNameLarge.text = "Nessun target"
            tvTargetMacDetails.text = "--"
            tvTargetTechBadge.text = "● Target Sconosciuto"
            tvTargetUuids.text = "--"
            removeTargetBtnLarge.visibility = View.GONE
            btnRenameTarget.visibility = View.GONE
        }
    }

    private fun saveCycleSettings() {
        getSharedPreferences("itag_prefs", Context.MODE_PRIVATE).edit()
            .putInt("scan_duration_sec", scanDurationSec)
            .putInt("scan_interval_sec", scanIntervalSec)
            .putBoolean("eco_mode", switchEcoReact.isChecked)
            .apply()
    }

    private fun loadArchive() {
        archiveContainerReact.removeAllViews()
        val archive = TargetArchiveManager.getArchive(this)
        
        archiveCountBadgeReact.text = "${archive.size} salvati"
        
        val prefs = getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
        val currentTargetMac = prefs.getString("target_mac", null)
        
        for (item in archive) {
            val view = LayoutInflater.from(this).inflate(R.layout.archive_list_item, archiveContainerReact, false)
            val nameText = view.findViewById<TextView>(R.id.archiveNameText)
            val techBadge = view.findViewById<TextView>(R.id.archiveTechBadge)
            val activeBadge = view.findViewById<TextView>(R.id.archiveActiveBadge)
            val detailsText = view.findViewById<TextView>(R.id.archiveDetailsText)
            val actionButton = view.findViewById<Button>(R.id.archiveActionButton)
            val deleteButton = view.findViewById<ImageButton>(R.id.archiveDeleteButton)
            
            val displayName = item.customName ?: item.name ?: "Sconosciuto"
            nameText.text = displayName
            
            if (item.type == "BLE") {
                techBadge.visibility = View.VISIBLE
            } else {
                techBadge.visibility = View.GONE
            }
            
            val manufacturerStr = if (item.manufacturer != null && item.manufacturer != "N/D") " • ${item.manufacturer}" else ""
            detailsText.text = "${item.address}$manufacturerStr"
            
            val isCurrent = currentTargetMac.equals(item.address, ignoreCase = true)
            if (isCurrent) {
                activeBadge.visibility = View.VISIBLE
                actionButton.text = "DISSOCIA"
                actionButton.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#FEF3C7"))
                actionButton.setTextColor(android.graphics.Color.parseColor("#92400E"))
                actionButton.setOnClickListener {
                    removeTargetBtnLarge.performClick()
                }
            } else {
                activeBadge.visibility = View.GONE
                actionButton.text = "ATTIVA TARGET"
                actionButton.backgroundTintList = android.content.res.ColorStateList.valueOf(android.graphics.Color.parseColor("#4F46E5"))
                actionButton.setTextColor(android.graphics.Color.WHITE)
                actionButton.setOnClickListener {
                    prefs.edit()
                        .putString("target_mac", item.address)
                        .putString("target_name", displayName)
                        .putString("target_technology", item.type)
                        .apply()
                    TargetArchiveManager.addToArchive(this@DeviceManagerActivity, item.address, item.name, item.customName, item.type, item.category, item.manufacturer)
                    Toast.makeText(this@DeviceManagerActivity, "Target attivato dall'archivio: ${item.address}", Toast.LENGTH_SHORT).show()
                    loadTargetData()
                    loadArchive()
                    
                    val serviceIntent = Intent(this@DeviceManagerActivity, ScannerService::class.java)
                    startService(serviceIntent)
                }
            }
            
            deleteButton.setOnClickListener {
                TargetArchiveManager.removeFromArchive(this@DeviceManagerActivity, item.address)
                Toast.makeText(this@DeviceManagerActivity, "Dispositivo rimosso dall'archivio.", Toast.LENGTH_SHORT).show()
                loadArchive()
            }
            
            archiveContainerReact.addView(view)
        }
    }
}
