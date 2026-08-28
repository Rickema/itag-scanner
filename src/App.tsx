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
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Android Material ActionBar / Top App Bar */}
      <header
        id="app_header"
        className="bg-[#3F51B5] text-white px-4 py-3 shadow-md flex items-center justify-between sticky top-0 z-40"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm tracking-wider">
            BT
          </div>
          <div>
            {/* Nome nuovo richiesto: "BT Scan and Track" */}
            <h1 className="text-lg font-medium leading-tight">BT Scan and Track</h1>
            <p className="text-[11px] text-indigo-100 opacity-90">
              {scanning ? "Scansione di ricerca in corso" : "Monitoraggio & Fingerprinting"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pulsante sorgenti Kotlin per GitHub */}
          <button
            type="button"
            onClick={() => setIsSourcesModalOpen(true)}
            className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded transition-colors font-medium flex items-center gap-1"
            title="Visualizza e copia i file Kotlin nativi per Android / GitHub"
          >
            <span>Sorgenti Android</span>
          </button>

          {/* Pulsante Web Bluetooth */}
          {typeof navigator !== "undefined" && "bluetooth" in navigator && (
            <button
              type="button"
              onClick={handlePairWebBluetooth}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded transition-colors hidden sm:inline-block"
              title="Cerca un vero dispositivo hardware BLE via Web Bluetooth"
            >
              + Associa BLE
            </button>
          )}

          {/* Badge target attivo */}
          {targetDevice.isSet && (
            <div
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                targetDevice.isNear
                  ? "bg-green-500 text-white animate-pulse"
                  : "bg-indigo-800 text-indigo-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>{targetDevice.isNear ? "VICINO" : "LONTANO"}</span>
            </div>
          )}
        </div>
      </header>

      {/* Sezione stato tracking di background se target impostato */}
      {targetDevice.isSet && (
        <div className="bg-indigo-900 text-indigo-100 px-4 py-2 text-xs flex flex-wrap items-center justify-between border-b border-indigo-950 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">Target Attivo:</span>
            <span className="font-bold text-white underline decoration-indigo-400">
              {targetDisplayName}
            </span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
              targetDevice.type === "BLE" ? "bg-blue-500 text-white" : "bg-amber-500 text-gray-900"
            }`}>
              {targetDevice.type === "BLE" ? "SOLO BLE" : "SOLO CLASSICO"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  cycleState.phase === 'scanning' ? 'bg-green-400 animate-ping' : 'bg-indigo-400'
                }`}
              />
              <span>
                {cycleState.phase === 'scanning'
                  ? `In scansione (${cycleState.secondsRemaining}s)`
                  : `In pausa (${cycleState.secondsRemaining}s)`}
              </span>
            </span>

            <button
              type="button"
              onClick={() => setCurrentView('device_manager')}
              className="text-[11px] underline hover:text-white font-medium"
            >
              Impostazioni cicli →
            </button>
          </div>
        </div>
      )}

      {/* Main Content Router */}
      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto p-4 sm:p-5">
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
          /* MainActivity Layout (1:1 con layout Android) */
          <div id="activity_main" className="flex flex-col flex-1 space-y-3.5">
            {/* statusText */}
            <div
              id="statusText"
              className="text-base sm:text-lg font-bold text-gray-900 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    scanning ? 'bg-green-500 animate-ping' : 'bg-gray-400'
                  }`}
                />
                <span>{statusText}</span>
              </span>
              {deviceList.length > 0 && (
                <span className="text-xs font-normal text-gray-500">
                  {filteredDevices.length} trovati
                </span>
              )}
            </div>

            {/* SEPARAZIONE SCANSIONI: Spiegazione visuale */}
            <div className="bg-white p-3 rounded border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
              <div>
                <span className="font-semibold text-gray-800">Scansione di Ricerca Dispositivi:</span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Trova tutti i dispositivi vicini per visualizzarli, rinominarli con tocco lungo o selezionare il target.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  id="startButton"
                  type="button"
                  onClick={handleStartScan}
                  disabled={scanning}
                  className="android-btn px-3 py-1.5 bg-[#3F51B5] hover:bg-[#303F9F] text-white uppercase font-bold text-xs rounded shadow transition disabled:opacity-50"
                >
                  Avvia Ricerca
                </button>
                <button
                  id="stopButton"
                  type="button"
                  onClick={handleStopScan}
                  disabled={!scanning}
                  className="android-btn android-btn-secondary px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white uppercase font-bold text-xs rounded shadow transition disabled:opacity-50"
                >
                  Ferma
                </button>
              </div>
            </div>

            {/* manageButton: Gestione dispositivi & intervalli tracking */}
            <button
              id="manageButton"
              type="button"
              onClick={() => setCurrentView('device_manager')}
              className="android-btn android-btn-accent w-full py-2.5 bg-[#FF4081] hover:bg-[#F50057] text-white uppercase font-medium rounded shadow transition flex items-center justify-center gap-2"
            >
              <span>Gestione Dispositivi & Frequenza Tracking</span>
              {targetDevice.isSet && (
                <span className="w-2 h-2 rounded-full bg-white ml-1 animate-pulse" />
              )}
            </button>

            {/* includeClassicCheckBox */}
            <div className="flex items-center justify-between bg-white p-2.5 rounded border border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  id="includeClassicCheckBox"
                  type="checkbox"
                  checked={includeClassic}
                  onChange={(e) => setIncludeClassic(e.target.checked)}
                  className="w-4 h-4 text-[#3F51B5] border-gray-300 rounded focus:ring-[#3F51B5] cursor-pointer"
                />
                <label
                  htmlFor="includeClassicCheckBox"
                  className="text-xs font-semibold text-gray-800 cursor-pointer select-none"
                >
                  Includi Bluetooth Classico nella ricerca
                </label>
              </div>

              <span className="text-[10px] text-gray-400">
                Se disattivo: cerca solo BLE
              </span>
            </div>

            {/* rssi threshold section */}
            <div className="bg-white p-3 rounded border border-gray-200 space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-700">
                <span className="font-semibold">Soglia minima RSSI (dBm):</span>
                <span id="rssiValueText" className="font-bold text-gray-900 font-mono text-sm">
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
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>-100 dBm (Lontano)</span>
                <span>-75 dBm (Standard iTAG)</span>
                <span>-50 dBm (Molto vicino)</span>
              </div>
            </div>

            {/* deviceListView */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Dispositivi rilevati ({filteredDevices.length})
                </div>
                <div className="text-[11px] text-gray-400">
                  Tieni premuto su un dispositivo per rinominarlo
                </div>
              </div>

              <div
                id="deviceListView"
                className="flex-1 overflow-y-auto bg-white rounded border border-gray-300 shadow-inner max-h-[380px] divide-y divide-gray-200"
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
                    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600">Nessun dispositivo rilevato con soglia {minRssi} dBm</p>
                    <p className="text-xs text-gray-400 max-w-xs">
                      {scanning
                        ? "Ricerca pacchetti BLE e Classic in corso..."
                        : "Premi 'Avvia Ricerca' per scoprire i dispositivi nelle vicinanze."}
                    </p>
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
