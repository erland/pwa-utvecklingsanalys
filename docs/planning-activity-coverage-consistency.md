# Analysavstämning: aktivitet, delposter och täckning

## Bakgrund
Analysen ger UO och projekt två oberoende budgetperspektiv. Avdelningsbehov är en alternativ fördelning av timmarna och läggs inte till budgettotalen. Aktiviteten **Totalt** omfattar importerade värden oavsett fördelningsgrad, medan **Utveckling** och **Förvaltning** bara omfattar faktiskt beräkningsbara aktivitetsposter.

## Avvikelse och korrigering
- I den gemensamma planeringsanalysen hämtades UO:s LO-detalj direkt från en aktivitetsfiltrerad fråga, så ett LO utan fullständig aktivitetsfördelning kunde försvinna ur detaljtabellen. Den särskilda UO-navigeringen hade redan åtgärdats. Båda vyerna använder nu **samma detaljprojektion**, som behåller LO och UO Övergripande, visar `Ej fördelat` och anger ofördelad volym utan att utge den för noll.
- Varningen om ofullständig aktivitetsfördelning summerade tidigare alltid både UO:s och projektens saknade delposter, även i läget **endast UO** eller **endast Projekt**. Nu beräknas antalet utifrån vald planeringstyp och motsvarande år och mått.

## Oförändrade regler
- Total UO + Projekt är additiv. Aktivitetssummor hämtas fortfarande från den kanoniska analysen; visningslogiken skapar inga nya belopp.
- Verkligt nollvärde med fullständig fördelning är inte samma sak som okänd aktivitet.
- Val av Alla/UO/Projekt, Timmar/Kronor och år styr tabell och täckningsvarning tillsammans.
- Diagram och trendkurvor med flera år kan vara flerårsöversikter även när enstaka budgetår är valt; de är inte adderade till valt års totalsumma.

## Regressionstester
`PlanningScopeAnalysis.test.ts` täcker vald planeringstyp, flera år, kostnader, okänd LO-aktivitet och bibehållna totalsummor. Full Verify PWA krävs före merge.
