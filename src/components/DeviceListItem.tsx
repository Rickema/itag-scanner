import React, { useRef } from 'react';
import { DeviceItem } from '../types';

interface DeviceListItemProps {
  item: DeviceItem;
  onSelect: (item: DeviceItem) => void;
  onRename: (item: DeviceItem) => void;
  isTarget?: boolean;
}

export const DeviceListItem: React.FC<DeviceListItemProps> = ({
  item,
  onSelect,
  onRename,
  isTarget,
}) => {
  const longPressTimerRef = useRef<any>(null);
  const isLongPressTriggered = useRef<boolean>(false);

  // Gestione tocco prolungato (Long Press di 500ms per rinominare al tocco lungo)
  const handleTouchStart = () => {
    isLongPressTriggered.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      onRename(item);
    }, 550);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const isBle = item.type === "BLE";

  return (
    <div
      id={`device-item-${item.address.replace(/[^a-zA-Z0-9]/g, '-')}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      className={`p-3 border-b border-gray-200 transition-colors select-none ${
        isTarget ? 'bg-indigo-50/80 border-l-4 border-l-[#3F51B5]' : 'bg-white hover:bg-gray-50'
      }`}
      title="Tieni premuto per rinominare (o clicca l'icona matita)"
    >
      <div className="flex items-start justify-between gap-2">
        {/* Informazioni principali */}
        <div className="flex-1 min-w-0">
          {/* Riga 1: Nome con eventuale Alias personalizzato e Badge Tecnologia */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span
              id="nameText"
              className="text-base font-bold text-gray-900 truncate max-w-[280px]"
            >
              {item.customName ? (
                <span>
                  {item.customName}
                  <span className="text-xs font-normal text-indigo-700 ml-1.5 font-sans">
                    (orig: {item.name || "N/D"})
                  </span>
                </span>
              ) : (
                item.name || "Dispositivo Sconosciuto"
              )}
            </span>

            {/* Pulsante rapido rinomina */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRename(item);
              }}
              className="p-1 text-gray-400 hover:text-[#3F51B5] rounded transition-colors"
              title="Rinomina con tocco lungo o clicca qui"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            {/* Badge Target */}
            {isTarget && (
              <span className="text-[10px] uppercase font-bold bg-[#3F51B5] text-white px-2 py-0.5 rounded shadow-xs">
                TARGET ATTIVO
              </span>
            )}
          </div>

          {/* SPECIFICA RICHIESTA: Badge Tecnologia Ben Visibile (BLE vs Bluetooth Classico) */}
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              id="technologyBadge"
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isBle
                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isBle ? "bg-blue-600" : "bg-amber-600"}`} />
              <span>{isBle ? "BLE (Bluetooth Low Energy)" : "Bluetooth Classico (BR/EDR)"}</span>
            </span>

            <span className="text-xs text-gray-500 font-mono">
              MAC: {item.address}
            </span>
          </div>

          {/* Dettagli tecnici approfonditi */}
          <div className="space-y-0.5 text-xs text-gray-700 bg-gray-50/70 p-2 rounded border border-gray-100">
            {/* Dettaglio esplicito tecnologia */}
            <div id="techDetail" className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-gray-800">Tipo protocollo:</span>
              <span className={isBle ? "text-blue-700 font-medium" : "text-amber-800 font-medium"}>
                {isBle ? "Bluetooth Low Energy (Beacon / GATT)" : "Bluetooth Classico (Audio / Serial / Host)"}
              </span>
            </div>

            <div id="typeText" className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-gray-800">Classificazione SIG:</span>
              <span>{item.classificationType} ({item.classificationConfidence}%)</span>
            </div>

            <div id="appearanceText" className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-gray-800">Aspetto (Appearance):</span>
              <span className="truncate max-w-[200px] text-right">{item.appearance}</span>
            </div>

            <div id="manufacturerText" className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-gray-800">Produttore SIG:</span>
              <span className="truncate max-w-[220px] text-right" title={item.manufacturer}>{item.manufacturer}</span>
            </div>

            <div id="uuidText" className="text-[10px] text-gray-500 pt-0.5 truncate" title={item.uuids}>
              <span className="font-semibold text-gray-600">Servizi / UUID: </span>
              {item.uuids}
            </div>

            {item.modelId && item.modelId !== "N/D" && (
              <div id="modelIdText" className="text-[10px] font-mono text-indigo-700">
                <span className="font-semibold">Fast Pair Model ID:</span> {item.modelId}
              </div>
            )}
          </div>

          {/* Indicatore RSSI con pallino di stato */}
          <div className="flex items-center justify-between mt-2 text-xs">
            <div id="rssiText" className="font-medium text-gray-800 flex items-center gap-1.5">
              <span>Segnale RSSI: <strong className="font-mono">{item.rssi} dBm</strong></span>
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${
                  item.rssi >= -75 ? 'bg-green-500' : 'bg-amber-500'
                }`}
                title={item.rssi >= -75 ? 'Segnale forte (>= -75 dBm)' : 'Segnale debole (< -75 dBm)'}
              />
            </div>
            <span className="text-[10px] text-gray-400">
              {isBle ? "Monitoraggio futuro: Solo antenna BLE" : "Monitoraggio futuro: Solo antenna Classic"}
            </span>
          </div>
        </div>

        {/* Pulsante Seleziona Target */}
        <div className="flex flex-col items-end gap-2 ml-1">
          <button
            id={`selectButton-${item.address.replace(/[^a-zA-Z0-9]/g, '-')}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className={`text-xs px-3 py-2 uppercase font-medium rounded shadow transition ${
              isTarget
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-[#3F51B5] hover:bg-[#303F9F] text-white"
            }`}
          >
            {isTarget ? "Selezionato" : "Seleziona"}
          </button>

          <span className="text-[9px] text-gray-400 text-center block w-20 leading-tight">
            Tieni premuto per rinominare
          </span>
        </div>
      </div>
    </div>
  );
};
