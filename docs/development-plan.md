# Utvecklingsplan

Varje steg utförs och verifieras separat. Planeringspaketet föregår DEV-001.

| ID | Resultat | Verifiering och klart-kriterium | Förutsättning |
|---|---|---|---|
| DEV-001 | Körbar React/TS/Vite PWA med navigation, tomt dataset och demoanalys, IndexedDB och projektstruktur | lint, typkontroll, tester, build, PWA-installation/offline-browsertest; GitHub Actions | planeringspaket |
| DEV-002 | Fördjupad Test.xlsx-inventering, fixtures, grundprofil för UO-budget och importer-parser | fixtures/aktuell mall och felaktiga varianter testar cellspårning, subset/dubbelräkning och profilval | 001 |
| DEV-003 | Importguide för batch, förhandsvisning, fältmappning, fel, pauser och återupptagning | E2E genomför och återupptar import med fel och korrigering | 002 |
| DEV-004 | Semantisk datamodell, datakatalog, entitetsmatchning och källspårbarhet | kontrakts-/migrerings-/identitetstester | 003 |
| DEV-005 | Analysmotor, pivot, filter, UO-urval, diagram och gruppmodeller | aggregering/unit/snapshot/dubbelräkningsfall och E2E | 004 |
| DEV-006 | Importprofiler för processarbete, headcount/FTE och generiska tabeller | blandade datakällor med tvetydig matchning och tydlig användarbekräftelse | 004 |
| DEV-007 | Tidsbundna relationer UO/LO/process/avdelning och täckningsanalys | överlappade processkopplingar ger distinkta totalsummor | 006 |
| DEV-008 | Skapbara fördelningstyper, basval och UO→LO-förslag/överstyrning | summa 100 %, ofördelat, viktad aggregering, provenance, ingen cirkel | 005,007 |
| DEV-009 | Kompletteringsguide, scenario, datakvalitetsöversikt och jämförelse av planeringsversioner | acceptanstest med saknade data och godkännandeflöde | 008 |
| DEV-010 | Konfigurationspaket: selektiv export/import, definitions-only, förslag för nytt år, versionshistorik, diff/konfliktlösning och atomära transaktioner | AC-008–011, round-trip, konfliktrollback och migrations-/säkerhetstester | 004,008,009 |
| DEV-011 | Robust projektexport/import, CSV/XLSX, mobil/tillgänglighet och release readiness | återimport med identiskt resultat, browser offline, WCAG-kontroller och CI | 010 |

## Aktuell förvaltning av planen (2026-10-29)

DEV-001–DEV-011 ovan är den ursprungliga etableringsplanen och är historik, inte återstående arbetsuppgifter. Efterföljande ändringssteg har genomförts via separata pull requests. Den senaste avslutade serien är:

- DEV-118: Administrera UO-grupper under Inställningar (PR #132, mergad).
- DEV-119: Gemensam årsvis trend, linjediagram och förändringstabell (PR #133, mergad).
- DEV-120: Direkt synliga analysval och filter (PR #134, mergad).
- DEV-121: Valfri, från början ihopfälld organisationsmatris per år (PR #135, mergad; Verify PWA godkänd på slutlig PR-commit).

Den senaste analysomdesignen är genomförd. **Inget ytterligare utvecklingssteg är beslutat.** Nästa rekommenderade aktivitet är releasebedömning och manuell acceptans i målmiljö, inte automatisk implementering av ännu ett DEV-steg. Följ aktuell implementation, pull requests och CI som källor vid ny planering.

## Föreslagen vidareutveckling: valfria fördelningar (DEV-129–134)

DEV-129 avser specifikation och design, utan kodändringar. Se [DEV-129 – Valfria fördelningstyper](dev-129-optional-allocations.md) för funktionella regler, risker och acceptanskriterier.

| Steg | Leverans | Verifiering |
| --- | --- | --- |
| DEV-129 | Målbild och beslut om omfattning, UO/LO-arv och frivillig analysvisning | Granskning mot befintlig allocations- och canonical-kod |
| DEV-130 | Versionssatt kontrakt, migrering och konfigurationsbackup | Enhetstester, bakåtkompatibel round-trip |
| DEV-131 | UI för definitioner och expanderbar UO/LO-fördelning | Browser-acceptans med arv och överstyrning |
| DEV-132 | Kanoniska basposter och härledd fördelningsmotor | Balans, godkännanden och ingen dubbelräkning |
| DEV-133 | Villkorlig analyssektion med cirkel/tabell och år/org-filter | Integrerad Playwright-acceptans |
| DEV-134 | Slutlig regressions-, offline-, backup- och tillgänglighetskontroll | Grön CI och manuell målmiljöacceptans |

Följande steg genomförs som separata PR:er efter granskning av DEV-129. Tidigare avsnitt är historisk planeringsstatus.
