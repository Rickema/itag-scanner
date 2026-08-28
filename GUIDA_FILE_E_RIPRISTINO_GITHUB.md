# 📌 Guida: Dove trovare i file e come ripristinare i vecchi file su GitHub

---

## 1. 🛡️ I TUOI FILE VECCHI NON SONO PERSI! Come ritrovarli su GitHub in 3 clic

Quando hai collegato o esportato il progetto da Google AI Studio verso la tua repository GitHub, è stato eseguito un nuovo commit sul branch principale (`main`), che ha sovrascritto l'albero visualizzato nella pagina iniziale della repository. 

**In Git, nessun file viene cancellato definitivamente!** La cronologia conserva ogni singola versione precedente.

### Procedura per rivedere o recuperare i vecchi file:
1. Apri la tua repository su GitHub: `https://github.com/<tuo-utente>/<tua-repo>`
2. Nella barra in alto sopra l'elenco dei file, cerca la scritta **"commits"** (accanto all'icona dell'orologio, con il numero dei commit totali, es. *"5 commits"* o *"History"*). Cliccaci sopra.
3. Troverai la cronologia con l'elenco di tutti i salvataggi nel tempo:
   - Il commit più in alto è l'ultimo (quello esportato da AI Studio).
   - Subito sotto troverai il **tuo commit precedente** (quello originale con tutti i tuoi vecchi file intatti!).
4. Fai clic sul pulsante con il simbolo **`< >`** (*"Browse the repository at this point in the history"*) alla destra del tuo vecchio commit:
   - GitHub ti mostrerà l'intera repository esattamente come era prima, con tutti i tuoi vecchi file!
   - Da lì puoi consultarli, fare clic su **Code > Download ZIP** per averne una copia di backup, oppure fare un merge.
5. **Verifica anche i branch:** In alto a sinistra nella pagina principale di GitHub c'è il selettore del ramo (es. `main` o `master`). Controlla se i vecchi file si trovano sul ramo `master` e il nuovo export è andato su `main`.

---

## 2. 📂 DOVE COPIARE I FILE NEL PROGETTO ANDROID

Tutti i file sorgenti dell'applicazione nativa Android sono stati **già posizionati nella cartella `app/` di questa repository**, seguendo l'esatta struttura standard di Android Studio.

Ecco la mappa completa dei file e dei rispettivi percorsi:

```text
├── app/
│   ├── build.gradle                                               <-- Dipendenze Gradle (SnakeYAML, SDK 34)
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml                                <-- Permessi BLE/Classico, Attività e Servizio
│           ├── java/
│           │   └── com/
│           │       └── example/
│           │           └── itagscanner/
│           │               ├── DatabaseManager.kt                 <-- Download & parse YAML SIG da Bitbucket (con fix lastError)
│           │               ├── ScannerService.kt                  <-- Servizio background, scansione BLE vs Classic, MacroDroid
│           │               ├── MainActivity.kt                    <-- Scansione principale, filtri RSSI, espandi log
│           │               ├── DeviceManagerActivity.kt           <-- Configurazione target, frequenza e durata scansione
│           │               ├── DeviceItem.kt                      <-- Modello dati dispositivo e classificazione
│           │               └── DeviceListAdapter.kt               <-- Adapter ListView con badge tecnologia
│           └── res/
│               ├── layout/
│               │   ├── activity_main.xml                          <-- Schermata principale (Log riducibile, lista device)
│               │   ├── activity_device_manager.xml                <-- Schermata gestione cicli e test broadcast
│               │   └── device_list_item.xml                       <-- Layout singolo elemento lista con badge BLE/Classico
│               └── values/
│                   ├── colors.xml                                 <-- Colori tema Material
│                   └── strings.xml                                <-- Nome app ("BT Scan and Track")
```

---

## 3. ⚙️ SPECIFICHE TECNICHE IMPLEMENTATE

1. **Separazione Netta Scansioni nel Servizio (`ScannerService.kt`)**:
   - Se il target impostato è **BLE**: viene eseguita **SOLO** la scansione `bluetoothLeScanner.startScan()`.
   - Se il target impostato è **Bluetooth Classico**: viene eseguita **SOLO** la scansione BR/EDR `bluetoothAdapter.startDiscovery()`.
   - Nessun consumo inutile di batteria dovuto a scansioni miste non pertinenti.

2. **Frequenza e Durata Scansione Personalizzabili (`DeviceManagerActivity.kt`)**:
   - Slider **Durata scansione attiva**: da 2 a 30 secondi (default: 5 sec).
   - Slider **Intervallo di pausa**: da 5 a 120 secondi (default: 20 sec).
   - I valori vengono salvati in `SharedPreferences` e letti dal servizio `ScannerService`.

3. **Dettaglio Tecnologia nello Scan Principale**:
   - Ogni dispositivo mostra chiaramente se è **BLE (Bluetooth Low Energy)** o **Bluetooth Classico (BR/EDR)** con badge cromatici distinti (Blu per BLE, Arancione per Classico).

4. **Sezione Log Database SIG Riducibile**:
   - Cliccando sull'intestazione *"📁 LOG DATABASE SIG"*, il pannello di debug testuale si espande o si riduce a piacimento.

5. **Integrazione MacroDroid Broadcast Intent**:
   - `com.example.itagscanner.ACTION_NEAR`: inviato quando il target è vicino (RSSI >= -75 dBm con debounce di 5s). Include extras: `extra_mac`, `extra_name`, `extra_rssi`, `extra_technology`, `extra_timestamp`.
   - `com.example.itagscanner.ACTION_FAR`: inviato quando il target è assente per oltre 15s.

---

## 4. 🤖 PERCHÉ NON VEDI "BUILD ANDROID APK" SU GITHUB E COME RISOLVERE

Se sei andato su GitHub e non trovi la voce **"Build Android APK"**:

### Motivo 1: I file sono ancora in Google AI Studio e devono essere esportati su GitHub
Le modifiche apportate in questo ambiente (incluso il workflow `.github/workflows/build-apk.yml`) non arrivano su GitHub in tempo reale finché non le esporti.
- Clicca in alto a destra su **Settings > Export to GitHub** (oppure l'icona GitHub o **Share**) per inviare il codice al tuo repository.

### Motivo 2: Le Actions di GitHub devono essere attivate
Quando apri per la prima volta la scheda **"Actions"** su una repository GitHub, GitHub mostra una schermata introduttiva:
- Clicca sul pulsante verde: **"I understand my workflows, go ahead and enable them"**.

### Motivo 3: Avvio manuale immediato (Run workflow)
1. Nella barra laterale sinistra della scheda **Actions**, clicca su **"Build Android APK"**.
2. A destra comparirà il pulsante grigio **"Run workflow"**. Cliccaci sopra e premi il pulsante verde **Run workflow**.
3. In circa 1-2 minuti la compilazione completerà con successo (spunta verde).
4. Clicca sull'esecuzione completata: in fondo troverai **Artifacts > app-debug-apk** con il file `.apk` pronto da scaricare e installare sul telefono!

### Metodo Alternativo senza GitHub: Android Studio su PC
1. Da AI Studio: **Settings > Export to ZIP**.
2. Estrai lo ZIP e aprilo in Android Studio (**File > Open**).
3. Seleziona **Build > Build Bundle(s) / APK(s) > Build APK(s)**: troverai l'APK in `app/build/outputs/apk/debug/app-debug.apk`.

