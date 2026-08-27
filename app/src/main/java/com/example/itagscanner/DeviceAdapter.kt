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

        // Estrai i service UUIDs
        val services = result.scanRecord?.serviceUuids?.joinToString(", ") { it.uuid.toString() } ?: "N/D"

        holder.nameText.text = "Nome: $name"
        holder.macText.text = "MAC: $address"
        holder.rssiText.text = "RSSI: $rssi dBm"
        holder.uuidText.text = "UUID: $services"

        holder.selectButton.setOnClickListener {
            onSelect(result)
        }

        return view
    }

    private class ViewHolder(view: View) {
        val nameText: TextView = view.findViewById(R.id.nameText)
        val macText: TextView = view.findViewById(R.id.macText)
        val rssiText: TextView = view.findViewById(R.id.rssiText)
        val uuidText: TextView = view.findViewById(R.id.uuidText)
        val selectButton: Button = view.findViewById(R.id.selectButton)
    }
}