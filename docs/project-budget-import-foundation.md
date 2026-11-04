# Projektbudget – importgrund (PR #290)

## Beslutad målbild
Tvärgående projekt är en **separat, additiv planeringstyp** vid sidan av UO. En projektdel är inte ett LO och projekt kräver ingen koppling till UO. Behov uttryckta i samma mått och samma år får summeras mellan UO och projekt. Alternativa sammanställningsrader och aktivitetsmatriser får däremot inte dubbelräknas.

## Implementerad första etapp
- Separata identiteter: `project:<projektnamn>` och `project-part:<projektnamn>:<delnamn>`.
- Kanonisk analysaxel `project`, vid sidan av `work` (UO/LO) och `department`.
- Importprofil för samma årsbudgetlayout som UO (`UO Tot 2027-30`), **markerad med `Projekt: namn` i cell B1**. Delrubriker i kolumn B behöver inte börja på LO eller UO.
- Antalet timmar/kronor per år och projektdel hämtas från detaljer med de vanliga erkända resursrubrikerna. 2027:s månadsuppgifter aggregeras; formler/summeringar räknas inte som nya detaljbehov.
- Direktimport/ersättning använder befintlig återställningsjournal och sparar projekt skilt från UO.
- Regressionstest med UO + projekt, även vid lika överordnat namn, verifierar att timmar kan summeras och att projektdelarna har egna identiteter.

## Begränsningar för fortsatt arbete
1. Andra projektfiler där B1 inte uttryckligen börjar med `Projekt:` känns ännu inte igen. Utöka identifieringen mot ett verifierat exempel, inte genom att acceptera alla fria rubriker i UO-formatet.
2. Analysernas interaktiva urval `Alla / UO / Projekt`, visualisering per projekt/projektdel och gemensam avdelningsvy kräver en separat efterföljande leverans.
3. Projektens aktivitetsmatris (Utveckling/Förvaltning) och avdelningsfördelning ingår ännu inte i importetappen. Källdata ska bevaras/implementeras med egen proveniens innan de exponeras i analysen.
4. Nya källor registreras som Excel i datasetlistan; separat typmärkning i denna lista kan införas i ett senare UX-steg.

CI Verify PWA och mänsklig acceptans behöver vara godkända innan release.
