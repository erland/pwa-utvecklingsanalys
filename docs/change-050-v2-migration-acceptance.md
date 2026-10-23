# CHANGE-050 – migreringsacceptans och beslutspunkt för analys v2

Status: **PARTIAL tills CI och verksamhetsacceptans är verifierade**. Äldre analysvy ska vara kvar.

## Verifierade implementationsspår (PR #51–#60)

| Område | Testunderlag | Bedömning |
|---|---|---|
| Grundimport, grupper, mått, filter, trender, diagram och CSV | CHANGE-040, -041 | Automatiska kontroller finns |
| Godkännande, återkallelse och omprövning efter källbyte | CHANGE-042, -043 | E2E-kontroller finns |
| Mobil porträttlayout | CHANGE-044 | Avgränsat viewport-test finns, inte samtliga enheter |
| Projektbackup med v2-godkännanden i ny profil | CHANGE-045 | E2E-kontroll finns |
| Gammal/v2: jämförbara totaler per år | CHANGE-046 | Begränsad numerisk paritet verifieras automatiskt |
| Bidragande källposter och kompletteringsnavigering | CHANGE-047, -048 | Funktioner och tester finns |
| Organisation × år-matris | CHANGE-049 | Domäntest finns |
| Samlad UI-acceptans av migreringsfunktioner | CHANGE-050 | Nytt Playwright-test: import → gruppmodell → tabell → källa/period → kompletteringar |

## Kvarvarande beslutsvillkor

1. **Grön CI för CHANGE-050** och samtliga relevanta tidigare tester.
2. **Verksamhetsacceptans av representativa, verkliga Excelunderlag**, även flera UO, LO, avdelningar, stora volymer, kostnader och olika periodnivåer.
3. **Redovisningssemantik**: Den äldre vyns separata, ej godkända UO-matris får inte likställas med v2:s källsäkra fördelade aktivitetsvärden. Dokumentera skillnaden före avveckling.
4. **Källantal** betyder bidragande värdeposter i v2, inte unika filer; jämför endast lika definitioner.
5. **Tillgänglighet och mobilitet**: komplettera automatiska tester med manuell tangentbordsgranskning och representativa mobila skärmstorlekar.
6. **Återställningsövning** med verklig projektbackup och en kontrollerad återgångsväg måste godkännas av ansvarig.
7. **Migreringsplan för användare**: ta ställning till sparade urval, länkar, utbildningsbehov och när den gamla vyn kan tas bort.

## Rekommendation

Ingen avveckling i denna PR. När kriterierna ovan är uppfyllda kan ett separat ADR och en separat utrullnings-/borttagnings-PR tas fram. Automatiska tester ger tekniskt underlag men ersätter inte verksamhetens godkännande.
