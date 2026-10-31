# CHANGE-175 – Gemensam vy för importerade och egna fördelningar

Status (2026-10-31): **kärnflödet implementerat och CI-verifierat; CHANGE-175 ännu inte slutligt stängd**. Den ursprungliga målbilden och acceptanskriterierna nedan bevaras som kravhistorik. Se verifierings- och restpunktsmatrisen i slutet. Äldre avsnittet ”Kodbas och påverkan (granskat utgångsläge)” beskriver nuläget när planen skrevs, inte dagens kod.

## Syfte och omfattning
Fliken **Fördelningar** ska visa och hantera tre typer på samma sätt ur användarens perspektiv:
1. **Utveckling/Förvaltning** (inbyggd aktivitetssplit).
2. **IT-timmar/Verksamhetstimmar** (inbyggd uppdelning av importerade timmått).
3. **Egna fördelningstyper** (redan konfigurerbara dimensioner).

Återanvänd befintlig årsnavigering, fördelningskort, UO/LO-hierarki och presentationskomponenter. Ingen duplicering eller omskrivning av importerade originalvärden till optional-allocation-regler. Visa källa, låsstatus, komplettering och eventuellt ofördelat värde.

## Funktionella krav
- **FR-175-01 – Översikt:** Samtliga relevanta inbyggda och definierade fördelningstyper syns i Fördelningar. Både översikt och detaljer använder befintlig periodlogik; inga onödiga toppväljare återinförs.
- **FR-175-02 – IT/verksamhet:** IT- respektive verksamhetstimmar härleds från kanoniska ursprungsmått och är **alltid skrivskyddade** på UO- och LO-nivå. Presentationen får inte omvandla importerade observationer till redigerbara regler.
- **FR-175-03 – Aktivitetsursprung:** Importerade Utveckling/Förvaltning-värden är **skrivskyddade på exakt den nivå och period där de rapporterats**. LO utan importerad aktivitetsfördelning kan kompletteras eller ändras, förutsatt giltigt godkännande och balansering. En importerad aktivitetspost är inte noll om motsvarande post saknas.
- **FR-175-04 – Låst UO:** Om UO:s utvecklings- och förvaltningstotal är importerad, får användaren inte ändra dessa totaler. Ändring av utvecklingsandel för ett redigerbart LO ska omfördela återstående utvecklings-/förvaltningstimmar på övriga **redigerbara LO** inom samma UO, år och timmått. Varje LO:s totala timmar förblir oförändrade. UO:s utveckling + förvaltning och respektive importerat totalvärde förblir oförändrat (inom dokumenterad avrundningstolerans).
- **FR-175-05 – Låsta LO:** Om framtida import har både utveckling och förvaltning på ett LO, blir LO låst och deltar inte som justeringsmottagare. Dessa värden reserveras först från UO:s måltotaler. Resterande kapacitet kan endast fördelas på redigerbara LO. Om bara en aktivitet är importerad markeras underlaget som ofullständigt/konflikt för kontroll; inget tyst beräknat kompletteringsvärde får behandlas som importerad sanning.
- **FR-175-06 – Omfördelningshinder:** Vid otillräckligt utrymme, saknade underlag, ofullständig UO-matris, inkonsistenta totaler eller saknade andra redigerbara LO ska ändringen avvisas utan partiell persistens, med begripligt fel och berörda värden.
- **FR-175-07 – Saknad importerad UO-matris:** Där ingen fullständig importerad UO-aktivitetsfördelning finns får UO summeras från godkända LO-fördelningar, med synlig täckning/ofördelat. Ingen härledd UO-summa får märkas som importerad.
- **FR-175-08 – Återimport:** Vid ersatt/ändrad import ska manuella LO-godkännanden prövas om mot källa och fingeravtryck. Originalvärden ändras inte; inaktuella beslut får inte användas tyst i analyser. Vid nytillkomna importerade LO-aktivitetsvärden ska dessa vinna över tidigare härledd/manuell fördelning för samma scope/period/mått, utan att historiken raderas.
- **FR-175-09 – Proveniens:** Varje visad fördelning ska markeras **Importerad / Kompletterad / Härledd / Saknas** med möjlighet att spåra källa och aktuell godkännandestatus. Uppräkning av LO och UO Övergripande ska vara disjunkt så att timmar inte dubbelräknas.
- **FR-175-10 – Konsekvens:** Importflödet och Fördelningar ska använda samma domänkommando för LO-omfördelning och samma godkännandemodell; behåll importflödets redigering under övergången. Egna fördelningstyper behåller nuvarande separata arvs-/redigeringsregler.

## Beräkningskontrakt för låst UO
För varje (dataset, UO, år, mått) med godkänd importerad aktivitetsmatris:
- Sätt `D_UO`, `F_UO` från rapporterade UO-värden, och LO:s orubbliga total `T_i`.
- Separera `L` = LO med fullständigt importerad aktivitetssplit och `E` = redigerbara LO (inklusive UO Övergripande endast om den finns som relevant baspost).
- Kräv `sum(T_i) = D_UO + F_UO` med befintlig tolerans och att alla låsta LO:s aktivitetssummor motsvarar deras totaler.
- Reservera `D_L = sum(D_i, i in L)`, `F_L = sum(F_i, i in L)`; fördela `D_UO-D_L` och `F_UO-F_L` inom `E` efter fastställda användarändringar.
- Tillåt endast `0 ≤ D_i ≤ T_i`; `F_i = T_i-D_i`; förhindra omöjliga fördelningar. Övriga redigerbara LO balanseras proportionellt enligt importflödets befintliga kapacitetsbegränsade metod, med deterministisk avrundningsrest.
- Skilj **sammanlagd UO-aktivitet** från de två **separata timmåtten** IT och verksamhet: befintliga gemensamma LO-procentbeslut kan tillämpas på båda måtten, men varje måtts totalsummor, fingerprint och avstämningar prövas var för sig.

## Kodbas och påverkan (granskat utgångsläge)
- `src/domain/canonical.ts`: `authority`, `approval`, `granularity`, `workloadId` och källreferens identifierar original och härlett.
- `src/domain/canonicalImport.ts`: importerad UO-matris finns som `uo-activity-matrix`; LO-årstotaler som original.
- `src/domain/activityAllocation.ts`: godkännandebeslut/fingerprint och `previewActivityAllocation`; funktionen blockerar idag varje befintlig LO-aktivitet med `EXISTING_LO_ACTIVITY_DATA` och behöver senare kunna hantera partiellt importerade låsta LO.
- `src/import/formats/uoBudgetCompletion.ts`: `rebalanceUoBudgetAllocation` bevarar UO-total och LO-total; måste utökas med tydlig mängd låsta LO i stället för att förväxla låsta med vanliga manuella overrides.
- `src/import/BudgetCompletionAfterImport.tsx`: dagens importflöde använder `approveSharedActivityAllocation`/`applySharedPercentages` för gemensamma procentsatser. Detta tillåter LO-fördelning som ändrar den summerade UO-aktiviteten och måste harmoniseras med FR-175-04 innan redigeringen flyttas. Bevara befintliga beslut genom explicit migrerings-/kompatibilitetskontroll.
- `src/allocations/OptionalAllocationsView.tsx`: befintlig arbetsyta; nya inbyggda fördelningstyper bör erbjudas som read-model/adaptrar, inte bli nya optional rules.
- `src/gaps/store.ts`: befintliga regler och beslut för aktivitetsfördelning. Versions-/backupkontrakt måste testas.

## Acceptanskriterier för följande implementation
- **AC-175-01:** båda inbyggda typer och en egen typ visas i samma vy; periodval från respektive fördelningskort fungerar utan extra toppväljare.
- **AC-175-02:** IT/verksamhet saknar edit-/save-möjlighet på alla nivåer och visar korrekta importerade timmar.
- **AC-175-03:** en UO med 1 000 h (600 utveckling, 400 förvaltning), LO A 300 h, B 400 h, C 300 h: ändra A:s utveckling från 200 till 260 h → B och C justeras, summerad utveckling är fortsatt 600 h, förvaltning 400 h, varje LO-total oförändrad.
- **AC-175-04:** importerad låst LO B 240/160 h påverkas inte när redigerbar LO A justeras; återstående redigerbara LO absorberar ändringen om möjligt.
- **AC-175-05:** ingen möjlig balansering → fel och inga sparade partiella ändringar.
- **AC-175-06:** UO-matris utan importerad LO-aktivitet följer samma balanseringsresultat i importflöde och Fördelningar.
- **AC-175-07:** framtida partiell LO-import, ofullständig aktivitet, återimport och ändrade fingerprints ger korrekt låsning/omprövning, utan dubbelräkning.
- **AC-175-08:** ursprungs-/godkännandestatus och källhänvisningar är begripliga; backup och restore bevarar besluten; samma aktuella värden syns i Analys.

## Föreslagen implementation i små steg
1. **PLAN – detta dokument:** besluta funktionskontrakt och kända avvikelser; ingen kodändring.
2. **CHANGE – read-model:** adapter och läsbar översikt/detaljer för inbyggda fördelningar; enhetstester för mått, period och proveniens.
3. **CHANGE – beräkningsmotor:** stöd för låsta LO och kapacitetsbegränsad omfördelning; test av invariant och omöjliga fall.
4. **CHANGE – gemensam redigering:** låt importflöde och Fördelningar använda samma balansering/godkännande; migrerings-/återimportstester.
5. **CHANGE – regression:** Playwright mobil, offline, backup, återimport och korrekta analyser; kontroll av dokumentation mot faktisk implementation.

## Utanför detta steg
Inga kodförändringar, inget införande av ny Excelimportprofil för LO-aktiviteter och ingen ändring av de användardefinierade fördelningarnas beräkningsmodell.


## Genomförande och verifiering – avstämning 2026-10-31

**Slutsats:** Beräknings- och importkedjan är implementerad, men alla ursprungliga acceptanspunkter har **inte** verifierats. CHANGE-175 kan därför inte formellt märkas helt stängd enbart genom gröna kodtester.

| Område | Evidens | Bedömning |
|---|---|---|
| Samlad Fördelningar-vy och importflöde | PR #192–200, webbregression DEV-182 | Implementerat/testat för verifierade scenarier |
| Importerade UO-matriser, låsning och balansering | PR #201–202; domäntester DEV-184/186 | Testat |
| Återimport och ogiltigförklaring | PR #203 (DEV-185), #207 (DEV-189) | Webbläsartestat |
| LO-aktivitetspar i Excel och spårbar kanonisk import | PR #205–206; test #208 | Testat |
| Äldre godkännanden med sharedPercentages | PR #209 (DEV-191) | Regressionstestat; historisk semantik bevaras |
| Huvudgren efter PR #207 | GitHub Actions run 41239993138 | PASS |
| PR #208 | GitHub Actions run 41240354773 | PASS |
| PR #209 | GitHub Actions run 41240940786 | PASS |
| Mobilanpassad Fördelningar-vy | Inget särskilt CHANGE-175 mobilacceptansbevis sammanställt | **NOT VERIFIED** |
| Offlineflöde för godkännande/analys | Inget särskilt offlineacceptansbevis sammanställt | **NOT VERIFIED** |
| Backup/restore av fördelningsbeslut | Ingen särskild CHANGE-175 återläsningskontroll sammanställd | **NOT VERIFIED** |
| Fullständig proveniensvisning i alla nivåer samt saknad UO-matris | Ingen fullständig acceptansmatris kontrollerad | **NOT VERIFIED** |

### Kända avgränsningar
- Excel-tillägget är ett **frivilligt blad** `LO Aktiviteter 2027-2030`; äldre budgetfiler utan bladet stöds fortfarande.
- LO-import kräver två fullständiga icke-negativa aktivitetsvärden per LO/år/timmått. Ofullständiga och inkonsistenta par stoppas i stället för att gissas.
- Äldre beslut med `sharedPercentages: true` använder sin historiska beräkningssemantik; nya balanserade beslut får inte tyst skriva om dem.
- Grön CI verifierar testade kontrakt; den ersätter inte manuell acceptans av alla UI-, offline- och återställningsfall.

### Återstående steg före formell stängning
1. Verifiera AC-175-01/02/08 med avseende på faktisk vy, källstatus och backup/restore.
2. Kör avgränsat Playwright- eller manuellt acceptanstest för mobil och offline enligt planens sista steg.
3. Dokumentera PASS/FAIL/NOT VERIFIED per återstående AC och stäng CHANGE-175 först när verifieringarna finns, eller när eventuella undantag uttryckligen accepterats.

Referenser: [PR #207](https://github.com/erland/pwa-utvecklingsanalys/pull/207), [PR #208](https://github.com/erland/pwa-utvecklingsanalys/pull/208), [PR #209](https://github.com/erland/pwa-utvecklingsanalys/pull/209).
