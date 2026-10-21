# DEV-007 – tidsbundna relationer och täckningsanalys

## Kontrakt och arbetsflöde

I relationvyn går det att skapa kopplingar med explicit från- och tillobjekt, relationsslag och giltighetsintervall. Relationerna sparas i det semantiska IndexedDB-lagret. Tillåtna samband:
- UO → LO, UO → UO-övergripande, organisation → avdelning/UO (`contains`).
- Avdelning → process (`performs`).
- UO/LO → process (`supports`/`enables`).

Datum lagras som ISO-datum med inkluderande intervallgränser. Saknade objekt, självreferenser, ogiltiga datum och ogiltiga typkombinationer avvisas.

Täckningsanalysen visar för ett valt kalenderår vilka unika processer som stöds, vilka UO som står bakom relationerna och vilka avdelningar som har `performs`-kopplingar till dessa processer. Antal processer beräknas som mängden **unika process-ID** och alltså inte antal vägar i relationsgrafen. Timmar för processerna räknas bara en gång per källcell, oavsett hur många UO/LO/avdelningar som kopplas till en process. Ett bidrag från en process får därmed inte multipliceras upp när fler stödrelationer registreras.

## Begränsningar

Årsurvalet bedömer vilka relationer som gäller på **31 december valt år**. Det ger en årsslutsbild, inte en automatisk tidsviktad årsanalys. Förändringar mitt i ett år kräver separat intervalldelning vid mer finmaskiga rapporter. Användaren registrerar relationerna manuellt: tvetydig automatisk identitetskoppling görs inte. Relationsskapandet omfattar inte versionshantering och godkännandeflöde för relationer; dessa hör till senare steg.
