import { Classification, ScanRecordRaw } from '../types';
import { DatabaseManager } from './DatabaseManager';

export class BluetoothFingerprinter {
  static readonly APPLE_ID = 0x004c;
  static readonly SAMSUNG_ID = 0x0075;
  static readonly GOOGLE_ID = 0x00e0;
  static readonly MICROSOFT_ID = 0x0006;
  static readonly TILE_ID = 0x0131;
  static readonly NORDIC_ID = 0x0059;
  static readonly AMAZON_ID = 0x0157;
  static readonly ETEKCITY_ID = 0x07f6;
  static readonly ESPRESSIF_ID = 0x02e5;
  static readonly LENZE_ID = 0x02ff;

  constructor(private db: DatabaseManager) {}

  classify(scanRecord?: ScanRecordRaw | null, deviceName?: string | null): Classification {
    let score = 0;
    let type = "Dispositivo Sconosciuto";
    let brand = "Sconosciuto";
    let model = "N/D";

    if (!scanRecord) {
      return { type, brand, model, confidence: 20 };
    }

    const lowerName = (deviceName || "").toLowerCase();

    // 1. Estrai Manufacturer ID e nome produttore
    let companyId: number | null = null;
    if (scanRecord.manufacturerSpecificData) {
      const keys = scanRecord.manufacturerSpecificData instanceof Map
        ? Array.from(scanRecord.manufacturerSpecificData.keys())
        : Object.keys(scanRecord.manufacturerSpecificData).map(Number);

      if (keys.length > 0) {
        companyId = keys[0];
        brand = this.db.getCompanyName(companyId) || `0x${companyId.toString(16).toUpperCase()}`;
        score += 20;
      }
    }

    // 2. Estrai Service UUIDs
    const serviceUuids = (scanRecord.serviceUuids || []).map((u) => u.toLowerCase());

    // 3. Regole di Classificazione Dettagliata
    const isItagUuid = serviceUuids.some((u) =>
      u.includes("1802") || u.includes("1803") || u.includes("ffe0") || u.includes("feed")
    );
    const isItagName = lowerName.includes("itag") || lowerName.includes("keyfinder") ||
      lowerName.includes("anti-lost") || lowerName.includes("nut") ||
      lowerName.includes("beacon") || lowerName.includes("tracker") ||
      lowerName.includes("airtag") || lowerName.includes("smarttag") ||
      lowerName.includes("tile");

    if (isItagUuid || isItagName) {
      type = "Tracker / Portachiavi (iTAG)";
      score += 50;
      if (companyId === BluetoothFingerprinter.APPLE_ID || lowerName.includes("airtag")) {
        type = "Tracker (Apple AirTag / Dov'è)";
        brand = "Apple, Inc.";
        score += 30;
      } else if (companyId === BluetoothFingerprinter.SAMSUNG_ID || lowerName.includes("smarttag")) {
        type = "Tracker (Samsung SmartTag)";
        brand = "Samsung Electronics";
        score += 30;
      } else if (companyId === BluetoothFingerprinter.TILE_ID || lowerName.includes("tile")) {
        type = "Tracker (Tile)";
        brand = "Tile, Inc.";
        score += 30;
      }
    }

    const isAudioUuid = serviceUuids.some((u) =>
      u.includes("110b") || u.includes("110a") || u.includes("110c") ||
      u.includes("111e") || u.includes("fe9f") || u.includes("fe2c") || u.includes("fd69")
    );
    const isAudioName = lowerName.includes("buds") || lowerName.includes("airpods") ||
      lowerName.includes("headphones") || lowerName.includes("earphones") ||
      lowerName.includes("headset") || lowerName.includes("soundcore") ||
      lowerName.includes("jbl") || lowerName.includes("wh-") ||
      lowerName.includes("wf-") || lowerName.includes("speaker") ||
      lowerName.includes("cuffie") || lowerName.includes("auricolari");

    if (isAudioUuid || isAudioName) {
      type = "Auricolari / Cuffie (Audio TWS)";
      score += 45;
      if (companyId === BluetoothFingerprinter.APPLE_ID || lowerName.includes("airpods")) {
        type = "Auricolari Apple (AirPods)";
        brand = "Apple, Inc.";
        score += 25;
      } else if (companyId === BluetoothFingerprinter.SAMSUNG_ID || lowerName.includes("galaxy buds")) {
        type = "Auricolari (Samsung Galaxy Buds)";
        brand = "Samsung Electronics";
        score += 25;
      }
    }

    const isPhoneName = lowerName.includes("galaxy") || lowerName.includes("iphone") ||
      lowerName.includes("ipad") || lowerName.includes("redmi") ||
      lowerName.includes("xiaomi") || lowerName.includes("pixel") ||
      lowerName.includes("oneplus") || lowerName.includes("huawei") ||
      lowerName.includes("honor") || lowerName.includes("poco") ||
      lowerName.includes("motorola");

    if (type === "Dispositivo Sconosciuto" && isPhoneName) {
      type = "Smartphone / Tablet";
      score += 40;
    }

    const isComputerName = lowerName.startsWith("desktop-") || lowerName.startsWith("laptop-") ||
      lowerName.includes("macbook") || lowerName.includes("imac") ||
      lowerName.includes("thinkpad") || lowerName.includes("notebook");

    if (type === "Dispositivo Sconosciuto" && (companyId === BluetoothFingerprinter.MICROSOFT_ID || isComputerName)) {
      type = "Computer / PC / Notebook";
      score += 45;
    }

    const isFitnessUuid = serviceUuids.some((u) =>
      u.includes("180d") || u.includes("1814") || u.includes("1816") || u.includes("1826")
    );
    const isWatchName = lowerName.includes("watch") || lowerName.includes("band") ||
      lowerName.includes("garmin") || lowerName.includes("amazfit") ||
      lowerName.includes("fitbit") || lowerName.includes("polar");

    if (type === "Dispositivo Sconosciuto" && (isFitnessUuid || isWatchName)) {
      type = "Smartwatch / Smartband (Fitness)";
      score += 45;
    }

    if (type === "Dispositivo Sconosciuto" && (companyId === BluetoothFingerprinter.ETEKCITY_ID || lowerName.startsWith("caf-") || lowerName.includes("etekcity"))) {
      type = "Smart Home / Bilancia (Etekcity)";
      brand = "Etekcity Corporation";
      score += 50;
    } else if (type === "Dispositivo Sconosciuto" && (companyId === BluetoothFingerprinter.ESPRESSIF_ID || lowerName.includes("esp32"))) {
      type = "Dispositivo IoT (ESP32)";
      brand = "Espressif Systems";
      score += 50;
    }

    if (type === "Dispositivo Sconosciuto" && brand !== "Sconosciuto" && !brand.startsWith("0x")) {
      type = `Dispositivo ${brand}`;
      score += 20;
    }

    const finalScore = Math.min(Math.max(score, 25), 98);
    return { type, brand, model, confidence: finalScore };
  }

  extractAppearance(scanRecord: ScanRecordRaw): number | null {
    const bytes = scanRecord.bytes;
    if (!bytes || bytes.length === 0) return null;

    let i = 0;
    while (i < bytes.length) {
      const length = bytes[i] & 0xff;
      if (length === 0) break;
      if (i + 1 >= bytes.length) break;
      const type = bytes[i + 1] & 0xff;
      if (type === 0x19) {
        if (length >= 3 && i + 3 < bytes.length) {
          return (bytes[i + 2] & 0xff) | ((bytes[i + 3] & 0xff) << 8);
        }
      }
      i += length + 1;
    }
    return null;
  }

  parseFastPairModelId(scanRecord: ScanRecordRaw): string {
    const serviceData = scanRecord.serviceData;
    if (!serviceData) return "N/D";

    let data: number[] | Uint8Array | undefined;
    for (const [key, val] of Object.entries(serviceData)) {
      if (
        key.toLowerCase() === "0000fe2c-0000-1000-8000-00805f9b34fb" ||
        key.toLowerCase() === "fe2c" ||
        key.toLowerCase().includes("fe2c")
      ) {
        data = val;
        break;
      }
    }

    if (!data || data.length < 3) return "N/D";
    const toHex = (n: number) => (n & 0xff).toString(16).padStart(2, "0").toUpperCase();
    return `${toHex(data[0])}:${toHex(data[1])}:${toHex(data[2])}`;
  }
}
