# CHANGE-013 – Import och analys, återkoppling från verklig Excelimport

## Målbild och beslut
1. **Liveförhandsgranskning vid mappning:** Visa befintligt värde intill varje blad-/cell-/rad-/kolumnfält. Visningen ska uppdateras när fältet redigeras, utan att importresultatet tyst skrivs om. Användaren klickar uttryckligen på Tillämpa mappning. **Steg 1.**
2. **Representativa importexempel:** Visa ett exempel per identifierat mått, antal detaljvärden och källcell, i stället för de första 15 råa observationerna som oftast gäller samma mått. **Steg 1.**
3. **En begriplig Excelimportingång:** Nuvarande ”tabellfil” och ”Excelfil” accepterar båda XLSX; skillnaden är datalayout/profil. Föreslagen UI: en filväljare, automatisk layoutidentifiering och en profilväljare (UO-budget, process/personal/generisk tabell) med tydlig förklaring och möjlighet att byta. Säkerställ att gamla utkast kan återupptas. **Steg 2 – implementerat på arbetsgren: en gemensam XLSX-väljare med struktursökning och manuellt profilval; budgetutkast sparas som tidigare, tabellimport fortsätter med separat granskning.**
4. **Redigerbara UO-grupper:** Grupperingsmodeller med stabila ID och explicit medlemskap, flera modeller, spara i befintlig konfiguration; påverkar analys utan att röra originalobservationer. Varna vid överlapp och redovisa hur dubbelräkning hanteras. **Steg 3.**
5. **Staplar och cirkeldiagram:** Samma aggregerade queryresultat; cirkeldiagram endast för icke-negativa andelar och positiv total, tydlig legend/tabell för tillgänglighet. **Steg 4.**
6. **Visa tidsförändring:** Vid ”Alla år” välj total, grupperade års-staplar eller trendlinje. Beräkna årsserier från deduplicerade detaljer och bevara filter/urval; ingen dubbelräkning av månads- och årssummeringar. **Steg 5.**
7. **Alla timmar/alla kostnader:** Härled summeringsmått per enhetsfamilj (h respektive SEK), summera endast mått med aggregation=sum. Visa vilka delmått som ingår; blanda aldrig timmar med FTE/antal eller kostnader med andra enheter. **Steg 6.**

## Acceptans och risker
- Alla förhandsgranskningar bygger på den lagrade originalfilen och det aktuella, *ännu inte tillämpade* mappingutkastet. Formelvärden märks som beräknade/cachelagrade; överlagring får inte läsa eller köra makron.
- En byte-för-byte kompatibel projektbackup och importerade originalobservationer får inte påverkas av UI-förändringar.
- Varje ändringssteg kräver lint, typkontroll, enhetstester, bygg, Playwright och relevanta nya regressionstester innan det slutförs.
- Avsaknad av särskild gruppmodell får inte ändra nuvarande analysresultat. Snapshotmått som FTE ingår inte i summa timmar.
- **Nuvarande fokus:** Steg 2, gemensam XLSX-väljare, automatisk profilrouting och bevarade importflöden.
