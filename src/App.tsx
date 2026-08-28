import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DeviceItem, SavedTargetDevice, TrackingSettings, TrackingCycleState } from './types';
import { DatabaseManager } from './services/DatabaseManager';
import { BluetoothFingerprinter } from './services/BluetoothFingerprinter';
import { BluetoothScanner } from './services/BluetoothScanner';
import { ScannerService } from './services/ScannerService';
import { DeviceListItem } from './components/DeviceListItem';
import { DeviceManagerView } from './components/DeviceManagerView';
import { DatabaseLogCard } from './components/DatabaseLogCard';
import { RenameModal } from './components/RenameModal';
import { AndroidSourcesModal } from './components/AndroidSourcesModal';
import { ApkGuideModal } from './components/ApkGuideModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export const App: React.FC = () => {
  // Vista attiva: "main" (MainActivity) o "device_manager" (DeviceManagerActivity)
  const [currentView, setCurrentView] = useState<'main' | 'device_manager'>('main');

  // Istanze singleton dei servizi
  const dbManagerRef = useRef<DatabaseManager>(new DatabaseManager());
  const fingerprinterRef = useRef<BluetoothFingerprinter>(
    new BluetoothFingerprinter(dbManagerRef.current)
  );
  const scannerServiceRef = useRef<ScannerService>(ScannerService.getInstance());

  // Stato applicativo
  const [scanning, setScanning] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>("Scansione ferma");
  const [includeClassic, setIncludeClassic] = useState<boolean>(false);
  const [rssiProgress, setRssiProgress] = useState<number>(25); // 0..50, default 25 = -75 dBm
  const [deviceList, setDeviceList] = useState<DeviceItem[]>([]);
  const [debugText, setDebugText] = useState<string>("Inizializzazione database Bluetooth SIG...");
  const [isRefreshingDb, setIsRefreshingDb] = useState<boolean>(false);

  // Target e impostazioni di tracking
  const [targetDevice, setTargetDevice] = useState<SavedTargetDevice>(
    scannerServiceRef.current.getTargetDevice()
  );
  const [trackingSettings, setTrackingSettings] = useState<TrackingSettings>(
    scannerServiceRef.current.getSettings()
  );
  const [cycleState, setCycleState] = useState<TrackingCycleState>(
    scannerServiceRef.current.getCycleState()
  );

  // Modali
  const [renameTargetDevice, setRenameTargetDevice] = useState<DeviceItem | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState<boolean>(false);
  const [isApkGuideOpen, setIsApkGuideOpen] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Soglia RSSI calcolata dal seekbar: -100 + progress
  const minRssi = useMemo(() => -100 + rssiProgress, [rssiProgress]);

  // Istanza BluetoothScanner
  const scannerRef = useRef<BluetoothScanner | null>(null);

  // Helper Toast stile Android
  const showToast = (text: string, duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, duration }]);
  };

  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Inizializzazione scanner e sottoscrizioni
  useEffect(() => {
    const db = dbManagerRef.current;
    const fingerprinter = fingerprinterRef.current;
    const scannerService = scannerServiceRef.current;

    // Carica target iniziale e avvia tracking se già configurato
    const currentTarget = scannerService.loadTargetFromStorage();
    setTargetDevice(currentTarget);
    setTrackingSettings(scannerService.getSettings());
    setCycleState(scannerService.getCycleState());

    if (currentTarget.isSet && currentTarget.mac) {
      const activeName = currentTarget.customName || currentTarget.name || "Target";
      setStatusText(`Tracking attivo per "${activeName}" (${currentTarget.type || "BLE"})`);
      scannerService.startTracking();
    }

    // Carica database SIG iniziale
    db.ensureDatabases().then(() => {
      setDebugText(db.getDebugInfo());
    });

    // Inizializza scanner di ricerca manuale
    const scanner = new BluetoothScanner(db, fingerprinter, (device) => {
      // Aggiorna lista dispositivi
      setDeviceList((prevList) => {
        const existingIndex = prevList.findIndex((d) => d.address === device.address);
        if (existingIndex >= 0) {
          const updated = [...prevList];
          updated[existingIndex] = device;
          return updated;
        } else {
          return [...prevList, device];
        }
      });

      // Notifica anche il motore di tracking se il target è presente
      scannerService.processScanResult(device);
    });

    scanner.setMinRssi(minRssi);
    scanner.setIncludeClassic(includeClassic);
    scannerRef.current = scanner;

    // Sottoscrizione eventi ScannerService
    const unsubscribe = scannerService.subscribe((event) => {
      if (event.type === "ACTION_NEAR") {
        const devName = event.payload?.name || currentTarget.customName || currentTarget.name || "Target";
        showToast(`Target VICINO (NEAR): ${devName} rilevato a ${event.payload?.rssi || -70} dBm`);
        setTargetDevice(scannerService.getTargetDevice());
      } else if (event.type === "ACTION_FAR") {
        const devName = event.payload?.name || currentTarget.customName || currentTarget.name || "Target";
        showToast(`Target LONTANO (FAR): ${devName} assente da >15s`);
        setTargetDevice(scannerService.getTargetDevice());
      } else if (event.type === "CYCLE_UPDATE") {
        setCycleState(event.payload);
      } else if (event.type === "STATUS_UPDATE" || event.type === "SCAN_UPDATE") {
        setTargetDevice(scannerService.getTargetDevice());
      }
    });

    return () => {
      scanner.stopScan();
      unsubscribe();
    };
  }, []);

  // Aggiornamento parametri scanner ricerca
  useEffect(() => {
    if (scannerRef.current) {
      scannerRef.current.setMinRssi(minRssi);
      scannerRef.current.setIncludeClassic(includeClassic);
    }
  }, [minRssi, includeClassic]);

  // Avvia scansione manuale di ricerca
  const handleStartScan = async () => {
    const db = dbManagerRef.current;
    try {
      await db.ensureDatabases();
      setDebugText(db.getDebugInfo());
    } catch (e: any) {
      console.warn("Database ensure error", e);
    }

    setDeviceList([]);
    setScanning(true);
    setStatusText(
      targetDevice.isSet
        ? `Ricerca vicinanze attiva + Tracking (${targetDevice.type || "BLE"})`
        : "Ricerca dispositivi attiva"
    );

    if (scannerRef.current) {
      scannerRef.current.startScan();
    }
  };

  // Ferma scansione manuale di ricerca
  const handleStopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.stopScan();
    }
    setScanning(false);
    setStatusText(
      targetDevice.isSet
        ? `Tracking continuo attivo per ${targetDevice.customName || targetDevice.name}`
        : "Scansione ferma"
    );
  };

  // Selezione dispositivo come target
  const handleDeviceSelected = (item: DeviceItem) => {
    const scannerService = scannerServiceRef.current;
    scannerService.setTargetDevice(item);
    setTargetDevice(scannerService.getTargetDevice());

    const chosenName = item.customName || item.name;
    const message = `Target impostato: ${chosenName} [${item.type}] (${item.address})`;
    showToast(message, 4000);
    setStatusText(`Tracking attivo per "${chosenName}" (${item.type})`);
  };

  // Rimozione target
  const handleClearTarget = () => {
    const scannerService = scannerServiceRef.current;
    scannerService.clearTargetDevice();
    setTargetDevice(scannerService.getTargetDevice());
    setCycleState(scannerService.getCycleState());
    setStatusText(scanning ? "Ricerca dispositivi attiva" : "Scansione ferma");
    showToast("Target rimosso. Monitoraggio fermato.");
  };

  // Aggiornamento impostazioni tracking (durata scansione e intervallo pausa)
  const handleUpdateTrackingSettings = (newSettings: Partial<TrackingSettings>) => {
    const scannerService = scannerServiceRef.current;
    scannerService.updateSettings(newSettings);
    const updated = scannerService.getSettings();
    setTrackingSettings(updated);
    showToast(
      `Parametri tracking salvati: scansione ${updated.scanDurationSec}s ogni ${updated.scanIntervalSec}s`,
      2500
    );
  };

  // Apertura modale rinomina (da tocco lungo o pulsante)
  const handleOpenRename = (device: DeviceItem) => {
    setRenameTargetDevice(device);
    setIsRenameModalOpen(true);
  };

  // Salvataggio nuovo nome / alias
  const handleSaveCustomName = (mac: string, newName: string) => {
    const scannerService = scannerServiceRef.current;
    scannerService.setCustomName(mac, newName);

    // Aggiorna nella lista visibile
    setDeviceList((prev) =>
      prev.map((d) => (d.address === mac ? { ...d, customName: newName || undefined } : d))
    );

    // Aggiorna target se coincide
    const updatedTarget = scannerService.getTargetDevice();
    setTargetDevice(updatedTarget);

    if (newName) {
      showToast(`Alias assegnato per ${mac}: "${newName}"`);
    } else {
      showToast(`Ripristinato nome originale per ${mac}`);
    }
  };

  // Forza aggiornamento database da Bitbucket
  const handleRefreshDatabase = async () => {
    setIsRefreshingDb(true);
    showToast("Connessione a Bitbucket per aggiornare i database Bluetooth SIG...", 2000);
    try {
      const info = await dbManagerRef.current.forceRefreshDatabases();
      setDebugText(info);
      showToast("Aggiornamento database completato.");
    } catch (e: any) {
      showToast(`Errore aggiornamento: ${e?.message || e}`);
    } finally {
      setIsRefreshingDb(false);
    }
  };

  // Test intent broadcast simulato
  const handleTestIntent = (action: 'ACTION_NEAR' | 'ACTION_FAR') => {
    const scannerService = scannerServiceRef.current;
    const payload = scannerService.triggerTestIntent(action);
    const label = action === 'ACTION_NEAR' ? 'ACTION_NEAR (Vicino)' : 'ACTION_FAR (Lontano)';
    showToast(`Intent simulato: ${label} -> MacroDroid riceve MAC: ${payload.mac}, RSSI: ${payload.rssi} dBm`, 4000);
  };

  // Associazione con vero Web Bluetooth se supportato
  const handlePairWebBluetooth = async () => {
    if (!scannerRef.current) return;
    try {
      showToast("Apertura finestra associazione Bluetooth...", 2000);
      const dev = await scannerRef.current.triggerWebBluetoothPairing();
      if (dev) {
        showToast(`Dispositivo associato: ${dev.name}`);
      }
    } catch (err: any) {
      showToast(`Errore Web Bluetooth: ${err?.message || err}`);
    }
  };

  // Dispositivi filtrati
  const filteredDevices = useMemo(() => {
    return deviceList.filter((device) => {
      if (device.rssi < minRssi) return false;
      if (device.type === "Classic" && !includeClassic) return false;
      return true;
    });
  }, [deviceList, minRssi, includeClassic]);

  const targetDisplayName = targetDevice.customName || targetDevice.name;

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col font-sans text-gray-900 antialiased">
      {/* Android Material ActionBar / Top App Bar */}
      <header
        id="app_header"
        className="bg-[#3F51B5] text-white px-3.5 sm:px-5 py-3 shadow-md flex items-center justify-between sticky top-0 z-40"
      >
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-inner">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.88 16.29L13 18.17V14.41l1.88 1.88M13 5.83l1.88 1.88L13 9.59V5.83M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4zm-3.71 8.58l-1 1V14.5l1 1.79zm0-8.58l-1-1v2.79l1-1.79z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold leading-tight truncate">
              BT Scan and Track
            </h1>
            <p className="text-[10px] sm:text-[11px] text-indigo-100 opacity-90 truncate">
              {scanning ? "Scansione ricerca attiva" : "Beacon BLE & Classic Monitor"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Pulsante Guida Scarica/Installa APK */}
          <button
            type="button"
            onClick={() => setIsApkGuideOpen(true)}
            className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1 shadow-2xs"
            title="Guida per scaricare e installare l'APK sullo smartphone Android"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden xs:inline">Installa APK</span>
          </button>

          {/* Pulsante sorgenti Kotlin per GitHub */}
          <button
            type="button"
            onClick={() => setIsSourcesModalOpen(true)}
            className="text-xs bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium hidden sm:flex items-center gap-1"
            title="Visualizza e copia i file Kotlin nativi per Android / GitHub"
          >
            <span>Sorgenti</span>
          </button>

          {/* Pulsante Web Bluetooth se supportato dal browser */}
          {typeof navigator !== "undefined" && "bluetooth" in navigator && (
            <button
              type="button"
              onClick={handlePairWebBluetooth}
              className="text-xs bg-white/15 hover:bg-white/25 text-white px-2 py-1.5 rounded-lg transition-colors hidden md:inline-block font-medium"
              title="Cerca un vero dispositivo hardware BLE via Web Bluetooth"
            >
              + Associa BLE
            </button>
          )}

          {/* Badge target attivo */}
          {targetDevice.isSet && (
            <div
              className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-bold ${
                targetDevice.isNear
                  ? "bg-green-500 text-white animate-pulse"
                  : "bg-indigo-900/80 text-indigo-100 border border-indigo-400/40"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>{targetDevice.isNear ? "VICINO" : "LONTANO"}</span>
            </div>
          )}
        </div>
      </header>

      {/* Sezione stato tracking di background se target impostato */}
      {targetDevice.isSet && (
        <div className="bg-indigo-950 text-indigo-100 px-3.5 sm:px-5 py-2 text-xs flex flex-wrap items-center justify-between border-b border-indigo-900/80 gap-2 shadow-inner">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-white/80">Target:</span>
            <span className="font-bold text-white truncate max-w-[160px] sm:max-w-xs">
              {targetDisplayName}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold shrink-0 ${
              targetDevice.type === "BLE" ? "bg-blue-500 text-white" : "bg-amber-500 text-gray-950"
            }`}>
              {targetDevice.type === "BLE" ? "SOLO BLE" : "SOLO CLASSICO"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-[11px] flex items-center gap-1.5 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  cycleState.phase === 'scanning' ? 'bg-green-400 animate-ping' : 'bg-indigo-400'
                }`}
              />
              <span>
                {cycleState.phase === 'scanning'
                  ? `In scansione (${cycleState.secondsRemaining}s)`
                  : `Pausa (${cycleState.secondsRemaining}s)`}
              </span>
            </span>

            <button
              type="button"
              onClick={() => setCurrentView('device_manager')}
              className="text-[11px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded transition-colors font-medium"
            >
              Frequenza Tracking →
            </button>
          </div>
        </div>
      )}

      {/* Main Content Router */}
      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto p-3.5 sm:p-5">
        {currentView === 'device_manager' ? (
          <DeviceManagerView
            target={targetDevice}
            settings={trackingSettings}
            cycleState={cycleState}
            onBack={() => setCurrentView('main')}
            onClearTarget={handleClearTarget}
            onUpdateSettings={handleUpdateTrackingSettings}
            onRenameTarget={() => {
              if (targetDevice.mac) {
                handleOpenRename({
                  name: targetDevice.name || "Target",
                  customName: targetDevice.customName || undefined,
                  address: targetDevice.mac,
                  rssi: targetDevice.rssi || -70,
                  type: targetDevice.type || "BLE",
                  category: "Target",
                  uuids: targetDevice.uuid || "",
                  manufacturer: "Target",
                  appearance: "N/D",
                  modelId: "N/D",
                  classificationType: "Target",
                  classificationBrand: "Target",
                  classificationConfidence: 100,
                });
              }
            }}
            onTestIntent={handleTestIntent}
            onShowToast={showToast}
          />
        ) : (
          /* MainActivity Layout (Design UX ottimizzato per Mobile) */
          <div id="activity_main" className="flex flex-col flex-1 space-y-3.5">
            
            {/* Status Card con stato in tempo reale */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    scanning ? 'bg-green-500 animate-ping' : 'bg-gray-400'
                  }`}
                />
                <span id="statusText" className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {statusText}
                </span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md shrink-0">
                {filteredDevices.length} rilevati
              </span>
            </div>

            {/* SEPARAZIONE SCANSIONI: Scheda Avvio Ricerca Dispositivi */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-[#3F51B5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Ricerca Dispositivi nelle Vicinanze</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Trova beacon BLE e dispositivi Classici, assegna alias personalizzati o seleziona il target per il monitoraggio in background.
                  </p>
                </div>
              </div>

              {/* Pulsanti Avvia / Ferma con dimensione touch comoda per smartphone */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  id="startButton"
                  type="button"
                  onClick={handleStartScan}
                  disabled={scanning}
                  className="w-full py-2.5 bg-[#3F51B5] hover:bg-[#303F9F] text-white font-bold text-xs uppercase rounded-lg shadow-xs transition-colors disabled:opacity-50 min-h-[42px] flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Avvia Ricerca</span>
                </button>
                
                <button
                  id="stopButton"
                  type="button"
                  onClick={handleStopScan}
                  disabled={!scanning}
                  className="w-full py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-lg shadow-xs transition-colors disabled:opacity-50 min-h-[42px] flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  <span>Ferma</span>
                </button>
              </div>
            </div>

            {/* Pulsante Gestione Dispositivi & Frequenza Tracking (Design moderno Material Card) */}
            <div
              id="manageButton"
              onClick={() => setCurrentView('device_manager')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setCurrentView('device_manager')}
              className="bg-gradient-to-r from-[#303F9F] to-[#3F51B5] hover:from-[#283593] hover:to-[#303F9F] text-white p-3.5 sm:p-4 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 select-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 shadow-inner">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <span>Gestione Dispositivi & Tracking</span>
                    {targetDevice.isSet && (
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[11px] text-indigo-100 opacity-90 leading-tight">
                    {targetDevice.isSet
                      ? `Target: ${targetDisplayName} (${targetDevice.type}) • Regola pause e intent`
                      : "Configura intervalli ciclici, target attivo e intent MacroDroid"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-white/80 shrink-0">
                <span className="text-xs font-semibold hidden sm:inline">Configura</span>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Toggle Includi Bluetooth Classico nella ricerca */}
            <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs gap-3">
              <div className="space-y-0.5">
                <label
                  htmlFor="includeClassicCheckBox"
                  className="text-xs sm:text-sm font-bold text-gray-900 cursor-pointer select-none block"
                >
                  Includi Bluetooth Classico (BR/EDR)
                </label>
                <p className="text-[11px] text-gray-500 leading-tight">
                  Se attivo cerca cuffie e altoparlanti. Se disattivato cerca solo beacon BLE a basso consumo.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  id="includeClassicCheckBox"
                  type="checkbox"
                  checked={includeClassic}
                  onChange={(e) => setIncludeClassic(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3F51B5]" />
              </label>
            </div>

            {/* Sezione Soglia RSSI con Preset Rapidi */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-sm text-gray-900 block">Soglia Minima Segnale RSSI</span>
                  <span className="text-[11px] text-gray-500">Ignora i dispositivi con segnale inferiore</span>
                </div>
                <span id="rssiValueText" className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full font-mono text-xs shadow-2xs">
                  {minRssi} dBm
                </span>
              </div>

              <input
                id="rssiSeekBar"
                type="range"
                min="0"
                max="50"
                value={rssiProgress}
                onChange={(e) => setRssiProgress(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3F51B5]"
              />

              {/* Preset rapidi per RSSI ideali per smartphone touch */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setRssiProgress(0)}
                  className={`py-1 px-1.5 text-[11px] rounded-md border font-medium transition-all text-center ${
                    rssiProgress === 0
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Lontano (-100)
                </button>
                <button
                  type="button"
                  onClick={() => setRssiProgress(25)}
                  className={`py-1 px-1.5 text-[11px] rounded-md border font-medium transition-all text-center ${
                    rssiProgress === 25
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  iTAG (-75)
                </button>
                <button
                  type="button"
                  onClick={() => setRssiProgress(50)}
                  className={`py-1 px-1.5 text-[11px] rounded-md border font-medium transition-all text-center ${
                    rssiProgress === 50
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Vicino (-50)
                </button>
              </div>
            </div>

            {/* Lista dei dispositivi rilevati */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 px-0.5 gap-1">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <span>Dispositivi rilevati</span>
                  <span className="bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                    {filteredDevices.length}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500">
                  Tocca <strong>Seleziona</strong> per monitorare • Tieni premuto per rinominare
                </div>
              </div>

              <div
                id="deviceListView"
                className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xs max-h-[380px] divide-y divide-gray-200"
              >
                {filteredDevices.length > 0 ? (
                  filteredDevices.map((item) => (
                    <DeviceListItem
                      key={item.address}
                      item={item}
                      onSelect={handleDeviceSelected}
                      onRename={handleOpenRename}
                      isTarget={targetDevice.isSet && targetDevice.mac === item.address}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">
                      Nessun dispositivo rilevato con soglia {minRssi} dBm
                    </p>
                    <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                      {scanning
                        ? "Ricerca pacchetti BLE e Classic in corso..."
                        : "Premi 'Avvia Ricerca' per scoprire i beacon e dispositivi Bluetooth nelle vicinanze."}
                    </p>
                    {!scanning && (
                      <button
                        type="button"
                        onClick={handleStartScan}
                        className="mt-1 text-xs uppercase font-bold text-[#3F51B5] hover:text-[#303F9F] bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-200 transition-colors"
                      >
                        Avvia Ricerca Ora
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* SEZIONE LOG DATABASE COLLAPSIBILE AL CLICK DEL NOME */}
            <DatabaseLogCard
              debugText={debugText}
              onRefreshDatabase={handleRefreshDatabase}
              isRefreshing={isRefreshingDb}
            />
          </div>
        )}
      </main>

      {/* Modale Guida Scarica e Installa APK su Smartphone */}
      <ApkGuideModal
        isOpen={isApkGuideOpen}
        onClose={() => setIsApkGuideOpen(false)}
      />

      {/* Modale Rinomina con tocco lungo */}
      <RenameModal
        isOpen={isRenameModalOpen}
        device={renameTargetDevice}
        onClose={() => setIsRenameModalOpen(false)}
        onSave={handleSaveCustomName}
      />

      {/* Modale Sorgenti Android Nativo (Kotlin) */}
      <AndroidSourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
        onCopySuccess={(filename) => showToast(`Codice di ${filename} copiato negli appunti!`)}
      />

      {/* Android Toast Overlay */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
