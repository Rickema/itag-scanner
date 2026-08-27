package com.example.itagscanner

import android.annotation.SuppressLint
import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.BaseAdapter
import android.widget.Button
import android.widget.TextView

class DeviceAdapter(
    private val context: Context,
    private val devices: MutableList<DeviceItem>,
    private val onSelect: (DeviceItem) -> Unit
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

        val item = devices[position]

        holder.nameText.text = "Nome: ${item.name}"
        holder.typeText.text = "Tipo: ${item.type}${if (item.category.isNotEmpty()) " - ${item.category}" else ""}"
        holder.appearanceText.text = "Aspetto: ${item.appearance}"
        holder.macText.text = "MAC: ${item.address}"
        holder.rssiText.text = "RSSI: ${item.rssi} dBm"
        holder.uuidText.text = "UUID/Service: ${item.uuids}"
        holder.manufacturerText.text = "Produttore: ${item.manufacturer}"
        holder.modelIdText.text = "Model ID: ${item.modelId}"

        holder.selectButton.setOnClickListener {
            onSelect(item)
        }

        return view
    }

    private class ViewHolder(view: View) {
        val nameText: TextView = view.findViewById(R.id.nameText)
        val typeText: TextView = view.findViewById(R.id.typeText)
        val appearanceText: TextView = view.findViewById(R.id.appearanceText)
        val macText: TextView = view.findViewById(R.id.macText)
        val rssiText: TextView = view.findViewById(R.id.rssiText)
        val uuidText: TextView = view.findViewById(R.id.uuidText)
        val manufacturerText: TextView = view.findViewById(R.id.manufacturerText)
        val modelIdText: TextView = view.findViewById(R.id.modelIdText)
        val selectButton: Button = view.findViewById(R.id.selectButton)
    }
}