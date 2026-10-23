# ADR-001 – stegvis övergång till kanonisk analys v2

**Status:** Föreslaget beslut (inte godkänt)  
**Datum för underlag:** 2026-10-23  
**Beslutsägare:** Ej fastställd

## Kontext och krav

Projektet har i dag två analysvyer: äldre semantisk analys och kanonisk informationsmodell v2. CHANGE-040–050 har tillfört beräkningsregler, godkännandeflöden, UO-grupper, organisation × år, exporter, mobilkontroll och backup/återställning. Den sammanställda migreringsacceptansen finns i `docs/change-050-v2-migration-acceptance.md`.

Arkitekturdrivande krav: ingen tyst dubbelräkning, inga ej godkända härledningar, spårbara värden, skydd mot att gamla godkännanden gäller efter källbyte samt säker lokal lagring/återställning. Projektet lagrar data lokalt i webbläsaren (IndexedDB).

## Beslutsförslag

1. **V2 blir målmodell för fortsatt utveckling.** Ny analysfunktionalitet utvecklas i första hand i v2, inte parallellt i båda motorerna.
2. **Behåll båda vyerna under kontrollerad övergång.** Avveckla inte den äldre vyn i denna ändring.
3. **Godkänn avveckling separat** först efter fullständig teknisk och verksamhetsmässig acceptans med representativa underlag och dokumenterad återgångsväg.
4. **Bevara äldre datatolkning för jämförelse under migreringen**, men märk tydligt att separata UO-aktivitetsmatriser i äldre vy inte har samma godkännandesemantik som v2.
5. **Bakåtkompatibilitet för projektbackup** och återställningsbarhet ska verifieras före avveckling. Lokal källdata får inte raderas automatiskt när en vy tas bort.

## Övervägda alternativ

| Alternativ | Fördelar | Risker/nackdelar | Ställningstagande |
|---|---|---|---|
| Ta bort äldre vy direkt | Minst UI och kod | Oupptäckta funktionella skillnader, svår rollback | Avstyrks |
| Behåll båda permanent | Enkel återgång | Dubbla modeller och underhåll, motstridiga siffror | Avstyrks som slutläge |
| Stegvis övergång och separat borttagningsbeslut | Verifierbar jämförelse, reversibel utrullning | Temporär komplexitet och acceptansarbete | **Rekommenderas** |

## Konsekvenser och risker

- **Datakonsistens:** Skillnader i aktivitetstäckning, periodgranularitet och underlagsantal ska dokumenteras, inte döljas som felaktig likvärdighet.
- **Säkerhet/integritet:** Varken lokal backup eller testexport får oavsiktligt publicera verkliga källdata. Använd syntetiska underlag i CI.
- **Drift/kostnad:** Under övergången underhålls två läsvyer, men ingen extra serverinfrastruktur krävs.
- **Återställbarhet:** Kontrollera att senaste backup kan återställas i separat webbläsarprofil och att eventuell återgångsrelease kan köras mot det dataformat som sparats.
- **Tillgänglighet:** Bekräfta mobil, tangentbord, skärmläsning och långa tabeller med verkliga användningsfall.

## Acceptanskriterier för ett senare avvecklingsbeslut

- CI för alla CHANGE-040–050-scenarier grön på beslutscommit.
- Representativa verkliga Excelark: flera UO och LO, avdelningar, års/månadsdata, utveckling/förvaltning, kostnader samt större datauppsättningar.
- Avvikelser mellan äldre/v2 klassificerade: faktisk defekt, avsiktligt semantiskt byte eller funktionslucka; kvarvarande blockerare åtgärdade.
- Godkännande och återkallelse fungerar vid källbyte och efter backup/återställning.
- Dokumenterad manuell användaracceptans och beslutsägare utsedd.
- Exporterad backup, återställningsövning och rollback till föregående version verifierad.
- Tydlig kommunikation till användare om nya filter, aktivitetsgodkännanden och eventuella ändrade resultat.

## Omprövning

Om v2 ger oacceptabla avvikelser, om backup inte kan återställas eller om verksamheten inte accepterar arbetsflödet ska avveckling skjutas upp. Återgå då till parallell drift tills rotorsaken är åtgärdad.
