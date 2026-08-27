// Dentro ScannerService.kt, aggiungi:
private var statusUpdateInterval = 10000L // default 10 secondi
private var statusHandler = Handler(Looper.getMainLooper())
private var statusRunnable: Runnable? = null

override fun onCreate() {
    // ...
    val prefs = getSharedPreferences("itag_prefs", MODE_PRIVATE)
    statusUpdateInterval = prefs.getLong("update_interval", 10000L)
    // ...
}

private fun startStatusUpdates() {
    stopStatusUpdates()
    statusRunnable = object : Runnable {
        override fun run() {
            // Invia broadcast con stato
            val intent = Intent("com.example.itagscanner.STATUS_UPDATE").apply {
                putExtra("isNear", isNear)
                putExtra("lastSeen", lastSeenTimestamp)
            }
            sendBroadcast(intent)
            statusHandler.postDelayed(this, statusUpdateInterval)
        }
    }
    statusHandler.postDelayed(statusRunnable!!, statusUpdateInterval)
}

private fun stopStatusUpdates() {
    statusRunnable?.let { statusHandler.removeCallbacks(it) }
}

override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startScanning()
    startStatusUpdates()
    return START_STICKY
}

override fun onDestroy() {
    stopStatusUpdates()
    stopScanning()
    super.onDestroy()
}