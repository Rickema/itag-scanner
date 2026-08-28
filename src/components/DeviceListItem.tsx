import React, { useRef, useState } from 'react';
import { DeviceItem } from '../types';

interface DeviceListItemProps {
  item: DeviceItem;
  onSelect: (item: DeviceItem) => void;
  onInspect?: (item: DeviceItem) => void;
  onRename: (item: DeviceItem) => void;
  isTarget?: boolean;
}

export const DeviceListItem: React.FC<DeviceListItemProps> = ({
  item,
  onSelect,
  onInspect,
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

  const calculateDistance = (rssi: number, txPower = -59): string => {
    if (!rssi || rssi === 0) return "N/D";
    const ratio = (rssi * 1.0) / txPower;
    if (ratio < 1.0) {
      return `${Math.pow(ratio, 10).toFixed(1)} m`;
    } else {
      return `${(0.89976 * Math.pow(ratio, 7.7095) + 0.111).toFixed(1)} m`;
    }
  };

  const isBle = item.type === "BLE";
  const rawName = (item.name || "").trim();
  const isGenericName =
    !rawName ||
    rawName.toLowerCase() === "ble device" ||
    rawName.toLowerCase() === "dispositivo classico" ||
    rawName.toLowerCase() === "unknown" ||
    rawName.toLowerCase() === "n/d";

  // Se sconosciuto -> sempre "Sconosciuto"
  const displayName = item.customName
    ? item.customName
    : isGenericName
    ? "Sconosciuto"
    : rawName;

  const estimatedDist = item.estimatedDistance && item.estimatedDistance !== "N/D"
    ? item.estimatedDistance
    : calculateDistance(item.rssi);

  const isSignalStrong = item.rssi >= -75;

  return (
    <div
      id={`device-item-${item.address.replace(/[^a-zA-Z0-9]/g, '-')}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onClick={() => setIsExpanded(!isExpanded)}
      className={`p-3.5 sm:p-4 border-b border-gray-200 transition-all cursor-pointer select-none ${
        isTarget
          ? 'bg-indigo-50/80 border-l-4 border-l-[#3F51B5]'
          : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex flex-col space-y-2">
        
        {/* RIGA 1 (In Scansione): Nome + Tag BLE (Solo se BLE) + MAC + Metri + Tasto Target */}
        <div className="flex items-center justify-between gap-2">
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Nome del dispositivo */}
              <span id="nameText" className="text-sm sm:text-base font-bold text-gray-900 truncate">
                {item.customName ? (
                  <span>
                    {item.customName}
                    <span className="text-xs font-normal text-indigo-700 ml-1 font-sans">
                      ({isGenericName ? "Sconosciuto" : rawName})
                    </span>
                  </span>
                ) : (
                  displayName
                )}
              </span>

              {/* Tag SINTETICO solo per BLE (Nessun tag per Classico) */}
              {isBle && (
                <span
                  id="technologyBadge"
                  className="bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0"
                >
                  BLE
                </span>
              )}

              {isTarget && (
                <span className="text-[10px] uppercase font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded shrink-0">
                  TARGET ATTIVO
                </span>
              )}
            </div>

            {/* Indirizzo MAC + Distanza stimata in Metri + RSSI */}
            <div className="flex items-center gap-2 text-xs font-mono text-gray-600 mt-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isSignalStrong ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-semibold text-gray-900">{item.address}</span>
              <span className="text-gray-400">•</span>
              <span className="text-indigo-700 font-bold font-sans">~{estimatedDist}</span>
              <span className="text-gray-400 font-normal">({item.rssi} dBm)</span>
            </div>
          </div>

          {/* Pulsante Target Diretto */}
          <div className="shrink-0 flex items-center gap-1.5">
            <button
              id={`selectButton-${item.address.replace(/[^a-zA-Z0-9]/g, '-')}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(item);
              }}
              className={`text-xs px-3 py-1.5 font-bold rounded-lg transition-colors min-h-[36px] flex items-center gap-1 uppercase tracking-wide ${
                isTarget
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-[#3F51B5] hover:bg-[#303F9F] text-white'
              }`}
            >
              {isTarget ? 'TARGET' : 'TARGET'}
            </button>
            <span className="text-gray-400 text-xs pl-1">
              {isExpanded ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {/* DETTAGLI ESPANSI AL TOCCO */}
        {isExpanded && (
          <div className="mt-2 pt-2.5 border-t border-gray-100 bg-slate-50 p-3 rounded-lg space-y-2 text-xs text-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Classificazione:</span>
              <span className="font-bold text-indigo-900 bg-indigo-100/80 px-2 py-0.5 rounded text-[11px]">
                {item.classificationType} ({item.classificationConfidence}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Produttore SIG:</span>
              <span className="font-semibold text-gray-900">{item.manufacturer}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Tecnologia Protocollo:</span>
              <span className="font-medium text-gray-800">
                {isBle ? 'Bluetooth Low Energy (GATT)' : 'Bluetooth Classico (BR/EDR)'}
              </span>
            </div>

            {item.appearance && item.appearance !== 'N/D' && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Aspetto GAP:</span>
                <span className="font-medium text-gray-800">{item.appearance}</span>
              </div>
            )}

            {item.uuids && (
              <div className="text-[11px] text-gray-600">
                <span className="font-semibold text-gray-700 block mb-0.5">Servizi Pubblicizzati:</span>
                <span className="bg-white p-1.5 rounded border border-gray-200 block font-mono text-[10px] break-all">
                  {item.uuids}
                </span>
              </div>
            )}

            {item.modelId && item.modelId !== 'N/D' && (
              <div className="flex items-center justify-between font-mono text-[11px] text-indigo-800 bg-indigo-50 p-1.5 rounded border border-indigo-100">
                <span className="font-semibold">Fast Pair Model ID:</span>
                <span>{item.modelId}</span>
              </div>
            )}

            {/* PULSANTI AZIONI DENTRO IL PANNELLO ESPANSO */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-200">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(item);
                }}
                className="text-xs px-2.5 py-1.5 font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-md transition-colors"
              >
                Rinomina
              </button>

              {onInspect && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspect(item);
                  }}
                  className="text-xs px-3 py-1.5 font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 rounded-md transition-colors uppercase tracking-wider"
                >
                  INTERROGA DISPOSITIVO
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
