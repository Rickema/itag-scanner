package com.example.itagscanner

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object TargetArchiveManager {
    fun addToArchive(context: Context, address: String, name: String?, customName: String?, type: String, category: String?, manufacturer: String?, uuids: String? = null) {
        val prefs = context.getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
        val archiveStr = prefs.getString("bt_target_archive", "[]")
        try {
            val jsonArray = JSONArray(archiveStr)
            val newArray = JSONArray()
            var found = false
            
            // new element
            val newItem = JSONObject().apply {
                put("address", address)
                put("name", name ?: JSONObject.NULL)
                put("customName", customName ?: JSONObject.NULL)
                put("type", type)
                put("category", category ?: JSONObject.NULL)
                put("manufacturer", manufacturer ?: JSONObject.NULL)
                put("uuids", uuids ?: JSONObject.NULL)
                put("addedAt", System.currentTimeMillis())
            }
            newArray.put(newItem)
            
            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.getJSONObject(i)
                if (item.getString("address").equals(address, ignoreCase = true)) {
                    found = true
                    // Skip, as we already added it at the top (unshift)
                } else {
                    newArray.put(item)
                }
            }
            
            prefs.edit().putString("bt_target_archive", newArray.toString()).apply()
            
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    fun getArchive(context: Context): List<TargetArchiveItem> {
        val prefs = context.getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
        val archiveStr = prefs.getString("bt_target_archive", "[]")
        val list = mutableListOf<TargetArchiveItem>()
        try {
            val jsonArray = JSONArray(archiveStr)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                list.add(TargetArchiveItem(
                    address = obj.getString("address"),
                    name = if (obj.isNull("name")) null else obj.getString("name"),
                    customName = if (obj.isNull("customName")) null else obj.getString("customName"),
                    type = obj.getString("type"),
                    category = if (obj.isNull("category")) null else obj.getString("category"),
                    manufacturer = if (obj.isNull("manufacturer")) null else obj.getString("manufacturer"),
                    uuids = if (obj.has("uuids") && !obj.isNull("uuids")) obj.getString("uuids") else null,
                    addedAt = obj.getLong("addedAt")
                ))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }
    
    fun removeFromArchive(context: Context, address: String) {
        val prefs = context.getSharedPreferences("itag_prefs", Context.MODE_PRIVATE)
        val archiveStr = prefs.getString("bt_target_archive", "[]")
        try {
            val jsonArray = JSONArray(archiveStr)
            val newArray = JSONArray()
            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.getJSONObject(i)
                if (!item.getString("address").equals(address, ignoreCase = true)) {
                    newArray.put(item)
                }
            }
            prefs.edit().putString("bt_target_archive", newArray.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

data class TargetArchiveItem(
    val address: String,
    val name: String?,
    val customName: String?,
    val type: String,
    val category: String?,
    val manufacturer: String?,
    val uuids: String? = null,
    val addedAt: Long
)
