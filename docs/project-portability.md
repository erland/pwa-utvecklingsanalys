# DEV-011: Projektbackup och release

Inställningar ger JSON-backup samt CSV/XLSX-utdrag av observationer. JSON innehåller projekt, observationer, scenarier och aktuell konfiguration. CSV/XLSX är endast datautdrag.

Återimport validerar referenser och format före bekräftelse. Ursprungliga arbetsböcker, importer som ännu är utkast och konfigurationens äldre revisionsposter ingår inte i backupen.

Flera IndexedDB-databaser kan inte återställas i en enda atomär transaktion. Vid fel försöker appen återföra tidigare innehåll, men ett avbrott kan hindra detta. Gör alltid en backup före import.

Releasegranskning omfattar lint, TypeScript, enhetstester, Chromium och befintligt PWA-offlinetest. Mobil, tangentbordsnavigation, skärmläsare och återställning i en annan profil behöver särskild verifiering före produktionsklar release.
