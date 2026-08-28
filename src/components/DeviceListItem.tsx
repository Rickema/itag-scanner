import React, { useRef, useState } from 'react';
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
  isTarget = false,
}) => {
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      onRename(item);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const isBle = item.type === "BLE";
  const isSignalStrong = item.rssi >= -75;

  const rawName = (item.name || "").trim();
  const isGenericName = !rawName || rawName.toLowerCase() === "ble device" || rawName.toLowerCase() === "dispositivo classico" || rawName.toLowerCase() === "unknown";
  const displayName = item.customName ? item.customName : (isGenericName ? "Sconosciuto" : rawName);

  return (
    <div
      id={`device-item-${item.address.replace(/[^a-zA-Z0-9]/g, '-')}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      className={`p-3.5 sm:p-4 border-b border-gray-200 transition-colors select-none ${
        isTarget ? 'bg-indigo-50/70 border-l-4 border-l-[#3F51B5]' : 'bg-white hover:bg-gray-50'
      }`}
      title="Tieni premuto per rinominare"
    >
      <div className="flex flex-col space-y-2.5">
        
        {/* Intestazione del Dispositivo: Nome + Seleziona Target */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                id="nameText"
                className="text-sm sm:text-base font-bold text-gray-900 truncate"
              >
                {item.customName ? (
                  <span>
                    {item.customName}
                    <span className="text-xs font-normal text-indigo-700 ml-1.5 font-sans">
                      (orig: {isGenericName ? "Sconosciuto" : rawName})
                    </span>
                  </span>
                ) : (
                  displayName
                )}
              </span>

              {/* Pulsante rapido matita rinomina */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(item);
                }}
                className="p-1 text-gray-400 hover:text-[#3F51B5] hover:bg-indigo-50 rounded transition-colors"
                title="Rinomina dispositivo"
                aria-label="Rinomina"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

              {isTarget && (
                <span className="text-[10px] uppercase font-extrabold bg-[#3F51B5] text-white px-2 py-0.5 rounded shadow-2xs">
                  TARGET ATTIVO
                </span>
              )}
            </div>

            {/* Tipologia Riconosciuta reale */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3F51B5] bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                <span>{item.iconEmoji || "🏷️"}</span>
                <span>{item.classificationType}</span>
                <span className="text-indigo-400 font-normal">({item.classificationConfidence}%)</span>
              </span>
            </div>

            {/* Badge Tecnologia & Indirizzo MAC */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span
                id="technologyBadge"
                className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  isBle
                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                    : "bg-amber-50 text-amber-900 border border-amber-300"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isBle ? "bg-blue-600" : "bg-amber-600"}`} />
                <span>{isBle ? "BLE (Low Energy)" : "Bluetooth Classico"}</span>
              </span>

              <span className="text-xs font-mono text-gray-500">
                {item.address}
              </span>
            </div>
          </div>

          {/* Pulsante Seleziona Target */}
          <div className="shrink-0">
            <button
              id={`selectButton-${item.address.replace(/[^a-zA-Z0-9]/g, '-')}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item);
              }}
              className={`text-xs px-3.5 py-2 uppercase font-bold rounded-lg shadow-xs transition-colors min-h-[38px] flex items-center gap-1 ${
                isTarget
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-[#3F51B5] hover:bg-[#303F9F] text-white"
              }`}
            >
              {isTarget ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Target</span>
                </>
              ) : (
                <span>Seleziona</span>
              )}
            </button>
          </div>
        </div>

        {/* Dettagli tecnici approfonditi */}
        <div className="space-y-1 text-xs text-gray-700 bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
          <div id="typeText" className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500 font-medium">Classificazione SIG:</span>
            <span className="font-semibold text-gray-800">{item.classificationType} ({item.classificationConfidence}%)</span>
          </div>

          <div id="manufacturerText" className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500 font-medium">Produttore SIG:</span>
            <span className="truncate max-w-[200px] text-right font-medium text-gray-800" title={item.manufacturer}>
              {item.manufacturer}
            </span>
          </div>

          {isExpanded && (
            <>
              <div id="techDetail" className="flex items-center justify-between text-[11px] pt-0.5">
                <span className="text-gray-500 font-medium">Protocollo:</span>
                <span className={isBle ? "text-blue-700 font-medium" : "text-amber-800 font-medium"}>
                  {isBle ? "Bluetooth LE (GATT / Beacon)" : "Classic BR/EDR (Audio/Serial)"}
                </span>
              </div>

              <div id="appearanceText" className="flex items-center justify-between text-[11px]">
                <span className="text-gray-500 font-medium">Aspetto:</span>
                <span className="truncate max-w-[200px] text-right">{item.appearance}</span>
              </div>

              <div id="uuidText" className="text-[10px] text-gray-500 pt-0.5 truncate" title={item.uuids}>
                <span className="font-semibold text-gray-600">UUIDs: </span>
                {item.uuids}
              </div>

              {item.modelId && item.modelId !== "N/D" && (
                <div id="modelIdText" className="text-[10px] font-mono text-indigo-700">
                  <span className="font-semibold">Fast Pair Model ID:</span> {item.modelId}
                </div>
              )}
            </>
          )}

          {/* Toggle espandi dettagli extra */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold pt-0.5 flex items-center gap-0.5"
          >
            <span>{isExpanded ? "Mostra meno dettagli" : "Mostra UUID e dettagli tecnici..."}</span>
          </button>
        </div>

        {/* Barra di Segnale RSSI */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <div id="rssiText" className="font-medium text-gray-800 flex items-center gap-1.5">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${isSignalStrong ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span>Potenza RSSI: <strong className="font-mono">{item.rssi} dBm</strong></span>
          </div>

          <span className="text-[10px] text-gray-400 font-medium">
            {isBle ? "Target monitorato via BLE" : "Target monitorato via Classico"}
          </span>
        </div>

      </div>
    </div>
  );
};
