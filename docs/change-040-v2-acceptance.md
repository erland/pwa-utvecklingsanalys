# CHANGE-040 – acceptanskriterier och migreringsbeslut

## Syfte
Verifiera informationsmodell v2 med en faktisk Excelimport i webbläsare, utan simulerade lagrings- eller UI-anrop.

## Automatiserat test
`e2e/change-040-v2-acceptance.spec.ts` genomför:
1. Import och godkännande av en tvåårig XLSX-fil med IT-timmar.
2. Konfiguration och sparande av UO-gruppmodell.
3. Verifiering av total, gruppering per UO-modell samt årsgruppering.
4. Växling till trendlinje och cirkeldiagram.
5. Nedladdning och innehållskontroll av riktig CSV-export.
6. Årsfilter, ofullständig aktivitetsfördelning och byte av måttenhet.

## Ej täckt i detta första integrerade test
- Fullständig regelfördelning utveckling/förvaltning och återkallade/stale godkännanden.
- Alla kombinationer av UO/LO-filter och avdelningsaxeln i samma UI-scenario.
- Layout på mobil och tangentbordsnavigering.
- Import av samtliga produktionsmallar och återställning av användardata.

Dessa kontroller krävs innan den äldre analysvyn avvecklas. Behåll båda vyerna tills dess. En grön CI-körning betyder att det automatiserade scenariot passerat, inte att all funktionsparitet är bevisad.
