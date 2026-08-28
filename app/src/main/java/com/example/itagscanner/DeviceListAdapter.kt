package com.example.itagscanner

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.Button
import android.widget.TextView

class DeviceListAdapter(
    private val context: Context,
    private val items: List<DeviceItem>,
    private val targetMacProvider: () -> String?,
    private val onSelectClick: (DeviceItem) -> Unit,
    private val onInspectClick: (DeviceItem) -> Unit,
    private val onRenameClick: (DeviceItem) -> Unit
) : BaseAdapter() {

    // Set persistente degli indirizzi MAC espansi per evitare richiusura al refresh della scansione
    private val expandedAddresses = mutableSetOf<String>()

    fun isAddressExpanded(mac: String): Boolean = expandedAddresses.contains(mac)

    fun toggleExpand(mac: String) {
        if (expandedAddresses.contains(mac)) {
            expandedAddresses.remove(mac)
        } else {
            expandedAddresses.add(mac)
        }
        notifyDataSetChanged()
    }

    override fun getCount(): Int = items.size

    override fun getItem(position: Int): DeviceItem = items[position]

    override fun getItemId(position: Int): Long = position.toLong()

    override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
        val view = convertView ?: LayoutInflater.from(context).inflate(R.layout.device_list_item, parent, false)
        val item = getItem(position)

        val nameText = view.findViewById<TextView>(R.id.nameText)
        val technologyBadge = view.findViewById<TextView>(R.id.technologyBadge)
        val selectButton = view.findViewById<Button>(R.id.selectButton)
        val expandArrow = view.findViewById<TextView>(R.id.expandArrow)
        val rssiDot = view.findViewById<View>(R.id.rssiDot)
        val rssiText = view.findViewById<TextView>(R.id.rssiText)

        val expandedDetailContainer = view.findViewById<View>(R.id.expandedDetailContainer)
        val typeText = view.findViewById<TextView>(R.id.typeText)
        val manufacturerText = view.findViewById<TextView>(R.id.manufacturerText)
        val uuidText = view.findViewById<TextView>(R.id.uuidText)
        val modelIdText = view.findViewById<TextView>(R.id.modelIdText)
        val renameButton = view.findViewById<Button>(R.id.renameButton)
        val inspectButton = view.findViewById<Button>(R.id.inspectButton)

        // 1. Gestione Nome Dispositivo ("Sconosciuto" se vuoto o generic)
        val rawName = item.name?.trim() ?: ""
        val isGeneric = rawName.isEmpty() ||
                rawName.equals("BLE Device", ignoreCase = true) ||
                rawName.equals("Dispositivo Classico", ignoreCase = true) ||
                rawName.equals("Unknown", ignoreCase = true) ||
                rawName.equals("N/D", ignoreCase = true)

        if (!item.customName.isNullOrEmpty()) {
            nameText.text = "${item.customName} (${if (isGeneric) "Sconosciuto" else rawName})"
        } else {
            nameText.text = if (isGeneric) "Sconosciuto" else rawName
        }

        // 2. TAG SINTETICO SOLO PER BLE (Invisibile per Classico)
        val isBle = item.type.equals("BLE", ignoreCase = true)
        if (isBle) {
            technologyBadge.visibility = View.VISIBLE
            technologyBadge.text = "BLE"
            technologyBadge.setBackgroundResource(R.drawable.bg_badge_ble)
        } else {
            technologyBadge.visibility = View.GONE
        }

        // 3. Segnale RSSI + Distanza stimata in metri + MAC Address
        val distStr = if (item.estimatedDistance != "N/D" && item.estimatedDistance.isNotEmpty()) " ~${item.estimatedDistance}" else ""
        rssiText.text = "${item.address} •$distStr (${item.rssi} dBm)"

        val dotColor = when {
            item.rssi >= -70 -> Color.parseColor("#10B981") // Verde
            item.rssi >= -85 -> Color.parseColor("#F59E0B") // Giallo
            else -> Color.parseColor("#94A3B8") // Grigio
        }
        rssiDot.backgroundTintList = ColorStateList.valueOf(dotColor)

        // 4. Stato Target Attivo
        val activeTargetMac = targetMacProvider()
        val isTarget = !activeTargetMac.isNullOrEmpty() && activeTargetMac.equals(item.address, ignoreCase = true)

        if (isTarget) {
            selectButton.text = "TARGET"
            selectButton.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#10B981"))
        } else {
            selectButton.text = "TARGET"
            selectButton.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#3F51B5"))
        }

        // 5. Gestione Espansione al Tocco (con set persistente)
        val isExpanded = isAddressExpanded(item.address) || item.isExpanded
        if (isExpanded) {
            expandedDetailContainer.visibility = View.VISIBLE
            expandArrow.text = "▲"

            typeText.text = "${item.classificationType} (${item.classificationConfidence}%)"
            manufacturerText.text = "Produttore SIG: ${item.manufacturer}"

            val servicesDisplay = if (item.uuids.isEmpty() || item.uuids == "Nessun servizio standard rilevato") {
                "Nessun servizio pubblicizzato"
            } else {
                item.uuids
            }
            uuidText.text = "Servizi: $servicesDisplay"

            if (!item.modelId.isNullOrEmpty() && item.modelId != "N/D") {
                modelIdText.visibility = View.VISIBLE
                modelIdText.text = "Fast Pair Model ID: ${item.modelId}"
            } else {
                modelIdText.visibility = View.GONE
            }
        } else {
            expandedDetailContainer.visibility = View.GONE
            expandArrow.text = "▼"
        }

        // Event Listener per Espansione al Tocco della Scheda
        view.setOnClickListener {
            toggleExpand(item.address)
            item.isExpanded = isAddressExpanded(item.address)
        }

        selectButton.setOnClickListener {
            onSelectClick(item)
        }

        inspectButton.setOnClickListener {
            onInspectClick(item)
        }

        renameButton.setOnClickListener {
            onRenameClick(item)
        }

        view.setOnLongClickListener {
            onRenameClick(item)
            true
        }

        return view
    }
}
