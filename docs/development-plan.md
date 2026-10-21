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

Nästa rekommenderade steg: **DEV-001**. Stoppa efter ett verifierat steg enligt System Builder-arbetsflödet.
