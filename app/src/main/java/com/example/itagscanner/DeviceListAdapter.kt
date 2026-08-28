package com.example.itagscanner

import android.content.Context
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
        val techDetail = view.findViewById<TextView>(R.id.techDetail)
        val typeText = view.findViewById<TextView>(R.id.typeText)
        val appearanceText = view.findViewById<TextView>(R.id.appearanceText)
        val manufacturerText = view.findViewById<TextView>(R.id.manufacturerText)
        val uuidText = view.findViewById<TextView>(R.id.uuidText)
        val modelIdText = view.findViewById<TextView>(R.id.modelIdText)
        val rssiText = view.findViewById<TextView>(R.id.rssiText)
        val selectButton = view.findViewById<Button>(R.id.selectButton)

        // Nome ed eventuale Alias
        if (!item.customName.isNullOrEmpty()) {
            nameText.text = "${item.customName} (orig: ${item.name ?: "N/D"})"
        } else {
            nameText.text = item.name ?: "Dispositivo Sconosciuto"
        }

        // Badge tecnologia ben visibile
        val isBle = item.type.equals("BLE", ignoreCase = true)
        if (isBle) {
            technologyBadge.text = "BLE (Bluetooth Low Energy)"
            technologyBadge.setTextColor(Color.parseColor("#1565C0"))
            technologyBadge.setBackgroundColor(Color.parseColor("#E3F2FD"))
            techDetail.text = "Tipo: Bluetooth Low Energy (Beacon / GATT)"
        } else {
            technologyBadge.text = "Bluetooth Classico (BR/EDR)"
            technologyBadge.setTextColor(Color.parseColor("#E65100"))
            technologyBadge.setBackgroundColor(Color.parseColor("#FFF3E0"))
            techDetail.text = "Tipo: Bluetooth Classico (Audio / Serial / Host)"
        }

        typeText.text = "Classificazione: ${item.classificationType} (${item.classificationConfidence}%)"
        appearanceText.text = "Aspetto: ${item.appearance}"
        manufacturerText.text = "Produttore: ${item.manufacturer}"
        uuidText.text = "Servizi / UUID: ${item.uuids}"

        if (!item.modelId.isNullOrEmpty() && item.modelId != "N/D") {
            modelIdText.visibility = View.VISIBLE
            modelIdText.text = "Fast Pair Model ID: ${item.modelId}"
        } else {
            modelIdText.visibility = View.GONE
        }

        rssiText.text = "Segnale RSSI: ${item.rssi} dBm (MAC: ${item.address})"

        selectButton.setOnClickListener {
            onSelectClick(item)
        }

        // Tocco prolungato o click per rinomina
        view.setOnLongClickListener {
            onRenameClick(item)
            true
        }

        return view
    }
}
