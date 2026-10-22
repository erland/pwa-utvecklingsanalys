# CHANGE-015 – Flersektionsimport och fördelning av utveckling/förvaltning

## Kontrakt och gränser
UO-budgetimport kan nu läsa **två separata sektioner** ur samma Excelblad. Den första sektionen behåller tidigare detaljmodell och analys. En andra årsbaserad **matrissektion** får ett särskilt kontrakt med blad, rubrikrad, data- och kolumnintervall, rubrikalias, måttidentifierare, måttenhet och faktor. Basprofilen känner igen de i exemplet förekommande IT-/verksamhetstimmarna i tusental och omkostnader i miljoner kronor, men parsningen styrs av ett oberoende `MatrixMapping` och kan användas på andra blad/intervall.

Matrisens `Utv.` och `Förv.` blir dimensionen `activity` (development/maintenance) och år avläses från kolumnrubriken. `Tot`-kolumner är kontroll-/summafält och importeras inte. Formler beräknas inte; eventuella andra okända ifyllda celler rapporteras med celladress.

## Godkännande och analys
Sektionsgranskningen visar varje läst värde, normaliserad enhet, aktivitet, år och celladress. Användaren väljer uttryckligen att inkludera den extra sektionen. De ursprungliga detaljerna importeras som `kind=detail`; matrisens data lagras som `kind=subset`, `sectionId` och `activity`. Huvudanalysens summering ignorerar `subset` även vid Alla timmar/Alla kostnader; fördelningen visas i en separat tabell och omfattas av år-/källurval.

Endast observationer med det valda käll-ID:t ersätts eller tas bort; projektets befintliga import- och backupkontrakt bevaras genom valfria extra fält. Versionssättningen av grundschemat ändras inte.

## Avgränsning
För denna ändring kan man redigera matrissektionens numeriska rad-/kolumnintervall i importvyn. Det underliggande typade mappingkontraktet stöder alternativa rubrikalias och enhetsfaktorer, men en fullständig interaktiv editor för dessa uppslag ingår ännu inte. Stödet är därför en första generell matrisprofil, inte automatisk upptäckt av godtyckliga kalkylblad.

## Verifiering
Enhetstester kontrollerar omräkning, aktivitet, konfigurerade positioner, total-kolumner och att matriskällor inte ingår i detaljsummor. Chromium-E2E testar granskning, godkännande, separat analys och bibehållen huvudtotal. Projektets fulla GitHub Actions krävs före merge.
