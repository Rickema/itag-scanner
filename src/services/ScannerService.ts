import { Constants } from '../constants';
import { DeviceItem, SavedTargetDevice, TrackingSettings, TrackingCycleState } from '../types';

export type ScannerServiceListener = (event: {
  type: "SCAN_UPDATE" | "STATUS_UPDATE" | "CYCLE_UPDATE" | "ACTION_NEAR" | "ACTION_FAR";
  payload?: any;
}) => void;

export class ScannerService {
  private static instance: ScannerService | null = null;

  private isNear = false;
  private lastSeenTimestamp = 0;
  private nearTimer: any = null;
  private farTimer: any = null;

  private targetMac: string | null = null;
  private targetName: string | null = null;
  private targetCustomName: string | null = null;
  private targetUuid: string | null = null;
  private targetType: "BLE" | "Classic" = "BLE";
  private isTargetSet = false;

  // Ciclo di scansione configurabile (durata scansione attiva e intervallo di pausa)
  private scanIntervalSec: number = Constants.DEFAULT_SCAN_INTERVAL_SEC; // es. 20s
  private scanDurationSec: number = Constants.DEFAULT_SCAN_DURATION_SEC;  // es. 5s
  private batterySaverMode: boolean = false;

  // Stato del ciclo attivo
  private cyclePhase: 'idle' | 'scanning' | 'paused' = 'idle';
  private cycleSecondsRemaining: number = 0;
  private cycleTimer: any = null;
  private countdownTimer: any = null;

  private listeners: Set<ScannerServiceListener> = new Set();
  private isRunning = false;

  static getInstance(): ScannerService {
    if (!ScannerService.instance) {
      ScannerService.instance = new ScannerService();
    }
    return ScannerService.instance;
  }

  constructor() {
    this.loadSettings();
    this.loadTargetFromStorage();
  }

  loadSettings(): TrackingSettings {
    try {
      const interval = localStorage.getItem("scan_interval_sec");
      if (interval) this.scanIntervalSec = Math.max(5, Math.min(300, Number(interval)));

      const duration = localStorage.getItem("scan_duration_sec");
      if (duration) this.scanDurationSec = Math.max(2, Math.min(60, Number(duration)));

      const saver = localStorage.getItem("battery_saver_mode");
      if (saver !== null) this.batterySaverMode = saver === "true";
    } catch (e) {
      console.warn("Could not load tracking settings", e);
    }

    return {
      scanIntervalSec: this.scanIntervalSec,
      scanDurationSec: this.scanDurationSec,
      batterySaverMode: this.batterySaverMode,
    };
  }

  updateSettings(settings: Partial<TrackingSettings>) {
    if (settings.scanIntervalSec !== undefined) {
      this.scanIntervalSec = Math.max(5, Math.min(300, settings.scanIntervalSec));
      localStorage.setItem("scan_interval_sec", this.scanIntervalSec.toString());
    }
    if (settings.scanDurationSec !== undefined) {
      this.scanDurationSec = Math.max(2, Math.min(60, settings.scanDurationSec));
      localStorage.setItem("scan_duration_sec", this.scanDurationSec.toString());
    }
    if (settings.batterySaverMode !== undefined) {
      this.batterySaverMode = settings.batterySaverMode;
      localStorage.setItem("battery_saver_mode", this.batterySaverMode.toString());
    }

    // Se il tracking è in corso, riavvia il ciclo con i nuovi parametri
    if (this.isRunning && this.isTargetSet) {
      this.restartTrackingCycle();
    }
  }

  getSettings(): TrackingSettings {
    return {
      scanIntervalSec: this.scanIntervalSec,
      scanDurationSec: this.scanDurationSec,
      batterySaverMode: this.batterySaverMode,
    };
  }

  // --- Gestione Nomi Personalizzati (Alias con tocco lungo) ---
  getAllCustomNames(): Record<string, string> {
    try {
      const data = localStorage.getItem("bt_custom_names");
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  getCustomName(mac: string): string | null {
    if (!mac) return null;
    const map = this.getAllCustomNames();
    return map[mac.toUpperCase()] || null;
  }

  setCustomName(mac: string, customName: string) {
    if (!mac) return;
    try {
      const map = this.getAllCustomNames();
      const cleaned = customName.trim();
      if (cleaned.length > 0) {
        map[mac.toUpperCase()] = cleaned;
      } else {
        delete map[mac.toUpperCase()];
      }
      localStorage.setItem("bt_custom_names", JSON.stringify(map));

      // Se coincide con il target attuale, aggiorna anche il target
      if (this.targetMac && this.targetMac.toUpperCase() === mac.toUpperCase()) {
        this.targetCustomName = cleaned.length > 0 ? cleaned : null;
        localStorage.setItem("target_custom_name", this.targetCustomName || "");
      }

      this.emit({ type: "STATUS_UPDATE", payload: this.getTargetDevice() });
    } catch (e) {
      console.warn("Could not save custom name", e);
    }
  }

  loadTargetFromStorage(): SavedTargetDevice {
    try {
      this.targetMac = localStorage.getItem("target_mac");
      this.targetName = localStorage.getItem("target_name");
      this.targetCustomName = localStorage.getItem("target_custom_name") || null;
      this.targetUuid = localStorage.getItem("target_uuid");
      const savedType = localStorage.getItem("target_type");
      this.targetType = savedType === "Classic" ? "Classic" : "BLE";
      this.isTargetSet = localStorage.getItem("target_set") === "true";

      // Verifica se c'è un custom name aggiornato
      if (this.targetMac) {
        const storedCustom = this.getCustomName(this.targetMac);
        if (storedCustom) this.targetCustomName = storedCustom;
      }

      const lastSeenStr = localStorage.getItem("target_last_seen");
      if (lastSeenStr) this.lastSeenTimestamp = Number(lastSeenStr);
    } catch (e) {
      console.warn("Could not read localStorage", e);
    }
    return this.getTargetDevice();
  }

  setTargetDevice(item: DeviceItem) {
    this.targetMac = item.address;
    this.targetName = item.name;
    this.targetCustomName = item.customName || this.getCustomName(item.address) || null;
    this.targetUuid = item.uuids;
    this.targetType = item.type; // BLE o Classic
    this.isTargetSet = true;
    this.lastSeenTimestamp = Date.now();
    this.isNear = item.rssi >= Constants.RSSI_THRESHOLD;

    try {
      localStorage.setItem("target_mac", item.address);
      localStorage.setItem("target_name", item.name);
      localStorage.setItem("target_custom_name", this.targetCustomName || "");
      localStorage.setItem("target_uuid", item.uuids);
      localStorage.setItem("target_type", item.type);
      localStorage.setItem("target_set", "true");
      localStorage.setItem("target_last_seen", this.lastSeenTimestamp.toString());
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }

    this.startTracking();
  }

  clearTargetDevice() {
    this.stopTracking();
    this.targetMac = null;
    this.targetName = null;
    this.targetCustomName = null;
    this.targetUuid = null;
    this.targetType = "BLE";
    this.isTargetSet = false;
    this.isNear = false;
    this.lastSeenTimestamp = 0;

    try {
      localStorage.removeItem("target_mac");
      localStorage.removeItem("target_name");
      localStorage.removeItem("target_custom_name");
      localStorage.removeItem("target_uuid");
      localStorage.removeItem("target_type");
      localStorage.setItem("target_set", "false");
      localStorage.removeItem("target_last_seen");
    } catch (e) {
      console.warn("Could not remove from localStorage", e);
    }

    this.emit({ type: "STATUS_UPDATE", payload: this.getTargetDevice() });
    this.emit({
      type: "CYCLE_UPDATE",
      payload: {
        isTracking: false,
        phase: 'idle',
        secondsRemaining: 0,
        technology: 'None',
        lastCycleTimestamp: Date.now(),
      } as TrackingCycleState,
    });
  }

  getTargetDevice(): SavedTargetDevice {
    return {
      name: this.targetName,
      customName: this.targetCustomName,
      mac: this.targetMac,
      uuid: this.targetUuid,
      type: this.targetType,
      isSet: this.isTargetSet,
      lastSeen: this.lastSeenTimestamp,
      isNear: this.isNear,
    };
  }

  getCycleState(): TrackingCycleState {
    return {
      isTracking: this.isRunning && this.isTargetSet,
      phase: this.cyclePhase,
      secondsRemaining: this.cycleSecondsRemaining,
      technology: this.cyclePhase === 'scanning' ? this.targetType : 'None',
      lastCycleTimestamp: Date.now(),
    };
  }

  // --- Motore di Tracking Ciclico in Background ---
  startTracking() {
    if (!this.isTargetSet || !this.targetMac) return;
    this.isRunning = true;
    this.runScanningPhase();
  }

  stopTracking() {
    this.isRunning = false;
    this.cyclePhase = 'idle';
    this.cycleSecondsRemaining = 0;
    this.clearTimers();
  }

  private restartTrackingCycle() {
    this.clearTimers();
    if (this.isRunning && this.isTargetSet) {
      this.runScanningPhase();
    }
  }

  private clearTimers() {
    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.nearTimer) {
      clearTimeout(this.nearTimer);
      this.nearTimer = null;
    }
    if (this.farTimer) {
      clearTimeout(this.farTimer);
      this.farTimer = null;
    }
  }

  /**
   * Fase 1: Scansione Attiva mirata per la durata impostata (scanDurationSec)
   * Se il target è BLE -> SOLO scansione BLE
   * Se il target è Classic -> SOLO scansione Bluetooth Classico
   */
  private runScanningPhase() {
    if (!this.isRunning || !this.isTargetSet) return;

    this.cyclePhase = 'scanning';
    this.cycleSecondsRemaining = this.scanDurationSec;
    this.emitCycleUpdate();

    // Avvia countdown al secondo
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.cycleSecondsRemaining = Math.max(0, this.cycleSecondsRemaining - 1);
      this.emitCycleUpdate();
    }, 1000);

    // Esegui la scansione specifica per la tecnologia del target
    this.performTargetSpecificScan();

    // Quando la durata della scansione scade, passa alla fase di pausa
    this.cycleTimer = setTimeout(() => {
      this.runPausePhase();
    }, this.scanDurationSec * 1000);
  }

  /**
   * Fase 2: Pausa per l'intervallo impostato (scanIntervalSec)
   * Antenna disattivata per preservare la batteria
   */
  private runPausePhase() {
    if (!this.isRunning || !this.isTargetSet) return;

    // Se la modalità risparmio energetico è attiva, estendi la pausa del 50%
    const effectiveInterval = this.batterySaverMode
      ? Math.round(this.scanIntervalSec * 1.5)
      : this.scanIntervalSec;

    this.cyclePhase = 'paused';
    this.cycleSecondsRemaining = effectiveInterval;
    this.emitCycleUpdate();

    // Verifica se il target è assente da troppo tempo (> FAR_DEBOUNCE_MS)
    if (this.isNear && this.lastSeenTimestamp > 0 && Date.now() - this.lastSeenTimestamp >= Constants.FAR_DEBOUNCE_MS) {
      this.isNear = false;
      this.playChime(false);
      this.emit({
        type: "ACTION_FAR",
        payload: {
          mac: this.targetMac,
          name: this.targetCustomName || this.targetName,
          technology: this.targetType,
          timestamp: Date.now(),
        },
      });
      this.emit({ type: "STATUS_UPDATE", payload: this.getTargetDevice() });
    }

    this.cycleTimer = setTimeout(() => {
      this.runScanningPhase();
    }, effectiveInterval * 1000);
  }

  /**
   * Scansione mirata per il tipo di tecnologia selezionata
   */
  private performTargetSpecificScan() {
    if (!this.isTargetSet || !this.targetMac) return;

    // Simulazione realistica di propagazione RF per il target salvato:
    // Fluttuazione naturale del segnale attorno a -70 dBm per verificare prossimità
    setTimeout(() => {
      if (!this.isRunning || this.cyclePhase !== 'scanning') return;

      const randomJitter = Math.floor((Math.random() - 0.4) * 12);
      const simulatedRssi = -70 + randomJitter; // segnale medio vicino alla soglia di -75 dBm

      // Solo se il target emette pacchetti compatibili con la sua tecnologia
      const simulatedItem: DeviceItem = {
        name: this.targetName || "Target",
        customName: this.targetCustomName || undefined,
        address: this.targetMac!,
        rssi: simulatedRssi,
        type: this.targetType, // BLE o Classic
        category: this.targetType === "BLE" ? "Tag / Tracker" : "Bluetooth Classico",
        uuids: this.targetUuid || "",
        manufacturer: "Target Monitorato",
        appearance: "N/D",
        modelId: "N/D",
        classificationType: this.targetType,
        classificationBrand: "Target",
        classificationConfidence: 95,
      };

      this.processScanResult(simulatedItem);
    }, 1200);
  }

  private emitCycleUpdate() {
    this.emit({
      type: "CYCLE_UPDATE",
      payload: {
        isTracking: this.isRunning && this.isTargetSet,
        phase: this.cyclePhase,
        secondsRemaining: this.cycleSecondsRemaining,
        technology: this.cyclePhase === 'scanning' ? this.targetType : 'None',
        lastCycleTimestamp: Date.now(),
      } as TrackingCycleState,
    });
  }

  subscribe(listener: ScannerServiceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: {
    type: "SCAN_UPDATE" | "STATUS_UPDATE" | "CYCLE_UPDATE" | "ACTION_NEAR" | "ACTION_FAR";
    payload?: any;
  }) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error("Error in listener", e);
      }
    });
  }

  /**
   * Ricezione e analisi dei pacchetti del dispositivo monitorato
   */
  processScanResult(device: DeviceItem) {
    if (!this.isTargetSet || !this.targetMac) return;

    // Controllo rigoroso della tecnologia: se il target è BLE, ignora pacchetti Classic e viceversa
    if (device.type !== this.targetType) {
      return;
    }

    const address = device.address;
    const name = device.name;
    const uuids = device.uuids;

    const matchesMac = Boolean(this.targetMac && address.toUpperCase() === this.targetMac.toUpperCase());
    const matchesName = Boolean(this.targetName && name && name.toLowerCase() === this.targetName.toLowerCase());
    const matchesUuid = Boolean(
      this.targetUuid &&
        uuids &&
        (uuids.toLowerCase().includes(this.targetUuid.toLowerCase()) ||
          this.targetUuid.split(",").some((u) => uuids.toLowerCase().includes(u.trim().toLowerCase())))
    );

    if (matchesMac || matchesName || matchesUuid) {
      this.lastSeenTimestamp = Date.now();
      try {
        localStorage.setItem("target_last_seen", this.lastSeenTimestamp.toString());
      } catch {}

      this.emit({
        type: "SCAN_UPDATE",
        payload: {
          name: this.targetCustomName || name || "Sconosciuto",
          address: address,
          rssi: device.rssi,
          isNear: this.isNear,
          technology: this.targetType,
          timestamp: this.lastSeenTimestamp,
        },
      });

      this.checkProximity(device.rssi);
    }
  }

  private checkProximity(rssi: number) {
    const nearCondition = rssi >= Constants.RSSI_THRESHOLD;

    if (nearCondition && !this.isNear) {
      if (!this.nearTimer) {
        this.nearTimer = setTimeout(() => {
          if (
            Date.now() - this.lastSeenTimestamp <= Constants.NEAR_DEBOUNCE_MS &&
            this.lastSeenTimestamp > 0 &&
            !this.isNear
          ) {
            this.isNear = true;
            this.playChime(true);
            this.emit({
              type: "ACTION_NEAR",
              payload: {
                mac: this.targetMac,
                name: this.targetCustomName || this.targetName,
                rssi,
                technology: this.targetType,
                timestamp: Date.now(),
              },
            });
            this.emit({ type: "STATUS_UPDATE", payload: this.getTargetDevice() });
          }
          this.nearTimer = null;
        }, Constants.NEAR_DEBOUNCE_MS);
      }
    } else if (!nearCondition && this.isNear) {
      if (!this.farTimer) {
        this.farTimer = setTimeout(() => {
          if (Date.now() - this.lastSeenTimestamp >= Constants.FAR_DEBOUNCE_MS) {
            this.isNear = false;
            this.playChime(false);
            this.emit({
              type: "ACTION_FAR",
              payload: {
                mac: this.targetMac,
                name: this.targetCustomName || this.targetName,
                rssi,
                technology: this.targetType,
                timestamp: Date.now(),
              },
            });
            this.emit({ type: "STATUS_UPDATE", payload: this.getTargetDevice() });
          }
          this.farTimer = null;
        }, Constants.FAR_DEBOUNCE_MS);
      }
    }
  }

  /**
   * Simulazione o test manuale dell'invio intent per MacroDroid
   */
  triggerTestIntent(action: 'ACTION_NEAR' | 'ACTION_FAR') {
    const isNearAction = action === 'ACTION_NEAR';
    this.isNear = isNearAction;
    this.lastSeenTimestamp = Date.now();
    this.playChime(isNearAction);

    const payload = {
      action: isNearAction ? Constants.ACTION_NEAR : Constants.ACTION_FAR,
      mac: this.targetMac || "FC:58:FA:82:11:4E",
      name: this.targetCustomName || this.targetName || "iTAG Tracker",
      rssi: isNearAction ? -68 : -92,
      technology: this.targetType,
      timestamp: Date.now(),
    };

    this.emit({
      type: action,
      payload,
    });
    this.emit({ type: "STATUS_UPDATE", payload: this.getTargetDevice() });
    return payload;
  }

  private playChime(isNear: boolean) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isNear) {
        // Tono acuto ascendente per Vicino (NEAR)
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.36);
      } else {
        // Tono discendente per Lontano (FAR)
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(261.63, ctx.currentTime + 0.25); // C4
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.41);
      }
    } catch {
      // AudioContext restrizioni policy browser
    }
  }
}
