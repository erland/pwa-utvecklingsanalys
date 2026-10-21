# DEV-011: Projektbackup och release

Inställningar ger JSON-backup samt CSV/XLSX-utdrag av observationer. JSON innehåller projekt, observationer, scenarier och aktuell konfiguration. CSV/XLSX är endast datautdrag.

Återimport validerar referenser och format före bekräftelse. Sparade importutkast inklusive deras arbetsboksbytes samt konfigurationens revisionsposter ingår i v2. Originalarbetsböcker som aldrig sparats eller har raderats kan däremot inte återskapas.

Flera IndexedDB-databaser kan inte återställas i en enda atomär transaktion. Vid fel försöker appen återföra tidigare innehåll, men ett avbrott kan hindra detta. Gör alltid en backup före import.

Releasegranskning omfattar lint, TypeScript, enhetstester, Chromium och befintligt PWA-offlinetest. Mobil, tangentbordsnavigation, skärmläsare och återställning i en annan profil behöver särskild verifiering före produktionsklar release.

## Recovery journal

Before replacing project data, the app saves the previous project state locally. On restart, an unfinished restoration is recovered before loading the project. This is crash recovery with compensation, not a multi-database atomic transaction. Keep an external backup because local storage may itself be lost.

## Format v2

JSON-arkivet inkluderar sparade arbetsboksbytes (Base64) från importutkast, även utkast som ännu inte godkänts, samt konfigurationsrevisioner. Format v1 accepteras fortsatt vid import men innehåller inte dessa delar. En backup kan bli stor, särskilt om flera XLSX-filer finns lagrade. Den aktuella importgränsen i gränssnittet gäller JSON-filens storlek; för större projekt behöver gränsen och minneshanteringen anpassas. Inga källdata checkas in i GitHub.
