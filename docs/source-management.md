# Källhantering – ta bort, ersätt och töm importerade data

Källregistret finns i **Import**. Godkända datakällor kan tas bort en och en, ersättas efter granskning av ny XLSX eller tömmas i sin helhet.

- **Ta bort** kräver inmatning av `TA BORT`. Projektets registrering, observationer med motsvarande `datasetId` och tillhörande budgetutkast raderas.
- **Ersätt** behåller ursprunglig källa oförändrad medan användaren väljer fil, kontrollerar importprofil/mappning och godkänner. Den godkända importen skrivs med det tidigare käll-ID:t och ersätter tidigare observationer; felaktiga utkast ändrar inte godkända värden.
- **Töm importerade data** kräver samma explicita bekräftelse och tar bort alla registrerade källors observationer och budgetutkast.
- Gemensamma entiteter, relationer, UO-gruppmodeller, planering och konfigurationshistorik behålls för att inte radera användarens egna modeller av misstag.
- En återställningsjournal i IndexedDB håller en kopia av projektregister, semantisk modell och budgetutkast under en källmutation. Vid avbruten operation återställs föregående tillstånd vid nästa start. Olika databaser är inte en atomär transaktion; återställning bygger på att IndexedDB fungerar.
- Projektbackup före ändring rekommenderas. Tabellimport har sedan tidigare ingen persistent kopia av originalfilen i importutkast.

## Verifiering
Automatiska enhetstester för selektiv borttagning och Playwright-tester för import→ersättning→borttagning samt tömning krävs tillsammans med projektets ordinarie CI. Även befintliga importer och analyser ska gå igenom utan regressionsfel.
