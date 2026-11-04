# KF-006 – Samlad releaseverifiering och GO/NO-GO-underlag

**Datum:** 2026-11-03  
**Repository:** `erland/pwa-utvecklingsanalys`  
**Granskad main-commit:** `b169b243f40b2060226c75e1a3cf70f7eda51e22` (mergad PR #274/KF-005)  
**Ändringstyp:** endast evidens, acceptansunderlag och arbetsstatus; **ingen produktionskod, release eller tagg**.

## Samlad bedömning

**Releasebeslut: NO-GO / manuell acceptans återstår.** De fem implementeringsstegen KF-001–KF-005 är mergade, men **grön automatiserad verifiering är inte detsamma som godkänd releaseacceptans i målmiljön**. De manuella RG-kontrollerna har inte utförts inom KF-006 och får inte markeras PASS på grundval av syntetiska CI-tester.

Senast publicerade GitHub Release vid granskningen: [v0.6.7](https://github.com/erland/pwa-utvecklingsanalys/releases/tag/v0.6.7), publicerad **2026-11-02**, med `utvecklingsanalys-standalone.html`. En ny release ska peka på en **ny, exakt godkänd kandidat-SHA** och inte härledas från `package.json` (som anger ett historiskt `0.2.0`).

### Evidens från förbättringsserien

| Steg | PR | Verifierad kod/CI | Status |
| --- | --- | --- | --- |
| KF-001: characterization av lost-update | [#270](https://github.com/erland/pwa-utvecklingsanalys/pull/270) | [41713591629](https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41713591629) | Mergad; observerad kvarvarande legacy-risk dokumenterad |
| KF-002: transaktionsbaserad GapState-CAS för utvalda skribenter | [#271](https://github.com/erland/pwa-utvecklingsanalys/pull/271) | [41715499310](https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41715499310) | Mergad; **inte** globalt revisionsskydd |
| KF-003: separerade importkompletteringsregler | [#272](https://github.com/erland/pwa-utvecklingsanalys/pull/272) | [41718986862](https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41718986862) | Mergad; beteendebevarande refaktorering |
| KF-004: riktade cross-tab-meddelanden | [#273](https://github.com/erland/pwa-utvecklingsanalys/pull/273) | [41721692516](https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41721692516) | Mergad; meddelanden skyddar **inte** ensamma mot dataförlust |
| KF-005: projektets livscykel utbruten till hook | [#274](https://github.com/erland/pwa-utvecklingsanalys/pull/274) | [41723885451](https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41723885451) | Mergad; beteendebevarande refaktorering |

**Viktigt om käll-SHA:** Resultaten ovan avser respektive PR-head, inte någon framtida release-tag. Verifiering på aktuell main/kandidat måste fortsatt kontrolleras separat. Main-körning [41724581146](https://github.com/erland/pwa-utvecklingsanalys/actions/runs/41724581146) startade efter merge av KF-005; kontrollera slutresultatet före GO. KF-006:s egen PR kräver också grön Verify PWA före merge.

## Riskregister: RR-01–RR-06

| ID | Aktuell bedömning | Automatiskt underlag | Kvarvarande GO-evidens |
| --- | --- | --- | --- |
| **RR-01 – Excelvariationer** | **ÖPPEN / manuell acceptans saknas** | Importtester och syntetiskt integrerat releaseprov `e2e/rg-integrated-release-acceptance.spec.ts`; domäntester under `src/import/` | Syntetiska variationer med formler, trasiga celler, saknade UO-värden, komplettering och återimport; spåra källcell till beräknat värde |
| **RR-02 – Backup och kraschåterhämtning** | **ÖPPEN / risk kvarstår** | `src/portability/store.test.ts`, `e2e/change-045-v2-backup-restore.spec.ts`, integrerat backup/restore-test | Öva export, avbruten återställning, journalåterhämtning och avstämning i separat profil; skilj Pages från `file://` och annat HTTP(S)-ursprung |
| **RR-03 – Flera flikar/stale skrivningar** | **DELVIS MINSKAD, fortfarande öppen** | `src/gaps/store.guarded-writes.test.ts`, `e2e/kf-002-gapstate-concurrent-tabs.spec.ts`, `e2e/kf-004-scoped-workspace-invalidation.spec.ts`, `e2e/ip-003-cross-tab-invalidation.spec.ts`, IP-006-test | Inventera och åtgärda alternativt uttryckligen acceptera resterande `saveGapState(next)`-anrop utan CAS; kör tvåflikstest för importkomplettering och kritiska förändringar |
| **RR-04 – iPad/zoom/tillgänglighet** | **ÖPPEN / målmiljö ej accepterad** | Responsivitets-/tangentbordstester och `e2e/release-a11y.spec.ts` | iPad stående/liggande, zoom, tangentbord, VoiceOver, läsbara tabeller och diagram; dokumentera enhet/Safari-version |
| **RR-05 – Beräkningsparitet/spårbarhet** | **ÖPPEN / numerisk manuell acceptans saknas** | Kanoniska analys-/fördelningstester, `e2e/rg-integrated-release-acceptance.spec.ts` | Stäm av UO, LO, tim- och kostnadsslag, utveckling/förvaltning, låsta andelar, trend, CSV samt tomma/saknade observationer mot syntetiskt facit |
| **RR-06 – Releaseintegritet/publicering** | **ÖPPEN tills faktisk kandidat och publicering är verifierade** | `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `scripts/verify-singlefile-acceptance.mjs`, `e2e/rg-pages-deployment.spec.ts` | Frys SHA, godkänn CI på exakt SHA, skapa tagg på samma SHA; verifiera både publicerad Pages-URL och nedladdad HTML; öva återgång |

### Tekniska begränsningar och öppna PR:er

1. **Öppna PR #256:** [Gruppera importkompletteringar per UO](https://github.com/erland/pwa-utvecklingsanalys/pull/256) är ett **draft** från äldre bas och är enligt GitHubs mergeability `dirty` mot aktuell main. Den ändrar `src/import/UoImportCompletionView.tsx`, en fil som omarbetats i KF-003. Gör ett uttryckligt beslut: uppdatera och granska dess återstående unika beteende, eller stäng den som ersatt. **Mergas inte automatiskt.**
2. **Oskyddade skrivvägar:** `saveGapState(state,expected)` kör CAS i en IndexedDB-transaktion; `saveGapState(state)` gör fortfarande en ovillkorlig skrivning. I `src/import/UoImportCompletionView.tsx` används fortfarande `saveGapState(next)` efter en separat kontroll av `uoImportCompletions`, vilket **inte** är atomiskt. BroadcastChannel ger varningar men låser inte data. Denna rest-risk ska lösas eller dokumenterat riskaccepteras innan GO.
3. **Återställning:** Flera IndexedDB-databaser har ingen gemensam atomisk transaktion; journalbaserad kompensation kräver verkligt felprov.
4. **Publiceringskedja:** `release.yml` publicerar Pages i ett eget jobb och testar **efteråt** den faktiska Pages-adressen. Ett fel i `pages-acceptance` betyder att något **kan ha hunnit publiceras** och att återgång måste bedömas manuellt.
5. **Tillgänglighet:** `docs/release-acceptance.md` gäller historisk initial release, inte ett automatiskt godkännande för nästa release. Den innehåller uttryckliga undantag för manuella VoiceOver-, zoom- och fokusprov.
6. **Paketering:** lokal `file://` och Pages har olika lagringsursprung; att byta distributionsform flyttar inte automatiskt IndexedDB-projekt. Backup måste prövas.

## Testtäckning och beslutskontroller RG-01–RG-10

**Statusfält gäller manuell releaseacceptans, inte förekomsten av automatiska tester.** Resultaten nedan är därför medvetet `EJ KÖRT` i denna revision.

| ID | Kontroll före GO | Automatisk delgrund finns? | Manuell releaseacceptans |
| --- | --- | --- | --- |
| RG-01 | Grön Verify PWA på **fryst** kandidat-SHA | Ja, CI-workflow; kandidat ska fastställas | **EJ KÖRT** |
| RG-02 | Minst två syntetiska UO/LO-Excelkällor 2027–2030, timmar och kronor | Delvis, RG-integration och importtester | **EJ KÖRT** |
| RG-03 | Saknade UO-värden, cellfel, komplettering, återimport | Delvis, import- och kompletteringstester | **EJ KÖRT** |
| RG-04 | UO/LO-fördelning, låsning, balansering och ogiltig ändring | Delvis, fördelningstester | **EJ KÖRT** |
| RG-05 | Två flikar, relevanta varningar, inga tysta uppdateringsförluster | Delvis, KF-002/KF-004/IP-003/IP-006 | **EJ KÖRT** |
| RG-06 | Årsanalys, grupper/avdelningar/LO, CSV och trendsummering | Delvis, RG-integration/analystester | **EJ KÖRT** |
| RG-07 | Export/import av backup i separat profil + avbrottstest | Delvis, backup/restore-tester | **EJ KÖRT** |
| RG-08 | iPad stående/liggande, Safari, zoom/tangentbord och VoiceOver | Delvis, Chromium/a11y-tester | **EJ KÖRT** |
| RG-09 | **Publicerad** Pages, separat standalone och databevarande | Delvis, local Chromium + post-deploy Pages-prov | **EJ KÖRT** |
| RG-10 | Exakt versionsnummer, SHA/tagg/artifact och prövad återgång | Delvis, release-workflow och dokumentation | **EJ KÖRT** |

Använd detta som faktisk signeringsjournal, inte som checklista som automatiskt markeras klar:

| Test-ID | Resultat (PASS/FAIL/EJ KÖRT) | Miljö och datum | Syntetiskt facit/fil eller evidenslänk | Ansvarig | Avvikelse/ärende |
| --- | --- | --- | --- | --- | --- |
| RG-01 | EJ KÖRT |  |  |  |  |
| RG-02 | EJ KÖRT |  |  |  |  |
| RG-03 | EJ KÖRT |  |  |  |  |
| RG-04 | EJ KÖRT |  |  |  |  |
| RG-05 | EJ KÖRT |  |  |  |  |
| RG-06 | EJ KÖRT |  |  |  |  |
| RG-07 | EJ KÖRT |  |  |  |  |
| RG-08 | EJ KÖRT |  |  |  |  |
| RG-09 | EJ KÖRT |  |  |  |  |
| RG-10 | EJ KÖRT |  |  |  |  |

För analysvyernas detaljacceptans finns ytterligare protokoll i `docs/dev-126-analysis-acceptance.md`.

## Genomförandeordning och beslutsregel

1. **Hantera #256 och kvarvarande dataskyddsfrågor.** Besluta om nödvändig kodkorrigering respektive dokumenterad riskacceptans. Gör separata små PR:er med testskydd om beteendet måste ändras.
2. **Genomför RG-02–RG-08** i isolerad testprofil med syntetiska arbetsböcker och fullständig facitavstämning. Dokumentera avvikelser och återställningsövning; prov som inte körts är inte PASS.
3. **Frys slutlig releasekandidat**: commit-SHA, avsedd version, ansvarig och regressionsresultat på exakt SHA (RG-01). Inga källändringar efter frysning utan omtag.
4. **Förbered RG-09/RG-10** inklusive rollback-procedur. Publicering kräver ett separat formellt GO; efterpubliceringskontrollen kan inte slutföras i förväg. Om den misslyckas, behandla det som releaseincident.
5. **Dokumentera GO/NO-GO** med namngiven beslutsansvarig, datum, accepterade avvikelser, backupplats, testmiljö, källa och fungerande rollback-target.

**GO** först när alla obligatoriska kontrollrader är PASS, inga blockerande avvikelser återstår och utsedd beslutsansvarig har signerat. **NO-GO** om en kritisk kontroll är ej körd eller fallerar, data/återställning inte stämmer, eller kandidat-SHA är osäker.

### Nästa rekommenderade aktivitet

Efter KF-006:s **dokumentations-PR** är det inte rätt att starta ännu en ospecificerad refaktorering eller släppa en version. Nästa aktivitet är **manuell releaseacceptans enligt RG-protokollet och separat hantering av de faktiska blockerarna**, med en tydlig ägare för GO/NO-GO. Ett avgränsat korrigeringssteg får föreslås utifrån dokumenterad FAIL/evidens.

**Denna rapport gör ingen release, skapar ingen tagg, ändrar ingen versionssiffra och hävdar inte att manuella kontroller är genomförda.**
