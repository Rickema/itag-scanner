package com.example.itagscanner

import android.annotation.SuppressLint
import android.bluetooth.le.ScanResult
import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.Button
import android.widget.TextView

class DeviceAdapter(
    private val context: Context,
    private val devices: MutableList<ScanResult>,
    private val onSelect: (ScanResult) -> Unit
) : BaseAdapter() {

    override fun getCount(): Int = devices.size

    override fun getItem(position: Int): Any = devices[position]

    override fun getItemId(position: Int): Long = position.toLong()

    @SuppressLint("SetTextI18n")
    override fun getView(position: Int, convertView: View?, parent: ViewGroup?): View {
        val view: View
        val holder: ViewHolder
        if (convertView == null) {
            view = LayoutInflater.from(context).inflate(R.layout.device_list_item, parent, false)
            holder = ViewHolder(view)
            view.tag = holder
        } else {
            view = convertView
            holder = view.tag as ViewHolder
        }

        val result = devices[position]
        val device = result.device
        val name = device.name ?: "N/D"
        val address = device.address ?: "N/D"
        val rssi = result.rssi

        val services = result.scanRecord?.serviceUuids?.joinToString(", ") { it.uuid.toString() } ?: "N/D"

        // Manufacturer data
        val manufacturerData = result.scanRecord?.manufacturerSpecificData
        val manufacturerString = if (manufacturerData != null && manufacturerData.size() > 0) {
            val sb = StringBuilder()
            for (i in 0 until manufacturerData.size()) {
                val companyId = manufacturerData.keyAt(i)
                val companyName = getManufacturerName(companyId) ?: "0x${companyId.toString(16).uppercase()}"
                val data = manufacturerData.valueAt(i)
                sb.append("$companyName ($companyId) Data:${bytesToHex(data)}")
                if (i < manufacturerData.size() - 1) sb.append("; ")
            }
            sb.toString()
        } else {
            "N/D"
        }

        holder.nameText.text = "Nome: $name"
        holder.macText.text = "MAC: $address"
        holder.rssiText.text = "RSSI: $rssi dBm"
        holder.uuidText.text = "UUID: $services"
        holder.manufacturerText.text = "Produttore: $manufacturerString"

        holder.selectButton.setOnClickListener {
            onSelect(result)
        }

        return view
    }

    private fun bytesToHex(bytes: ByteArray): String {
        return bytes.joinToString(":") { String.format("%02X", it) }
    }

    private fun getManufacturerName(companyId: Int): String? {
        return when (companyId) {
            0x004C -> "Apple"
            0x0075 -> "Samsung"
            0x0006 -> "Microsoft"
            0x000D -> "Texas Instruments"
            0x000F -> "Broadcom"
            0x001D -> "Google"
            0x0059 -> "Nordic Semiconductor"
            0x0131 -> "Tile"
            0x0157 -> "Amazon"
            else -> null
        }
    }

    private class ViewHolder(view: View) {
        val nameText: TextView = view.findViewById(R.id.nameText)
        val macText: TextView = view.findViewById(R.id.macText)
        val rssiText: TextView = view.findViewById(R.id.rssiText)
        val uuidText: TextView = view.findViewById(R.id.uuidText)
        val manufacturerText: TextView = view.findViewById(R.id.manufacturerText)
        val selectButton: Button = view.findViewById(R.id.selectButton)
    }
}