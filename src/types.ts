export interface DeviceItem {
  name: string;
  customName?: string;  // Nome manuale assegnato dall'utente (Alias)
  address: string;      // Indirizzo MAC
  rssi: number;
  type: "BLE" | "Classic";
  category: string;      // categoria principale (es. Audio, Tracker, Computer)
  uuids: string;         // UUID o service names
  manufacturer: string;  // produttore Bluetooth SIG
  appearance: string;    // descrizione aspetto SIG
  modelId: string;       // Fast Pair Model ID (se trovato)
  classificationType: string;
  classificationBrand: string;
  classificationConfidence: number;
  estimatedDistance?: string;
  isBonded?: boolean;
  scanResult?: any;
  bluetoothDevice?: any;
}

export interface Classification {
  type: string;      // es. "Tracker", "Auricolari", "Smartwatch"
  brand: string;     // es. "Apple", "Samsung", "Sconosciuto"
  model: string;     // eventuale modello (es. "Fast Pair device")
  confidence: number; // 0..100
}

export interface SavedTargetDevice {
  name: string | null;
  customName?: string | null;
  mac: string | null;
  uuid: string | null;
  type?: "BLE" | "Classic"; // Specifica della tecnologia del target
  isSet: boolean;
  selectedAt?: number;
  lastSeen?: number;
  isNear?: boolean;
  rssi?: number;
}

export interface TrackingSettings {
  scanIntervalSec: number;
  scanDurationSec: number;
  batterySaverMode: boolean;
}

export interface TrackingCycleState {
  isTracking: boolean;
  phase: 'idle' | 'scanning' | 'paused';
  secondsRemaining: number;
  technology: 'BLE' | 'Classic' | 'None';
  lastCycleTimestamp: number;
}

export interface ScanRecordRaw {
  bytes?: Uint8Array | number[];
  serviceUuids?: string[];
  manufacturerSpecificData?: Map<number, Uint8Array | number[]> | { [companyId: number]: number[] };
  serviceData?: { [uuid: string]: number[] };
}
