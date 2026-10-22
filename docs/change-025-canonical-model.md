# CHANGE-025 – Kanoniskt informationskontrakt v2 (första fasen)

Det nya kontraktet definieras i `src/domain/canonical.ts`. Det är medvetet **separerat från den nuvarande importerade v1-datamodellen** tills nästa steg kan bygga om Exceladapter, dataåtkomst, backup och analysfrågor tillsammans. Ingen gammal import migreras tyst.

## Analysdimensioner

- **Mått:** IT-timmar, verksamhetstimmar, konsultkostnad och övrig kostnad.
- **Aktivitet:** utveckling, förvaltning eller okänd.
- **Organisatorisk redovisningsaxel:** UO/LO (`work`) eller avdelning (`department`). Värden från olika axlar får inte adderas som om de vore oberoende volymer.
- **Period:** år och eventuellt månad.
- **Ursprung och beslut:** original, manuellt eller härlett; rapporterat, väntande eller godkänt.
- **Källhänvisning:** obligatorisk för originalvärden.
- **Arbetsmängd:** `workloadId` grupperar alternativ redovisning inom vald axel.

En rapporterad totalsumma lagras med aktiviteten `unknown`. Godkända delvärden i utveckling och förvaltning kan representera en aktivitetsuppdelning av samma total. En summering använder aldrig både totalen och aktivitetsdelarna. Vid aktivitetsfilter krävs en fullständigt godkänd uppdelning för att den ska användas. Om endast totalen finns markeras aktivitetstäckningen som okänd, inte som noll.

## Acceptans och nästa steg

Enhetstester verifierar: 1000 = 600+400 utan dubbelräkning; okänd aktivitet; avdelning/UO som alternativa axlar; väntande komplettering; validering och versionskontroll.

**Den nuvarande användargränssnittsanalysen och Excelimporten använder ännu v1.** Nästa CHANGE-026 ska koppla importer och kompletteringar till v2-kontraktet, med möjlighet att importera om original Excelarbetsböcker. Först därefter byts huvudanalysen till v2 (CHANGE-027). Det undviker ett läge där delvis migrerade importer ger felaktiga analysresultat.
