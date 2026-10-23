# CHANGE-026 fortsättning – livscykelkoppling för importer och v2-backup

## Leverans

- UO-budgetens godkännande sparar både befintliga v1-observationer och v2-observationer under en gemensam återställningsjournal med samma projektmetadata.
- Ersätt importerad UO-budget: båda versionerna uppdateras. Radering av källa raderar även tillhörande v2-observationer.
- Källåterställning vid avbrott inkluderar v2-snapshot; tidigare journaler utan v2-fält hanteras med tomt v2-innehåll.
- Projektbackup v3 innehåller ett versionsmärkt `canonical`-avsnitt. Backupvalidering kontrollerar både v2-kontraktets giltighet och att käll-ID finns i projektet.
- Återställning från backup återläser även v2. Vid fel används befintlig rollbackjournal.
- Äldre backupversioner 1 och 2 kan fortsatt läsas men har inga v2-värden och återställer därför ett tomt v2-lager.

## Avgränsningar

Tabellimporter och avdelnings-XLSX-mappning använder fortfarande den befintliga semantiska importkedjan och får inga automatiskt skapade v2-rader. Därför är ny huvudanalys på v2 fortsatt blockerad tills samtliga importtyper och godkända kompletteringar stöds.

Återställningsjournalen omfattar flera IndexedDB-databaser, vilket innebär best-effort-rollback snarare än en enda atomisk databastransaktion. Separat v2-staging kan därför inte tolkas som färdigt analysunderlag förrän vidare implementering.

## Verifiering

Ordinarie CI med TypeScript, lint, enhetstest, Vite/single-file-byggnation och Chromium. Nya tester för backup v3, källreferenser och avsaknad av v2-data. Föregående import- och återställningsregressioner körs också.
