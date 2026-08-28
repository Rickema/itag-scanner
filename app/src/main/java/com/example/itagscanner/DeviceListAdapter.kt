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
    private val onRenameClick: (DeviceItem) -> Unit
) : BaseAdapter() {

    override fun getCount(): Int = items.size

    override fun getItem(position: Int): DeviceItem = items[position]

    override fun getItemId(position: Int): Long = position.toLong()

    override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
        val view = convertView ?: LayoutInflater.from(context).inflate(R.layout.device_list_item, parent, false)
        val item = getItem(position)

        val nameText = view.findViewById<TextView>(R.id.nameText)
        val technologyBadge = view.findViewById<TextView>(R.id.technologyBadge)
        val typeText = view.findViewById<TextView>(R.id.typeText)
        val manufacturerText = view.findViewById<TextView>(R.id.manufacturerText)
        val uuidText = view.findViewById<TextView>(R.id.uuidText)
        val modelIdText = view.findViewById<TextView>(R.id.modelIdText)
        val rssiDot = view.findViewById<View>(R.id.rssiDot)
        val rssiText = view.findViewById<TextView>(R.id.rssiText)
        val selectButton = view.findViewById<Button>(R.id.selectButton)

        // 1. Gestione Nome Dispositivo secondo richiesta utente:
        // "nel nome non mettere BLE DEVICE come nome, basta il piccolo tag in alto che va bene, lascia 'sconosciuto'."
        val rawName = item.name?.trim() ?: ""
        val isGeneric = rawName.isEmpty() ||
                rawName.equals("BLE Device", ignoreCase = true) ||
                rawName.equals("Dispositivo Classico", ignoreCase = true) ||
                rawName.equals("Unknown", ignoreCase = true) ||
                rawName.equals("N/D", ignoreCase = true)

        if (!item.customName.isNullOrEmpty()) {
            nameText.text = "${item.customName} (orig: ${if (isGeneric) "Sconosciuto" else rawName})"
        } else {
            nameText.text = if (isGeneric) "Sconosciuto" else rawName
        }

        // 2. Badge Tecnologia
        val isBle = item.type.equals("BLE", ignoreCase = true)
        if (isBle) {
            technologyBadge.text = "BLE (Bluetooth Low Energy)"
            technologyBadge.setTextColor(Color.parseColor("#1D4ED8"))
            technologyBadge.setBackgroundResource(R.drawable.bg_badge_ble)
        } else {
            technologyBadge.text = "Bluetooth Classico"
            technologyBadge.setTextColor(Color.parseColor("#B45309"))
            technologyBadge.setBackgroundResource(R.drawable.bg_badge_classic)
        }

        // 3. Classificazione specifica reale (auricolari, smartphone, tracker, pc, ecc.)
        val emoji = if (item.iconEmoji.isNotEmpty()) "${item.iconEmoji} " else ""
        typeText.text = "$emoji${item.classificationType} (${item.classificationConfidence}%)"

        // 4. Produttore
        manufacturerText.text = "Produttore: ${item.manufacturer}"

        // 5. Servizi / UUID
        val servicesDisplay = if (item.uuids.isEmpty() || item.uuids == "Nessun servizio standard rilevato") {
            "Nessun servizio pubblicizzato"
        } else {
            item.uuids
        }
        uuidText.text = "Servizi: $servicesDisplay"

        // 6. Fast Pair Model ID se disponibile
        if (!item.modelId.isNullOrEmpty() && item.modelId != "N/D") {
            modelIdText.visibility = View.VISIBLE
            modelIdText.text = "Fast Pair Model ID: ${item.modelId}"
        } else {
            modelIdText.visibility = View.GONE
        }

        // 7. Segnale RSSI con indicatore a semaforo
        rssiText.text = "Segnale RSSI: ${item.rssi} dBm (MAC: ${item.address})"
        val dotColor = when {
            item.rssi >= -65 -> Color.parseColor("#10B981") // Verde (forte)
            item.rssi >= -80 -> Color.parseColor("#F59E0B") // Giallo (medio)
            else -> Color.parseColor("#94A3B8") // Grigio (debole)
        }
        rssiDot.backgroundTintList = ColorStateList.valueOf(dotColor)

        // 8. Stato Target Attivo
        val activeTargetMac = targetMacProvider()
        val isTarget = !activeTargetMac.isNullOrEmpty() && activeTargetMac.equals(item.address, ignoreCase = true)

        if (isTarget) {
            selectButton.text = "TARGET ATTIVO"
            selectButton.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#10B981"))
        } else {
            selectButton.text = "IMPOSTA TARGET"
            selectButton.backgroundTintList = ColorStateList.valueOf(Color.parseColor("#3F51B5"))
        }

        selectButton.setOnClickListener {
            onSelectClick(item)
        }

        // Tocco prolungato o tocco su card per rinomina rapida
        view.setOnLongClickListener {
            onRenameClick(item)
            true
        }

        return view
    }
}
