# Lösningsarkitektur v0.2

## Val
React + TypeScript + Vite, PWA/service worker, IndexedDB via Dexie, Excelparser i worker (pröva SheetJS/ExcelJS med licens- och säkerhetsgranskning), Zod-validering, TanStack Table, Recharts, Vitest och Playwright. Bygg som modulär monolit med rent domänlager och inga serverkrav. GitHub Pages möjlig deploy; base path och offline-scope testas.

## Moduler
- `import`: filhämtning, profiligenkänning, cell-/tabelltolkning, mappningsguide, validering och importtransaktion.
- `catalog`: objektregister och identitetsupplösning, begreppskatalog (mått/dimensioner/relationsslag).
- `facts`: append-only källobservationer med källreferens, källa, upplösning, scenario och period.
- `relations`: tidsbundna kanter för UO-LO, avdelning-process och UO-process samt beroenden.
- `allocation`: typdefinition, basuttryck via typade filter, arv/förslag, fördelningar och härledda resultaten.
- `analytics`: semantisk frågeplanerare, kompatibilitetskontroll, deduplicering, aggregering och pivotspecifikation.
- `persistence`: transaktionell IndexedDB, projekt- och konfigurationspaketexport/-import, revisionshistorik och migreringar.
- `configuration`: versionssatt katalog, beroendegraf, manifest, export-urval, diff/konfliktlösning, importtransaktion och årskopiering.
- `ui`: Importassistent, Analys, Grupper, Relationer, Kompletteringar, Datakvalitet, Inställningar.

## Kontraktsprinciper
- `Object`: typ, stabilt ID, alias, tidsbundet namn.
- `Measure`: id, dimension (hours, money, count, FTE, ratio), enhet, aggregation (sum, snapshot, weightedRatio, distinctReach etc).
- `Fact`: sourceRef, objectRef, measureRef, quantity, period, planningVersion, scenario, granularity, coverage, quality/status.
- `Relation`: from/to, relationType, validFrom/validTo, strength/coverage, provenance.
- `AllocationType`: base {measureId, filters, scope, unit}, mutuallyExclusive/exhaustive, categories, appliesTo, validPeriod.
- `AllocationRule`: allocationTypeId, scopeRef, scenario, period, shares[], provenance, mode (direct/approvedSuggestion/inherited).
- `AnalysisView`: measures, filters, grouping, chart, saved selection, versionPolicy.
- `ConfigDefinition`: id, kind, schemaVersion, revision, references[], provenance, payload (typat per kind).
- `ConfigInstance`: definitionRef, objectRef, period, planningVersion, scenario, values, approvalState, revision.
- `ConfigPackage`: manifest {formatVersion, packageId, createdAt, contents[], hashes[]}, definitions[], optional instances[], optional assets[].
- `ConfigImportPlan`: mapping[], additions[], conflicts[], missingDependencies[], migrations[], selectedResolutions[].
- `Project`: local schema version, imports, domain data, rules, groupings, views, audit/provenance.

## Risker och kontroller
1. Falsk datakoppling: ID-baserad matchning, godkänn tvetydiga alias.
2. Dubbelräkning: grain/coverage och explicita total/subset-taggar; kontrollera både källsummeringar och analyssummeringar.
3. Olika tidsupplösningar: periodnormalisering och policy för jämförbarhet.
4. Fördelningskorsprodukter: tillåt endast explicit gemensam fördelning eller definierat antagande om oberoende.
5. Mallspridning: mallprofiler + visuell korrigering + regressionsfixturer.
6. Lokal dataförlust: autospara, exportera backup, visa lagringshälsa och kvotvarning.
7. Integritet: allt lokalt; inga spårningsskript eller onödig extern dataöverföring.

## Arkitekturbeslut
ADR-001: Offline-first lokal PWA; ingen backend från start.
ADR-002: Typad semantisk faktamodell och separata importprofiler, inte cellbaserat analyslager.
ADR-003: Originaldata immutabla; antaganden/regler är skilda och versionsbundna.
ADR-004: Guidad import och begränsat typat konfigurationsspråk, inte fri exekverbar scripting.
ADR-005: Analysfrågor går via en gemensam aggregeringsmotor, inte egna summeringar i varje vy.

## Återanvändbar konfiguration och importflöde
- Exportflöde: välj komponenter → välj `definitions-only` / `definitions-and-suggestions` / `full-with-values` → beräkna beroendestängning → förhandsgranska och skriv ett validerat JSON-/ZIP-paket. Inga importerade fakta följer med som standard.
- Importflöde: läs till temporärt mellanlager → validera manifest, checksummor och schema → migrera vid behov → skapa diff och beroendeanalys → välj upplösning för varje konflikt → använd i **en enda IndexedDB-transaktion** → beräkna om materialiserade analysresultat.
- Stabilt objekt-ID skiljs från revisions-ID. Samma definition med samma revision är idempotent; olika revisioner kräver synligt val. Kopiering till nytt år skapar nya regelinstanser kopplade till målåret med `suggested` status, aldrig automatgodkända.
- Paketformat och projektformat har skilda versionsserier och migrationsfunktioner. Arkiv testas mot skadliga sökvägar, extrem storlek, korrupta checksummor och okända konfigurationsobjekt. Ingen godtycklig exekvering vid import.
- Historiken är append-only på konfigurationsnivå och gör det möjligt att återskapa en tidigare version utan att manipulera originalfakta.

ADR-006: Fristående versionssatta konfigurationspaket är ett förstaklasskontrakt; data, definitioner och periodbundna värden separeras.
