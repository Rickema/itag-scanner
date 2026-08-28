import React, { useState } from 'react';
import { SavedTargetDevice, TrackingSettings, TrackingCycleState } from '../types';
import { Constants } from '../constants';

interface DeviceManagerViewProps {
  target: SavedTargetDevice;
  settings: TrackingSettings;
  cycleState: TrackingCycleState;
  onBack: () => void;
  onClearTarget: () => void;
  onUpdateSettings: (newSettings: Partial<TrackingSettings>) => void;
  onRenameTarget: () => void;
  onTestIntent: (action: 'ACTION_NEAR' | 'ACTION_FAR') => void;
  onShowToast: (msg: string) => void;
}

export const DeviceManagerView: React.FC<DeviceManagerViewProps> = ({
  target,
  settings,
  cycleState,
  onBack,
  onClearTarget,
  onUpdateSettings,
  onRenameTarget,
  onTestIntent,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'device' | 'tracking' | 'macrodroid'>('device');

  const isBle = target.type === "BLE";
  const displayName = target.customName || target.name || "Nessun target impostato";

  return (
    <div id="activity_device_manager" className="flex flex-col h-full space-y-4 max-w-2xl mx-auto pb-6">
      {/* Android Activity Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1 text-gray-600 hover:text-gray-900 rounded"
            title="Torna alla scansione"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 id="deviceManagerTitle" className="text-lg font-bold text-gray-900">
            Gestione Dispositivi & Tracking
          </h1>
        </div>

        {target.isSet && (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              target.isNear
                ? "bg-green-100 text-green-800 border border-green-300 animate-pulse"
                : "bg-gray-100 text-gray-700 border border-gray-300"
            }`}
          >
            {target.isNear ? "Stato: IN PROSSIMITÀ (Near)" : "Stato: LONTANO (Far)"}
          </span>
        )}
      </div>

      {/* Tabs stile Android Material */}
      <div className="flex border-b border-gray-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('device')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            activeTab === 'device'
              ? 'border-[#3F51B5] text-[#3F51B5]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Dispositivo Target
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tracking')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            activeTab === 'tracking'
              ? 'border-[#3F51B5] text-[#3F51B5]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Cicli di Scansione
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('macrodroid')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors ${
            activeTab === 'macrodroid'
              ? 'border-[#3F51B5] text-[#3F51B5]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          MacroDroid & Intent
        </button>
      </div>

      {/* Tab 1: Dettagli Dispositivo Target */}
      {activeTab === 'device' && (
        <div className="space-y-3">
          {target.isSet && target.mac ? (
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">
                      {displayName}
                    </h2>
                    <button
                      type="button"
                      onClick={onRenameTarget}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100"
                    >
                      <span>Rinomina</span>
                    </button>
                  </div>
                  {target.customName && (
                    <p className="text-xs text-gray-500">
                      Nome hardware originale: {target.name || "N/D"}
                    </p>
                  )}
                  <p className="text-xs font-mono text-gray-700 mt-1">
                    MAC Address: <strong>{target.mac}</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 break-all">
                    Servizi UUID: {target.uuid || "N/D"}
                  </p>
                </div>

                {/* Badge Tecnologia del Target */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      isBle
                        ? "bg-blue-100 text-blue-800 border border-blue-300"
                        : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isBle ? "bg-blue-600" : "bg-amber-600"}`} />
                    <span>{isBle ? "Target BLE" : "Target Bluetooth Classico"}</span>
                  </span>
                </div>
              </div>

              {/* SEPARAZIONE SCANSIONE SPIEGATA ALL'UTENTE */}
              <div className={`p-3 rounded border text-xs ${
                isBle ? "bg-blue-50/80 border-blue-200 text-blue-900" : "bg-amber-50/80 border-amber-200 text-amber-950"
              }`}>
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Scansione di tracking separata e mirata:</span>
                </div>
                <p>
                  {isBle
                    ? "Poiché il target è un dispositivo BLE, durante il monitoraggio viene attivata ESCLUSIVAMENTE la scansione Bluetooth Low Energy (BluetoothLeScanner), azzerando le interferenze e il consumo del Bluetooth Classico."
                    : "Poiché il target è un dispositivo Bluetooth Classico, durante il monitoraggio viene attivata ESCLUSIVAMENTE la scansione classica BR/EDR (startDiscovery), senza scansione BLE superflua."}
                </p>
              </div>

              {/* Monitoraggio tempo reale del ciclo */}
              <div className="bg-gray-50 p-3 rounded border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-700 block">
                    Stato ciclo attivo:
                  </span>
                  <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        cycleState.phase === 'scanning'
                          ? 'bg-green-500 animate-ping'
                          : 'bg-indigo-400'
                      }`}
                    />
                    <span>
                      {cycleState.phase === 'scanning'
                        ? `Scansione in corso (${isBle ? 'SOLO BLE' : 'SOLO CLASSICO'}) - rimangono ${cycleState.secondsRemaining}s`
                        : `Pausa di risparmio energetico - prossima scansione tra ${cycleState.secondsRemaining}s`}
                    </span>
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {target.lastSeen ? `Ultimo segnale: ${new Date(target.lastSeen).toLocaleTimeString()}` : "Nessun pacchetto"}
                </span>
              </div>

              {/* Azioni */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const info = `Target: ${displayName}\nMAC: ${target.mac}\nTipo: ${target.type}\nStato: ${target.isNear ? "VICINO" : "LONTANO"}`;
                    onShowToast(info);
                  }}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded border border-indigo-200"
                >
                  Mostra Dettagli (Toast)
                </button>
                <button
                  type="button"
                  onClick={onClearTarget}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium px-3 py-1.5 rounded border border-red-200"
                >
                  Rimuovi Target
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-800">Nessun dispositivo target impostato</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Torna alla schermata principale di scansione ed effettua la ricerca. Fai clic su "Seleziona" sul dispositivo desiderato per impostarlo come target.
              </p>
              <button
                type="button"
                onClick={onBack}
                className="mt-2 text-xs uppercase font-medium bg-[#3F51B5] hover:bg-[#303F9F] text-white px-4 py-2 rounded shadow"
              >
                Vai alla scansione
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Configurazione Cicli di Scansione (INTERVALLO E DURATA) */}
      {activeTab === 'tracking' && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Parametri di Scansione del Tracking
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Definisci ogni quanto tempo eseguire la scansione e per quanti secondi mantenerla attiva per bilanciare reattività e autonomia della batteria.
            </p>
          </div>

          {/* Controllo 1: Durata Scansione Attiva */}
          <div className="space-y-2 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-800">
                1. Durata scansione attiva:
              </span>
              <span className="font-bold text-[#3F51B5] font-mono text-base">
                {settings.scanDurationSec} secondi
              </span>
            </div>
            <input
              id="scanDurationInput"
              type="range"
              min="2"
              max="30"
              step="1"
              value={settings.scanDurationSec}
              onChange={(e) => onUpdateSettings({ scanDurationSec: Number(e.target.value) })}
              className="w-full h-2 bg-gray-300 rounded appearance-none cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>2 sec (Minima)</span>
              <span>5 sec (Consigliata)</span>
              <span>30 sec (Massima)</span>
            </div>

            {/* Quick Presets per Durata */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Preset:</span>
              {[3, 5, 8, 10, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdateSettings({ scanDurationSec: sec })}
                  className={`text-xs px-2 py-0.5 rounded border ${
                    settings.scanDurationSec === sec
                      ? 'bg-[#3F51B5] text-white border-[#3F51B5]'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Controllo 2: Intervallo / Pausa tra scansioni */}
          <div className="space-y-2 p-3 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-800">
                2. Ogni quanto effettuare la scansione (Pausa):
              </span>
              <span className="font-bold text-[#3F51B5] font-mono text-base">
                ogni {settings.scanIntervalSec} secondi
              </span>
            </div>
            <input
              id="scanIntervalInput"
              type="range"
              min="5"
              max="180"
              step="5"
              value={settings.scanIntervalSec}
              onChange={(e) => onUpdateSettings({ scanIntervalSec: Number(e.target.value) })}
              className="w-full h-2 bg-gray-300 rounded appearance-none cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] text-gray-500">
              <span>5 sec (Reattività max)</span>
              <span>20 sec (Consigliato)</span>
              <span>180 sec (Risparmio estremo)</span>
            </div>

            {/* Quick Presets per Intervallo */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Preset:</span>
              {[10, 20, 30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdateSettings({ scanIntervalSec: sec })}
                  className={`text-xs px-2 py-0.5 rounded border ${
                    settings.scanIntervalSec === sec
                      ? 'bg-[#3F51B5] text-white border-[#3F51B5]'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Controllo 3: Modalità Risparmio Energetico (Battery Saver) */}
          <div className="p-3 bg-indigo-50/50 rounded border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-gray-900 block">
                Modalità Risparmio Batteria Intelligente
              </span>
              <span className="text-xs text-gray-600">
                Aumenta dinamicamente la pausa (+50%) per preservare la batteria dello smartphone.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.batterySaverMode}
                onChange={(e) => onUpdateSettings({ batterySaverMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3F51B5]" />
            </label>
          </div>

          {/* Riepilogo Ciclo Corrente */}
          <div className="text-xs text-gray-600 bg-gray-100 p-2.5 rounded">
            <strong>Riepilogo ciclo:</strong> Antenna accesa per <strong>{settings.scanDurationSec}s</strong>, poi spenta per <strong>{settings.scanIntervalSec}s</strong> ({target.type ? `Modalità: Solo ${target.type}` : 'Nessun target'}).
          </div>
        </div>
      )}

      {/* Tab 3: MacroDroid & Integrazione Intent Broadcast */}
      {activeTab === 'macrodroid' && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Integrazione con MacroDroid Pro
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              L'applicazione invia Intent Broadcast standard su Android. Configura il trigger in MacroDroid seguendo questi dati esatti.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            {/* Azione Vicino (NEAR) */}
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="font-bold text-green-900 flex items-center justify-between">
                <span>1. Trigger DISPOSITIVO VICINO (NEAR):</span>
                <button
                  type="button"
                  onClick={() => onTestIntent('ACTION_NEAR')}
                  className="text-[10px] uppercase font-bold bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded shadow-xs"
                >
                  Testa Evento Near
                </button>
              </div>
              <p className="font-mono text-[11px] text-green-950 mt-1 bg-white/70 p-1.5 rounded border border-green-100">
                Action: <strong>{Constants.ACTION_NEAR}</strong>
              </p>
              <p className="text-green-800 mt-1">
                Generato quando il target viene rilevato stabilmente con segnale superiore a -75 dBm per almeno 5 secondi consecutivi.
              </p>
            </div>

            {/* Azione Lontano (FAR) */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded">
              <div className="font-bold text-amber-900 flex items-center justify-between">
                <span>2. Trigger DISPOSITIVO LONTANO (FAR):</span>
                <button
                  type="button"
                  onClick={() => onTestIntent('ACTION_FAR')}
                  className="text-[10px] uppercase font-bold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded shadow-xs"
                >
                  Testa Evento Far
                </button>
              </div>
              <p className="font-mono text-[11px] text-amber-950 mt-1 bg-white/70 p-1.5 rounded border border-amber-100">
                Action: <strong>{Constants.ACTION_FAR}</strong>
              </p>
              <p className="text-amber-800 mt-1">
                Generato quando il target non risponde a nessun ciclo di scansione per oltre 15 secondi consecutivi.
              </p>
            </div>

            {/* Extra parametri inviati */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-1">
              <div className="font-bold text-gray-800">
                Parametri Extra inclusi nell'Intent:
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-600 font-mono text-[11px]">
                <li><code>extra_mac</code>: Indirizzo MAC del target (stringa)</li>
                <li><code>extra_name</code>: Nome o Alias assegnato (stringa)</li>
                <li><code>extra_rssi</code>: Potenza segnale RSSI rilevata (intero in dBm)</li>
                <li><code>extra_technology</code>: "BLE" oppure "CLASSIC"</li>
                <li><code>extra_timestamp</code>: Orario rilevamento (millisecondi)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Pulsante Torna alla scansione */}
      <button
        id="backButton"
        type="button"
        onClick={onBack}
        className="android-btn w-full py-2.5 uppercase font-medium bg-[#3F51B5] hover:bg-[#303F9F] text-white rounded shadow transition"
      >
        Torna alla Scansione
      </button>
    </div>
  );
};
