# Releaseberedskap efter IP-001–IP-009 (2026-11-03)

## Status och beslut

**Rekommendation: villkorat NO-GO för en ny release tills målmiljön har accepterats manuellt.** Detta är en bedömning av tillgänglig evidens, inte ett påstående om att en blockerande programdefekt finns.

- IP-001–IP-009 är mergade till `main`, inklusive PR #265 med refaktorering av organisation × år. Detta dokument baseras på `main`-commit `a493b277971767bb02e402f3bbfd5cfc496e6942`.
- CI för PR #265 på commit `e5b6771f2900561ed5a46ebfd09a2be9f8fe19c8` passerade: https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41702361667
- CI på merge-commit `a493b277971767bb02e402f3bbfd5cfc496e6942` var **fortfarande pågående när underlaget togs fram**: https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41702896134. Uppdatera dess status före ett GO-beslut.
- Den senaste publicerade releasen vid granskningen var **v0.6.7** (2026-11-02), med `utvecklingsanalys-standalone.html` bifogad och grön release-workflow: https://github.com/erland/pwa-utvecklingsanalys/releases/tag/v0.6.7 och https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41521837348.
- **Ingen ny release, tagg eller driftsättning görs i denna PR.** Dokumentet `docs/releases/v0.2.0.md` är historiskt releaseunderlag, inte en aktuell versionsinstruktion.

## Vad som är verifierat automatiskt

| Område | Evidens | Begränsning |
| --- | --- | --- |
| Kodkvalitet och distribution | Verify PWA kör lint, TypeScript, Vitest, Vite, fristående HTML, singlefile-browser och Playwright | Grön CI på releasekandidaten krävs; en äldre PR-körning räcker inte |
| Projektbackup/återställning | `src/portability/store.test.ts`, `e2e/change-045-v2-backup-restore.spec.ts` | Återställning över flera separata IndexedDB-databaser använder en kompensationsjournal, inte atomisk transaktion; verklig avbrottsåterställning måste övas |
| Ändringar i flera flikar | `src/storage/workspaceEvents.test.ts`, `e2e/ip-003-cross-tab-invalidation.spec.ts`, `e2e/ip-006-optional-allocation-conflict.spec.ts` | Revisionsskyddet i IP-006 gäller den utpekade redigeraren; täcker inte bevisligen alla skrivvägar |
| Fördelningar, diagnoser och importer | Tester under `src/domain/`, `src/allocations/`, `src/import/` och `e2e/` | Representativa verkliga Excelvariationer och numerisk källavstämning kräver separat prov |
| Organisation/år och presentation | `src/analytics/OrganizationYearReport.test.tsx` och befintliga Playwright-scenarier | Rendering i installerad PWA, iPad-zoom, tillgänglighet och långlivad session är inte fullt bevisade |
| Prestanda | `src/performance/analysisBaseline.test.ts` | Syntetisk Node/Vitest-CPU-tid, inte respons i iPhone/iPad eller `file://` |

### Prestanda – mätningar på 24 UO

Medianer från GitHub Actions med samma syntetiska scenario (fyra LO per UO, fyra år):

| Steg | IP-007 före optimering | Efter IP-008 (#263) | Efter IP-008b (#264) |
| --- | ---: | ---: | ---: |
| `prepareAnalysisDataset` | 387,89 ms | 398,85 ms | 35,15 ms |
| `analyzeCanonical` | 141,87 ms | 9,15 ms | 7,09 ms |
| `canonicalTrend` | 165,11 ms | 37,34 ms | 39,76 ms |
| `canonicalGroupYears` | 157,17 ms | 24,04 ms | 27,69 ms |
| `allocationTypeOverview` | 111,22 ms | 122,94 ms | 106,02 ms |

Källor: https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41698545382, https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41699965785, https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41701399735. Skillnaderna mellan körningarna är indikatorer och inte garanterad användarupplevd prestanda. Ingen ytterligare optimering föreslås utan ett mätbart användarproblem.

## Öppna risker och verifieringskrav

| ID | Risk / fråga | Konsekvens | Krävd evidens före GO |
| --- | --- | --- | --- |
| RR-01 | Importvariationer i Excel, formler och saknade UO-värden | Förlorade eller felklassificerade uppgifter | Testa flera representativa *syntetiska* filer med cellavvikelser, kompletteringar och återimport; kontrollera källcell mot analys/CSV |
| RR-02 | Återställning, avbruten lagring och olika webbläsarursprung | Svår återhämtning eller dataförlust | Exportera backup; återställ i separat testprofil; kontrollera återställningsjournal och alla berörda konfigurationer; prova Pages och standalone separat |
| RR-03 | Samtidiga flikar och stale editor för andra skrivvägar | Risk för överskrivningar som ännu inte täcks av IP-006 | Prova två flikar för import, fördelningar och andra kritiska ändringar; dokumentera alla upptäckta oskyddade vägar |
| RR-04 | Gränssnitt på iPad och vid hög zoom | Blockerade knappar, tabeller eller navigering | Acceptera alla kritiska arbetsflöden på iPad i stående/liggande samt med tangentbord och zoom |
| RR-05 | Beräkningsparitet och källspårning efter automatiska fördelningar | Felaktig summering eller dubbelräkning | Avstäm UO/LO och IT/verksamhet, timmar/kronor, årsserier, godkännanden, diagnoser och CSV mot syntetisk referens |
| RR-06 | Release från fel commit/tagg eller ej fungerande publicerat paket | Publicerad version överensstämmer inte med testad version | Frys kandidat-SHA, kontrollera green Verify PWA, publicera tagg från samma SHA, verifiera Pages och bifogad standalone efter release |

**Känd teknisk begränsning:** `restoreProject` och källmutationer använder separata IndexedDB-databaser med en återställnings-/undojournal. Det är inte en atomär transaktion över alla databaser. Detta ska inte beskrivas som fullständigt transaktionssäkert och kräver separat återställningsövning.

## Sammanhållet syntetiskt releaseprov (RG-automatisering)

`e2e/rg-integrated-release-acceptance.spec.ts` kör ett sammanhållet projektflöde i Chromium inom ordinarie CI:

1. Skapar två syntetiska Excel-filer (UO A och UO B; 2027 och 2028) utan användar-/produktionsuppgifter.
2. Importerar båda och kontrollerar totaler per år (40 h respektive 60 h), sammanlagt 100 h, organisation × år och årslinjediagram.
3. Exporterar CSV och kontrollerar att samma årsvisa IT-timmar finns i den nedladdade filen.
4. Exporterar full projektbackup och kontrollerar schema/version, kanoniska poster och två källor.
5. Återställer projektet i en separat webbläsarkontext och verifierar årsresultat och tabell igen.

**Automatiseringens gräns:** detta är en syntetisk Chromium-regression och verifierar delar av RG-02, RG-06 och RG-07. Det innebär inte att dessa *manuella* acceptansrader är PASS. Det täcker inte saknade UO-värden, samtliga kostnadsslag, avbruten IndexedDB-skrivning, verklig iPad/Safari, Pages jämfört med `file://` eller publicerad release.

Kör isolerat med `npx playwright test e2e/rg-integrated-release-acceptance.spec.ts` efter `npm run build` (Playwright startar `vite preview` enligt projektkonfigurationen). Testet ingår också i `npm run test:browser`. Dokumentera alltid aktuell CI-körnings URL och kandidat-SHA innan GO.

## Fristående HTML från lokal fil (RG-09, delautomatisering)

`scripts/verify-singlefile-acceptance.mjs` kör den byggda `dist-singlefile/index.html` direkt via `file://` i Playwright Chromium, efter strukturell och grundläggande runtimekontroll. Testet:

- importerar ett syntetiskt UO-underlag med IT-timmar 42 h (2027) och 58 h (2028)
- avstämmer totalt 100 h och respektive budgetår
- exporterar CSV och verifierar årets värden
- tar projektbackup och kontrollerar att den innehåller kanoniska poster och en datakälla
- laddar om den lokala HTML-filen och verifierar att analysen finns kvar

Testet ingår i **Verify PWA** och i **Publish release**. Det är automatisk Chromium-evidens för *en del* av RG-09, inte ett godkännande av Safari/iPad eller publicerad GitHub Pages. Om webbläsarens hantering av `file://` blockerar IndexedDB eller nedladdningar ska det rapporteras som en faktisk miljöbegränsning, inte kringgås genom att förvandla testet till ett HTTP-test.

Kör med `npm run build:singlefile && npx playwright install chromium && node scripts/verify-singlefile-acceptance.mjs`.

## Konkret acceptansprotokoll

Kopiera tabellen till releaseärendet och fyll i faktiska utfall. Lämna inte ett saknat prov som PASS.

| Test-ID | Genomförande | Resultat (PASS/FAIL/EJ KÖRT) | Miljö, källa, ansvarig, datum |
| --- | --- | --- | --- |
| RG-01 | Grön CI på exakt kandidat-SHA | EJ KÖRT | |
| RG-02 | Två syntetiska Excelkällor med flera UO/LO, 2027–2030, avstäm timmar och kostnader | EJ KÖRT | |
| RG-03 | Saknade UO-värden, cellfel, komplettering, återimport och diagnoser | EJ KÖRT | |
| RG-04 | Fördelningar: UO/LO, låsta värden, kostnadsslag, balanser och avvisad ogiltig ändring | EJ KÖRT | |
| RG-05 | Två flikar: en importerar/sparar, den andra får varning/konflikt, inga tysta förluster | EJ KÖRT | |
| RG-06 | Analys: grupper/UO/LO/avdelningar, år, trend, organisation × år, CSV | EJ KÖRT | |
| RG-07 | Backup och återställning i separat profil, verifiera resultat före/efter | EJ KÖRT | |
| RG-08 | iPad stående/liggande, zoom/tangentbord, läsbara diagram och tabeller | EJ KÖRT | |
| RG-09 | Publicerad Pages och separat standalone: syntetisk import, analys, backup | EJ KÖRT | |
| RG-10 | Versions-/SHA-/tagg-/artifactkontroll och verifierad återgångsplan | EJ KÖRT | |

Komplettera också `docs/dev-126-analysis-acceptance.md` vid manuell genomgång av analysvyn.

## Beslutsregel

**GO:** RG-01–RG-10 godkända, inga blockerande avvikelser öppna, backup/återgång prövad och dokumenterat beslut från utsedd ansvarig.

**NO-GO:** någon kritisk kontroll är ej körd/fallerar, utdata går inte att avstämma, lagrade data riskerar att inte kunna återställas eller kandidat-SHA är oklar.

Dokumentera i releaseärendet: beslutsdatum, ansvarig, kandidatcommit, nästa versionsnummer, accepterade avvikelser, backupens lagringsplats och fungerande återgångsrelease. Rapporten ger **inte** ett automatiskt GO-beslut.

## Nästa åtgärd

Slutför manuell syntetisk acceptans och dokumentera ett GO/NO-GO. Om en kontroll fallerar, skapa ett *avgränsat* felärende/PR med reproducerbar fixture och ett test. Undvik bred refaktorering innan behovet är visat.
