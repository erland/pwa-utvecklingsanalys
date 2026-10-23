# CHANGE-046 – funktionsparitet inför övergång till informationsmodell v2

Granskning av `AnalyticsView.tsx` och `CanonicalAnalytics.tsx` efter CHANGE-045 (23 oktober 2026).

| Funktion | Äldre analys | V2 | Lägesbedömning |
|---|---|---|---|
| Mått och enheter | Enskilt eller sammansatt mått | Flerurval inom samma enhet | Implementerat; skillnader i urvals-UX |
| Årsfilter | Ja | Ja | Implementerat; CHANGE-046 jämför samma import |
| Datakällor och UO | Flerurval | Flerurval | Implementerat |
| LO-urval | Via objekt och gruppering | Explicit LO-filter | Implementerat, annan semantik |
| Utveckling/förvaltning | Separat källmatris i analysvyn | Endast godkända härledningar, täckningsmarkering | **Avsiktlig semantisk skillnad** – ersätt inte värden rakt av |
| Avdelningsredovisning | Inte en separat axel | Separat axel utan dubbelräkning | Implementerat |
| Årstrender och staplar | Grupperat per grupp och år samt trend | Årsserier per mått, trendlinjer, årsjämförelse | **Delvis paritet** – v2 saknar grupp × år-matris |
| Tabell/stapel/cirkel | Ja | Ja | Implementerat |
| UO-gruppmodeller | Ja | Ja | Implementerat |
| Gruppering på datakälla/år | Ja | Ja | Implementerat |
| Grupp på LO / källaobjekt | Kan välja `entity` | Organisation redovisar UO/LO | **Kontrollera radgranularitet för jämförbara urval** |
| CSV-export | Saknas | Ja | V2 bättre |
| Antal källposter per resultat | Ja | Nej | **Funktionslucka** – v2-tabell visar bara värde |
| Undantagna poster | Antal undantag | Alternativa UO-matriser och täckningsstatus | Delvis paritet, olika definitioner |
| Informationskompletteringar | `CompletionAnalysis` direkt vid analys | Hanteras i separat kompletteringsvy | **Navigationslucka** – saknar direktkoppling från v2-resultat |

## Automatiserade grindar

- CHANGE-040: import, grupper, år, diagram, CSV
- CHANGE-041: käll-, UO- och LO-filter, aktivitetsbeslut, avdelningsaxel
- CHANGE-042: godkännande och återkallelse genom UI
- CHANGE-043: källersättning och inaktuella godkännanden
- CHANGE-044: mobil porträttlayout
- CHANGE-045: backup/återställning av v2 och aktivitetsbeslut
- CHANGE-046: **ny jämförande Playwright-kontroll** för totalsummor 60/42/18 h från samma XLSX i båda vyerna

## Rekommendation och avvecklingsbeslut

**Avveckla inte den äldre analysvyn ännu.** Prioritera (1) källpostantal och diagnostik i v2-tabell, (2) sammanhållen navigering till kompletteringar och (3) grupp × år-analys där användarbehovet finns. Kontrollera därefter motsvarande urval på större representativa importunderlag.

En grön CHANGE-046-körning bevisar bara paritet för det avgränsade importscenariot, inte för alla mått, periodnivåer och kompletteringar. Den äldre och nya vyn har avsiktligt olika hantering av godkända aktivitetsfördelningar, vilket inte ska testas som numerisk likhet utan att redovisningssemantiken uttryckligen matchar.
