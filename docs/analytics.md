# DEV-005 – analys av importerade observationer

Analysmotorn i `src/analytics/query.ts` arbetar med den semantiska modellen från DEV-004 och visas i `src/analytics/AnalyticsView.tsx`.

## Tillgängliga val
- Summerbart mått: IT-timmar, verksamhetstimmar eller kostnadsmått. Enheten syns uttryckligt och olika enheter blandas inte.
- År: enskilt år eller samtliga år. Samtliga år ger summan av periodernas detaljvärden; detta är inte en jämförelse av år.
- Urval: en eller flera godkända datakällor och UO.
- Gruppering: UO, enskilt objekt/LO, år och källfil.
- Resultat: pivottabell, total, antal underliggande detaljvärden och ett enkelt stapeldiagram.

## Säkerhetsregler för summering
- Endast observationer av typen `detail` summeras. Subtotaler och delmängder exkluderas.
- Identisk källa (dataset-ID, blad, cell och mått) räknas en gång inom samma fråga.
- Källor från olika dataset-ID räknas som **separata**. De får inte automatiskt identifieras som samma verkliga budget, eftersom detta kräver en avstämningsregel.
- UO bestäms genom objektens föräldrahierarki; cykler orsakar ett fel i stället för felaktiga siffror.
- Icke-additiva mått (personalantal, FTE, kvoter) avvisas av den nuvarande summeringsfrågan. Tidsspecifik snapshot- och kvotanalys kräver egna regler.
- Tomt urval visas tydligt; inga demodata presenteras som importerade data.

## Kända begränsningar
Diagrammet är en enkel horisontell stapelvisualisering, inte en fullständig drag-and-drop-pivot. Sparade analysvyer, generiska dimensioner, scenarioväljare och avancerad grupperingsmodell fördelas över senare steg. Gruppering per objekt utgår från befintlig hierarki. Vid flera importfiler med överlappande innehåll kan summan fortfarande behöva avstämmas av användaren innan den används som beslutsunderlag. Negativa värden visas korrekt i tabellen men stapeldiagrammet är endast avsett för icke-negativa totaler.
