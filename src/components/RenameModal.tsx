import React, { useState, useEffect } from 'react';
import { DeviceItem } from '../types';

interface RenameModalProps {
  device: DeviceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (mac: string, newName: string) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  device,
  isOpen,
  onClose,
  onSave,
}) => {
  const [aliasInput, setAliasInput] = useState('');

  useEffect(() => {
    if (device) {
      setAliasInput(device.customName || device.name || '');
    }
  }, [device]);

  if (!isOpen || !device) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(device.address, aliasInput.trim());
    onClose();
  };

  const handleResetToOriginal = () => {
    onSave(device.address, '');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-lg shadow-xl overflow-hidden border border-gray-300 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Titolo stile Android AlertDialog */}
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#3F51B5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Rinomina Dispositivo (Alias)</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Assegna un nome personalizzato riconosciuto dall'app e utilizzato per il tracking e per gli intent MacroDroid.
          </p>
        </div>

        <form onSubmit={handleSave} className="px-5 py-3 space-y-3">
          <div className="bg-gray-50 p-2.5 rounded text-xs space-y-0.5 border border-gray-200">
            <div className="text-gray-600">
              Nome hardware: <strong>{device.name || "N/D"}</strong>
            </div>
            <div className="font-mono text-gray-500">
              MAC: {device.address} ({device.type})
            </div>
          </div>

          <div>
            <label htmlFor="customAliasInput" className="block text-xs font-semibold text-gray-700 mb-1">
              Nuovo nome / Alias:
            </label>
            <input
              id="customAliasInput"
              type="text"
              autoFocus
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="es. Mio Portachiavi iTAG"
              className="w-full text-sm border-b-2 border-[#3F51B5] px-2 py-1.5 focus:outline-none focus:bg-indigo-50/40"
            />
          </div>

          {/* Azioni stile Material AlertDialog */}
          <div className="pt-3 flex items-center justify-between">
            {device.customName ? (
              <button
                type="button"
                onClick={handleResetToOriginal}
                className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
              >
                Ripristina
              </button>
            ) : <span />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs uppercase font-medium text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="text-xs uppercase font-bold text-white bg-[#3F51B5] hover:bg-[#303F9F] px-4 py-1.5 rounded shadow"
              >
                Salva
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
