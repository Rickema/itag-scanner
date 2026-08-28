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
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-xs overflow-hidden">
      {/* Header cliccabile per ridurre o espandere */}
      <div
        id="databaseLogHeader"
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between transition-colors select-none gap-2"
        title="Fai clic per espandere o comprimere i dettagli del database Bluetooth SIG"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <svg
            className={`w-4 h-4 text-gray-500 shrink-0 transform transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wide truncate">
            Database Bluetooth SIG & Diagnostica
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-gray-400 hidden md:inline">
            {isExpanded ? "Fai clic per comprimere" : "Fai clic per espandere"}
          </span>

          <button
            id="refreshDbButton"
            type="button"
            disabled={isRefreshing}
            onClick={onRefreshDatabase}
            className="text-[10px] uppercase font-bold bg-white hover:bg-gray-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200 shadow-2xs flex items-center gap-1 transition"
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
        <div className="p-3.5 border-t border-gray-200 space-y-2.5 bg-[#F8F9FA]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-600 pb-1.5 border-b border-gray-200 gap-1">
            <span>Sorgente: <strong>Bitbucket Bluetooth SIG (assigned_numbers)</strong></span>
            <span className="text-green-700 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
              Cache attiva locale (30 giorni)
            </span>
          </div>

          <div className="text-[11px] text-gray-500">
            I file YAML (numeri assegnati da Bluetooth SIG per Company Identifiers e Appearance) vengono scaricati e analizzati per riconoscere i costruttori Bluetooth.
          </div>

          <div className="mt-1">
            <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
              Log di caricamento in tempo reale:
            </span>
            <div
              id="debugLogConsole"
              className="font-mono text-[10px] bg-slate-900 text-green-400 p-2.5 rounded-lg h-28 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner"
            >
              {debugText || "Nessun evento registrato finora..."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
