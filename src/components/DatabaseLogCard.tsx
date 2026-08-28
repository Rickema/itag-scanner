import React, { useState } from 'react';

interface DatabaseLogCardProps {
  debugText: string;
  onRefreshDatabase: () => Promise<void>;
  isRefreshing?: boolean;
}

export const DatabaseLogCard: React.FC<DatabaseLogCardProps> = ({
  debugText,
  onRefreshDatabase,
  isRefreshing = false,
}) => {
  // L'utente vuole poter ridurre o espandere la sezione al click del nome
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="border border-gray-300 rounded bg-[#F8F9FA] shadow-xs overflow-hidden">
      {/* Header cliccabile per ridurre o espandere */}
      <div
        id="databaseLogHeader"
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 cursor-pointer flex items-center justify-between transition-colors select-none"
        title="Fai clic per espandere o comprimere i dettagli del database Bluetooth SIG"
      >
        <div className="flex items-center space-x-2">
          <svg
            className={`w-4 h-4 text-gray-600 transform transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
            Log Database Bluetooth SIG & Diagnostica
          </span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-gray-500 hidden sm:inline">
            {isExpanded ? "Fai clic sul nome per comprimere" : "Fai clic sul nome per espandere"}
          </span>

          <button
            id="refreshDbButton"
            type="button"
            disabled={isRefreshing}
            onClick={onRefreshDatabase}
            className="text-[10px] uppercase font-bold bg-white hover:bg-gray-50 text-indigo-700 px-2.5 py-1 rounded border border-indigo-200 shadow-xs flex items-center gap-1 transition"
            title="Forza l'aggiornamento dei file YAML da Bitbucket"
          >
            <svg
              className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? "Download..." : "Aggiorna DB"}</span>
          </button>
        </div>
      </div>

      {/* Contenuto espandibile */}
      {isExpanded && (
        <div className="p-3 border-t border-gray-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-gray-600 pb-1 border-b border-gray-200">
            <span>Sorgente: <strong>Bitbucket Bluetooth SIG (assigned_numbers)</strong></span>
            <span className="text-green-700 font-semibold">Cache attiva (30 giorni)</span>
          </div>

          <div className="max-h-36 overflow-y-auto bg-gray-900 text-gray-200 p-2.5 rounded font-mono text-[11px] leading-relaxed select-text">
            <pre id="debugText" className="whitespace-pre-wrap">
              {debugText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
