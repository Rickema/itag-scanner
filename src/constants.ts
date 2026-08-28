export const Constants = {
  // Service UUID per FFE0 (16-bit iTAG / generic key service)
  SERVICE_UUID_FFE0: "0000ffe0-0000-1000-8000-00805f9b34fb",
  // Nome predefinito per iTAG generico
  DEVICE_NAME: "iTAG",
  // Soglia RSSI: -75 dBm significa "abbastanza vicino"
  RSSI_THRESHOLD: -75,
  // Tempo di presenza prima di dichiarare "vicino" (ms)
  NEAR_DEBOUNCE_MS: 5000,
  // Tempo di assenza prima di dichiarare "lontano" (ms)
  FAR_DEBOUNCE_MS: 15000,
  // Azioni broadcast per MacroDroid
  ACTION_NEAR: "com.example.itagscanner.ACTION_NEAR",
  ACTION_FAR: "com.example.itagscanner.ACTION_FAR",
  // Valori predefiniti per tracking ciclico
  DEFAULT_SCAN_INTERVAL_SEC: 20, // Pausa tra cicli di scansione
  DEFAULT_SCAN_DURATION_SEC: 5,  // Durata della scansione attiva
} as const;
