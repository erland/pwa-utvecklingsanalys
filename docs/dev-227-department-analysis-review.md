# DEV-227 – Slutgranskning av avdelningsanalysen

Datum: 2026-11-02  
Omfattning: DEV-218–226, inklusive importerade UO-filers blad `Timmar per avdelning`.

## Bedömning

**Grundflödet är implementerat och verifierat av CI, men inte fullständigt verifierat med alla verkliga Excel-varianter.** Användning för test och uppföljning är möjlig; märk inte funktionen som fullständigt produktionsverifierad enbart på grund av gröna syntetiska tester.

## Granskat mot koden

| Del | Implementation | Verifiering/bedömning |
| --- | --- | --- |
| Excelimport av avdelningstimmar | `src/import/departmentDemand.ts` | Stöd för `Timmar 2027`–`2029`, radbaserad tolkning och ej summering av formelceller. Enhetstest och E2E med syntetiska filer. |
| Egen lagring och källkoppling | `src/domain/semantic.ts`, importadapter och källhantering | Separat från kanonisk budget; täcks av persistens- och importtester. |
| Avstämning med UO-budget | `src/domain/departmentReconciliation.ts` | Avvikelser visas som information och ändrar inte budgeten. |
| Analys per avdelning och UO | `src/domain/departmentDemandAnalysis.ts` | År, timtyper och organisationsurval; enhetstest och browser-E2E. |
| UO-grupper | `src/analytics/groupModels.ts` | Första gruppen gäller vid överlapp. Testas i domäntest – **inte** i godkänd browser-E2E med gruppkonfiguration. |
| Klickbar fördjupning | `src/domain/departmentDemandDrilldown.ts` och UI | Testad åt båda håll i en-UO-test och med UO-avgränsning i flerkällstest. |
| Flera importerade UO | `e2e/dev-226-department-multisource-groups.spec.ts` | Grönt test med två syntetiska UO-källor; avdelnings- och budgettotaler hålls isär. |

## Kända begränsningar och kvarvarande risker

1. **Grupp-E2E saknas.** Flerkällstestet DEV-226 testar flera UO och enskild UO, inte växling mellan överlappande grupper via användargränssnittet. Gruppregeln har separat enhetstest.
2. **Exempelbaserad, positionsbunden import.** Avdelningsparsern använder årsrubrik på rad 4, avdelningsnamn i kolumn B och särskilda rader 6–15 och 18. Andra Excel-mallar eller ändrad radlayout kräver egna provfall före stödförklaring.
3. **Skilda källsummor är avsiktliga.** Avdelningstimmar är alternativ fördelning av efterfrågan. De får aldrig adderas till budgettimmar. Differens i avstämning är inte automatiskt ett importfel.
4. **Årsval i huvudanalysen utgår från kanoniska budgetposter.** Om endast ett år finns i avdelningsbladet men inte i budgetmodellen kan det året saknas bland de generella årsvalen; bör följas upp om verksamheten behöver sådan analys.
5. **Verifierade filer är syntetiska.** Faktiska användarfiler kan innehålla andra formel-, cell- och rubrikvarianter. De är inte styrkta av nuvarande automatiska testsvit.

## Avslutskriterier

- Import, separat persistens, icke-blockerande avstämning, två perspektiv, UO-urval och fördjupning: **implementerat**.
- Enhets- och browser-regression för standardflödet: **godkända i PR #245**.
- Browser-E2E för överlappande UO-grupper: **ej genomfört**.
- Validering mot samtliga verkliga Excel-exempel: **ej styrkt**.

**Rekommendation:** Avsluta denna implementeringsetapp som `funktionellt klar med dokumenterade verifieringsbegränsningar`. Skapa separat, prioriterad uppföljning endast om verkliga filer ger avvikelser, årsval behöver breddas eller E2E-täckning för gruppkonfiguration krävs före produktionssättning. Detta dokument ändrar inte produktionskod eller beräkningsregler.
