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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(`${label} copiato negli appunti!`);
  };

  return (
    <div id="activity_device_manager" className="flex flex-col h-full space-y-4 max-w-2xl mx-auto pb-6">
      {/* Android Activity Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            title="Torna alla scansione"
            aria-label="Torna indietro"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 id="deviceManagerTitle" className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Gestione Dispositivi & Tracking
            </h1>
            <p className="text-[11px] text-gray-500 hidden sm:block">
              Configura target di monitoraggio, cicli energetici e intent MacroDroid
            </p>
          </div>
        </div>

        {target.isSet && (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 flex items-center gap-1.5 ${
              target.isNear
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-gray-100 text-gray-700 border border-gray-300"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${target.isNear ? 'bg-green-600 animate-pulse' : 'bg-gray-500'}`} />
            <span>{target.isNear ? "VICINO" : "LONTANO"}</span>
          </span>
        )}
      </div>

      {/* Segmented Tabs moderne e responsive per Mobile */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-200/70 rounded-xl text-xs font-semibold select-none">
        <button
          type="button"
          onClick={() => setActiveTab('device')}
          className={`py-2 px-1 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'device'
              ? 'bg-white text-[#3F51B5] shadow-xs font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c3.87 0 7 3.13 7 7s-3.13 7-7 7-7-3.13-7-7 3.13-7 7-7zm0 3c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
          </svg>
          <span>Target</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tracking')}
          className={`py-2 px-1 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'tracking'
              ? 'bg-white text-[#3F51B5] shadow-xs font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Frequenza Cicli</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('macrodroid')}
          className={`py-2 px-1 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'macrodroid'
              ? 'bg-white text-[#3F51B5] shadow-xs font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>MacroDroid</span>
        </button>
      </div>

      {/* Tab 1: Dettagli Dispositivo Target */}
      {activeTab === 'device' && (
        <div className="space-y-3.5">
          {target.isSet && target.mac ? (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3.5">
              {/* Riga Intestazione Target */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 leading-tight">
                      {displayName}
                    </h2>
                    <button
                      type="button"
                      onClick={onRenameTarget}
                      className="text-xs text-indigo-700 hover:text-indigo-900 font-medium bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 transition-colors"
                      title="Assegna un nome personalizzato al dispositivo"
                    >
                      Rinomina
                    </button>
                  </div>
                  {target.customName && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Nome hardware originale: <span className="font-medium text-gray-700">{target.name || "N/D"}</span>
                    </p>
                  )}
                </div>

                {/* Badge Tecnologia del Target */}
                <div className="flex items-center">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                      isBle
                        ? "bg-blue-50 text-blue-800 border border-blue-200"
                        : "bg-amber-50 text-amber-900 border border-amber-300"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isBle ? "bg-blue-600" : "bg-amber-600"}`} />
                    <span>{isBle ? "Target BLE (Low Energy)" : "Target Bluetooth Classico"}</span>
                  </span>
                </div>
              </div>

              {/* Informazioni tecniche MAC & UUID */}
              <div className="bg-gray-50/80 p-3 rounded-lg border border-gray-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-gray-500 font-medium">Indirizzo MAC:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900">{target.mac}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(target.mac || "", "Indirizzo MAC")}
                      className="text-[10px] text-indigo-600 hover:underline"
                    >
                      Copia
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-between flex-wrap gap-1">
                  <span className="text-gray-500 font-medium">Servizi UUID:</span>
                  <span className="font-mono text-gray-700 text-right truncate max-w-xs" title={target.uuid || "N/D"}>
                    {target.uuid || "N/D"}
                  </span>
                </div>
              </div>

              {/* Separazione scansione spiegata all'utente */}
              <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                isBle ? "bg-blue-50/70 border-blue-200 text-blue-950" : "bg-amber-50/70 border-amber-200 text-amber-950"
              }`}>
                <div className="font-bold flex items-center gap-1.5 mb-1 text-xs">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Scansione mirata con antenna dedicata:</span>
                </div>
                <p className="text-[11px] text-gray-700">
                  {isBle
                    ? "Poiché il target è un dispositivo BLE, durante il monitoraggio viene attivata ESCLUSIVAMENTE la scansione Bluetooth Low Energy (BluetoothLeScanner), azzerando le interferenze e il consumo del Bluetooth Classico."
                    : "Poiché il target è un dispositivo Bluetooth Classico, durante il monitoraggio viene attivata ESCLUSIVAMENTE la scansione classica BR/EDR (startDiscovery), senza scansione BLE superflua."}
                </p>
              </div>

              {/* Monitoraggio tempo reale del ciclo */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">
                    Stato ciclo in background:
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2 mt-0.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        cycleState.phase === 'scanning'
                          ? 'bg-green-500 animate-ping'
                          : 'bg-indigo-400'
                      }`}
                    />
                    <span>
                      {cycleState.phase === 'scanning'
                        ? `Scansione attiva (${isBle ? 'SOLO BLE' : 'SOLO CLASSICO'}) • ${cycleState.secondsRemaining}s rimasti`
                        : `Pausa di risparmio energetico • ripresa tra ${cycleState.secondsRemaining}s`}
                    </span>
                  </span>
                </div>
                <span className="text-[11px] text-gray-500 font-mono">
                  {target.lastSeen ? `Ultimo pacchetto: ${new Date(target.lastSeen).toLocaleTimeString()}` : "In attesa pacchetto"}
                </span>
              </div>

              {/* Azioni del Target */}
              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const info = `Target: ${displayName}\nMAC: ${target.mac}\nTipo: ${target.type}\nStato: ${target.isNear ? "VICINO" : "LONTANO"}`;
                    onShowToast(info);
                  }}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-2 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Dettagli Toast</span>
                </button>
                <button
                  type="button"
                  onClick={onClearTarget}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-3 py-2 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Rimuovi Target</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-gray-200 text-center space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900">Nessun dispositivo target impostato</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                Torna alla schermata principale di scansione ed effettua la ricerca. Fai clic su <strong>"Seleziona"</strong> sul dispositivo desiderato (es. iTAG o cuffie) per monitorarlo in background.
              </p>
              <button
                type="button"
                onClick={onBack}
                className="mt-2 text-xs uppercase font-bold bg-[#3F51B5] hover:bg-[#303F9F] text-white px-5 py-2.5 rounded-lg shadow-sm transition-colors"
              >
                Vai alla Scansione Dispositivi
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Configurazione Cicli di Scansione (INTERVALLO E DURATA) */}
      {activeTab === 'tracking' && (
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Parametri di Scansione del Tracking
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configura i tempi per bilanciare reattività di rilevamento e autonomia della batteria.
            </p>
          </div>

          {/* Controllo 1: Durata Scansione Attiva */}
          <div className="p-3.5 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-sm text-gray-900 block">
                  1. Durata Scansione Attiva
                </span>
                <span className="text-[11px] text-gray-500">
                  Tempo di ricerca del target con antenna accesa
                </span>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono whitespace-nowrap shadow-2xs">
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
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3F51B5]"
            />

            <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
              <span>2s (Minima)</span>
              <span className="text-indigo-600 font-bold">5s (Consigliata)</span>
              <span>30s (Massima)</span>
            </div>

            {/* Quick Presets per Durata */}
            <div className="flex items-center flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">Preset:</span>
              {[3, 5, 8, 10, 15].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdateSettings({ scanDurationSec: sec })}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                    settings.scanDurationSec === sec
                      ? 'bg-[#3F51B5] text-white border-[#3F51B5] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Controllo 2: Intervallo / Pausa tra scansioni */}
          <div className="p-3.5 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-sm text-gray-900 block">
                  2. Intervallo di Pausa tra Scansioni
                </span>
                <span className="text-[11px] text-gray-500">
                  Antenna spenta per azzerare il consumo energetico
                </span>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono whitespace-nowrap shadow-2xs">
                Pausa: {settings.scanIntervalSec}s
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
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#3F51B5]"
            />

            <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
              <span>5s (Reattività max)</span>
              <span className="text-indigo-600 font-bold">20s (Consigliato)</span>
              <span>180s (Eco max)</span>
            </div>

            {/* Quick Presets per Intervallo */}
            <div className="flex items-center flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">Preset:</span>
              {[10, 20, 30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdateSettings({ scanIntervalSec: sec })}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                    settings.scanIntervalSec === sec
                      ? 'bg-[#3F51B5] text-white border-[#3F51B5] shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Controllo 3: Modalità Risparmio Batteria Intelligente */}
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs sm:text-sm font-bold text-gray-900 block">
                Modalità Risparmio Batteria Intelligente
              </span>
              <span className="text-[11px] text-gray-600 leading-tight block mt-0.5">
                Allunga automaticamente la pausa (+50%) quando il target è stabilmente fermo.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
          <div className="text-xs text-gray-700 bg-gray-100/90 p-3 rounded-xl flex items-center gap-2 border border-gray-200">
            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[11px]">
              <strong>Riepilogo ciclo:</strong> Antenna accesa per <strong>{settings.scanDurationSec}s</strong>, poi spenta per <strong>{settings.scanIntervalSec}s</strong> ({target.type ? `Modalità: Solo ${target.type}` : 'Nessun target configurato'}).
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: MacroDroid & Integrazione Intent Broadcast */}
      {activeTab === 'macrodroid' && (
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
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
            <div className="p-3.5 bg-green-50/70 border border-green-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-600 shrink-0" />
                  <span className="font-bold text-sm text-green-900">
                    Target in Prossimità (NEAR)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onTestIntent('ACTION_NEAR')}
                  className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-md shadow-2xs transition-colors shrink-0 flex items-center gap-1"
                >
                  <span>Testa Evento</span>
                </button>
              </div>

              <div className="bg-white p-2 rounded-lg border border-green-200/80 flex items-center justify-between gap-2 font-mono text-[11px]">
                <div className="truncate text-green-950">
                  <span className="text-green-700 font-sans font-medium mr-1">Action:</span>
                  <strong>{Constants.ACTION_NEAR}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(Constants.ACTION_NEAR, "Action NEAR")}
                  className="text-[11px] font-semibold text-green-800 hover:text-green-950 bg-green-50 px-2 py-0.5 rounded border border-green-200 shrink-0"
                >
                  Copia
                </button>
              </div>

              <p className="text-[11px] text-green-800 leading-relaxed">
                Generato quando il target viene rilevato stabilmente con segnale &ge; -75 dBm per almeno 5 secondi consecutivi.
              </p>
            </div>

            {/* Azione Lontano (FAR) */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                  <span className="font-bold text-sm text-amber-900">
                    Target Allontanato (FAR)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onTestIntent('ACTION_FAR')}
                  className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-md shadow-2xs transition-colors shrink-0 flex items-center gap-1"
                >
                  <span>Testa Evento</span>
                </button>
              </div>

              <div className="bg-white p-2 rounded-lg border border-amber-200/80 flex items-center justify-between gap-2 font-mono text-[11px]">
                <div className="truncate text-amber-950">
                  <span className="text-amber-700 font-sans font-medium mr-1">Action:</span>
                  <strong>{Constants.ACTION_FAR}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(Constants.ACTION_FAR, "Action FAR")}
                  className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0"
                >
                  Copia
                </button>
              </div>

              <p className="text-[11px] text-amber-800 leading-relaxed">
                Generato quando il target non risponde a nessun ciclo di scansione per oltre 15 secondi consecutivi.
              </p>
            </div>

            {/* Extra parametri inviati */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span>Parametri Extra inclusi nel Broadcast:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-white p-2 rounded border border-gray-200">
                  <div className="font-mono font-bold text-gray-900">extra_mac</div>
                  <div className="text-gray-500 text-[10px]">Indirizzo MAC del target (stringa)</div>
                </div>
                <div className="bg-white p-2 rounded border border-gray-200">
                  <div className="font-mono font-bold text-gray-900">extra_name</div>
                  <div className="text-gray-500 text-[10px]">Nome hardware o Alias (stringa)</div>
                </div>
                <div className="bg-white p-2 rounded border border-gray-200">
                  <div className="font-mono font-bold text-gray-900">extra_rssi</div>
                  <div className="text-gray-500 text-[10px]">Potenza segnale (intero dBm)</div>
                </div>
                <div className="bg-white p-2 rounded border border-gray-200">
                  <div className="font-mono font-bold text-gray-900">extra_technology</div>
                  <div className="text-gray-500 text-[10px]">"BLE" oppure "CLASSIC"</div>
                </div>
                <div className="bg-white p-2 rounded border border-gray-200 sm:col-span-2">
                  <div className="font-mono font-bold text-gray-900">extra_timestamp</div>
                  <div className="text-gray-500 text-[10px]">Orario UNIX in millisecondi (long)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pulsante Torna alla scansione */}
      <button
        id="backButton"
        type="button"
        onClick={onBack}
        className="android-btn w-full py-3 uppercase font-bold bg-[#3F51B5] hover:bg-[#303F9F] text-white rounded-xl shadow transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Torna alla Scansione</span>
      </button>
    </div>
  );
};
