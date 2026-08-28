import React, { useState } from 'react';

interface ApkGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkGuideModal: React.FC<ApkGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeGuideTab, setActiveGuideTab] = useState<'github' | 'studio' | 'phone_install'>('github');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#303F9F] to-[#3F51B5] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                Come Salvare e Testare l'APK su Android
              </h2>
              <p className="text-xs text-indigo-100 opacity-90">
                Guida passo-passo per installare l'app nativa sul tuo smartphone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Chiudi guida"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-600">
          <button
            type="button"
            onClick={() => setActiveGuideTab('github')}
            className={`py-2 px-1 rounded-lg text-center transition-all ${
              activeGuideTab === 'github'
                ? 'bg-white text-[#3F51B5] shadow-xs font-bold'
                : 'hover:text-gray-900'
            }`}
          >
            1. GitHub Cloud (Facile)
          </button>
          <button
            type="button"
            onClick={() => setActiveGuideTab('studio')}
            className={`py-2 px-1 rounded-lg text-center transition-all ${
              activeGuideTab === 'studio'
                ? 'bg-white text-[#3F51B5] shadow-xs font-bold'
                : 'hover:text-gray-900'
            }`}
          >
            2. Android Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveGuideTab('phone_install')}
            className={`py-2 px-1 rounded-lg text-center transition-all ${
              activeGuideTab === 'phone_install'
                ? 'bg-white text-[#3F51B5] shadow-xs font-bold'
                : 'hover:text-gray-900'
            }`}
          >
            3. Installazione Smartphone
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-gray-700 leading-relaxed">
          
          {/* SCHEDA 1: GITHUB ACTIONS */}
          {activeGuideTab === 'github' && (
            <div className="space-y-3.5">
              {/* Avviso Risoluzione Rapida: Perché non vedi 'Build Android APK'? */}
              <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Non vedi "Build Android APK" su GitHub? Ecco perché:</span>
                </div>
                <div className="text-[11px] space-y-1.5 text-amber-900/90 pl-1">
                  <p>
                    <strong>1. Sincronizza il progetto su GitHub:</strong> I file creati qui in AI Studio (tra cui <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">.github/workflows/build-apk.yml</code>) non sono ancora sul tuo repository GitHub! Clicca in alto a destra su <strong>GitHub</strong> o nel menu <strong>Settings &gt; Export to GitHub / Push</strong> per inviarli.
                  </p>
                  <p>
                    <strong>2. Abilita le Actions su GitHub:</strong> Quando apri la scheda <strong>Actions</strong> per la prima volta su GitHub, se vedi una pagina introduttiva, clicca sul pulsante verde <strong>"I understand my workflows, go ahead and enable them"</strong>.
                  </p>
                  <p>
                    <strong>3. Avvio manuale (Run workflow):</strong> Nella colonna a sinistra di GitHub Actions seleziona <strong>Build Android APK</strong>, poi a destra tocca il pulsante <strong>"Run workflow"</strong> con il tasto verde per avviare subito la compilazione.
                  </p>
                </div>
              </div>

              <div className="bg-indigo-50/70 border border-indigo-200 p-3 rounded-xl">
                <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  Metodo più rapido: Senza installare Android Studio sul PC!
                </span>
                <p className="text-[11px] text-indigo-900">
                  Abbiamo configurato per te la <strong>GitHub Action automatica</strong> (<code className="font-mono bg-white px-1 py-0.5 rounded">.github/workflows/build-apk.yml</code>) che compila l'APK direttamente sui server cloud gratuiti di GitHub.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3F51B5] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-gray-900">Invia i file su GitHub da AI Studio</strong>
                    <p className="text-gray-500 text-[11px]">Nel menu di AI Studio in alto clicca sul pulsante GitHub per fare il push o sincronizzare le ultime modifiche.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3F51B5] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-gray-900">Apri la scheda "Actions" sul tuo repository GitHub</strong>
                    <p className="text-gray-500 text-[11px]">Troverai il workflow <em>"Build Android APK"</em>. Se non è ancora partito, tocca <strong>Run workflow</strong> a destra per farlo partire all'istante.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3F51B5] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-gray-900">Scarica "app-debug-apk" sotto Artifacts</strong>
                    <p className="text-gray-500 text-[11px]">Al termine della spunta verde (1-2 min), scorri in basso nella pagina di esecuzione: troverai l'archivio ZIP con il file <code className="font-mono bg-gray-100 px-1">app-debug.apk</code> da installare sul telefono!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCHEDA 2: ANDROID STUDIO */}
          {activeGuideTab === 'studio' && (
            <div className="space-y-3.5">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="font-bold text-gray-900 text-xs block mb-1">
                  Compilazione manuale con Android Studio sul tuo computer:
                </span>
                <p className="text-[11px] text-gray-600">
                  Tutti i file Kotlin, i layout XML e il file Gradle sono già presenti nella cartella <code className="font-mono bg-white px-1 rounded">app/</code>.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3F51B5] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-gray-900">Scarica il progetto</strong>
                    <p className="text-gray-500 text-[11px]">Clona la repository da GitHub oppure scarica lo ZIP dal menu in alto di AI Studio (<em>Settings &gt; Export to ZIP</em>).</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3F51B5] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-gray-900">Apri Android Studio e fai Sync</strong>
                    <p className="text-gray-500 text-[11px]">Fai clic su <em>File &gt; Open</em> e seleziona la cartella scaricata. Android Studio scaricherà automaticamente le librerie (SnakeYAML, Material, AndroidX).</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3F51B5] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-gray-900">Compila l'APK</strong>
                    <p className="text-gray-500 text-[11px]">Nel menu in alto seleziona <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3F51B5] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">4</span>
                  <div>
                    <strong className="text-gray-900">Invia l'APK al telefono</strong>
                    <p className="text-gray-500 text-[11px]">
                      Clicca su "locate" nella notifica di Android Studio. Troverai il file in <code className="font-mono bg-gray-100 p-0.5 text-[10px] rounded">app/build/outputs/apk/debug/app-debug.apk</code>. Invialo al tuo telefono tramite WhatsApp (invia come documento), Telegram, Google Drive o cavetto USB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCHEDA 3: INSTALLAZIONE SMARTPHONE */}
          {activeGuideTab === 'phone_install' && (
            <div className="space-y-3.5">
              <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl">
                <span className="font-bold text-amber-950 text-xs flex items-center gap-1.5 mb-1">
                  <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Abilitazione "Installa app sconosciute" su Android:
                </span>
                <p className="text-[11px] text-amber-900">
                  Android blocca di default l'installazione di file APK esterni. Bastano 2 tocchi per sbloccarlo:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-gray-900">Tocca il file app-debug.apk sul telefono</strong>
                    <p className="text-gray-500 text-[11px]">Se compare l'avviso di sicurezza <em>"Installazione bloccata"</em>, tocca <strong>Impostazioni</strong>.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-gray-900">Attiva l'interruttore "Consenti da questa origine"</strong>
                    <p className="text-gray-500 text-[11px]">Abilita il permesso per l'app usata per scaricare (Chrome, WhatsApp o Archivio File).</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-gray-900">Tocca "Installa" e apri l'app</strong>
                    <p className="text-gray-500 text-[11px]">All'apertura concedi i permessi Bluetooth ("Dispositivi nelle vicinanze") e Posizione per consentire all'antenna di scansionare i dispositivi.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold uppercase bg-[#3F51B5] hover:bg-[#303F9F] text-white rounded-lg shadow-sm transition-colors"
          >
            Ho capito, Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
